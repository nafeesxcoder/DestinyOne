-- Marketplace booking operations: server-owned inventory, quotes, orders, events and reconciliation.
create table if not exists public.marketplace_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'lead' check (status in ('lead','review','active','paused','removed')),
  support_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_venues (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.marketplace_partners(id),
  name text not null,
  city text not null,
  country_code text not null check (country_code in ('US','CA')),
  public_place_verified boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_offerings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.marketplace_venues(id),
  title text not null,
  description text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency in ('usd','cad')),
  cancellation_hours integer not null default 24 check (cancellation_hours between 0 and 720),
  late_refund_percent integer not null default 50 check (late_refund_percent between 0 and 100),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_availability_slots (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.marketplace_offerings(id),
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  remaining_capacity integer not null check (remaining_capacity >= 0 and remaining_capacity <= capacity),
  provider_synced_at timestamptz not null,
  provider_reference text,
  unique (offering_id, starts_at)
);

create table if not exists public.marketplace_reservation_quotes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  offering_id uuid not null references public.marketplace_offerings(id),
  slot_id uuid not null references public.marketplace_availability_slots(id),
  party_size integer not null default 2 check (party_size between 1 and 12),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency in ('usd','cad')),
  expires_at timestamptz not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (member_id, idempotency_key)
);

create table if not exists public.marketplace_reservation_orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.marketplace_reservation_quotes(id),
  match_id uuid not null references public.matches(id),
  purchaser_id uuid not null references auth.users(id),
  accepted_by uuid[] not null default '{}',
  status text not null default 'awaiting_match_acceptance' check (status in ('awaiting_match_acceptance','awaiting_payment','payment_authorized','provider_confirming','confirmed','cancellation_requested','cancelled','partially_refunded','refunded','failed','support_required')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency in ('usd','cad')),
  payment_intent_id text unique,
  provider_confirmation text,
  cancellation_cutoff_at timestamptz not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchaser_id, idempotency_key)
);

create table if not exists public.marketplace_reservation_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.marketplace_reservation_orders(id),
  event_type text not null,
  actor_id uuid references auth.users(id),
  provider_event_id text,
  safe_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique nulls not distinct (order_id, provider_event_id)
);

create table if not exists public.marketplace_provider_webhook_receipts (
  provider text not null,
  provider_event_id text not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, provider_event_id)
);

alter table public.marketplace_partners enable row level security;
alter table public.marketplace_venues enable row level security;
alter table public.marketplace_offerings enable row level security;
alter table public.marketplace_availability_slots enable row level security;
alter table public.marketplace_reservation_quotes enable row level security;
alter table public.marketplace_reservation_orders enable row level security;
alter table public.marketplace_reservation_events enable row level security;
alter table public.marketplace_provider_webhook_receipts enable row level security;

create policy "members view own marketplace quotes" on public.marketplace_reservation_quotes for select to authenticated using ((select auth.uid()) = member_id);
create policy "match participants view reservation orders" on public.marketplace_reservation_orders for select to authenticated using (public.is_active_match_participant(match_id::text, (select auth.uid())));
create policy "match participants view reservation events" on public.marketplace_reservation_events for select to authenticated using (exists (select 1 from public.marketplace_reservation_orders o where o.id = order_id and public.is_active_match_participant(o.match_id::text, (select auth.uid()))));

create or replace function public.create_marketplace_quote(p_offering_id uuid, p_slot_id uuid, p_party_size integer, p_idempotency_key text)
returns public.marketplace_reservation_quotes language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); result public.marketplace_reservation_quotes; offering public.marketplace_offerings; slot public.marketplace_availability_slots;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;
  select * into offering from public.marketplace_offerings where id=p_offering_id and active;
  select * into slot from public.marketplace_availability_slots where id=p_slot_id and offering_id=p_offering_id for update;
  if offering.id is null or slot.id is null or slot.starts_at <= now() or slot.provider_synced_at < now()-interval '15 minutes' or slot.remaining_capacity < p_party_size then raise exception 'fresh availability unavailable'; end if;
  insert into public.marketplace_reservation_quotes(member_id,offering_id,slot_id,party_size,amount_cents,currency,expires_at,idempotency_key)
  values(viewer,offering.id,slot.id,p_party_size,offering.amount_cents,offering.currency,least(now()+interval '12 minutes',slot.starts_at),p_idempotency_key)
  on conflict(member_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into result;
  return result;
end $$;

create or replace function public.create_marketplace_reservation_order(p_quote_id uuid, p_match_id uuid, p_idempotency_key text)
returns public.marketplace_reservation_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); q public.marketplace_reservation_quotes; result public.marketplace_reservation_orders; cutoff_hours integer;
begin
  if viewer is null or not public.is_active_match_participant(p_match_id::text, viewer) then raise exception 'active match required'; end if;
  select * into q from public.marketplace_reservation_quotes where id=p_quote_id and member_id=viewer and expires_at>now();
  if q.id is null then raise exception 'fresh owned quote required'; end if;
  select o.cancellation_hours into cutoff_hours from public.marketplace_offerings o where o.id=q.offering_id;
  insert into public.marketplace_reservation_orders(quote_id,match_id,purchaser_id,accepted_by,amount_cents,currency,cancellation_cutoff_at,idempotency_key)
  values(q.id,p_match_id,viewer,array[viewer],q.amount_cents,q.currency,(select s.starts_at from public.marketplace_availability_slots s where s.id=q.slot_id)-make_interval(hours=>cutoff_hours),p_idempotency_key)
  on conflict(purchaser_id,idempotency_key) do update set updated_at=now() returning * into result;
  return result;
end $$;

create or replace function public.respond_marketplace_reservation_order(p_order_id uuid, p_accept boolean, p_idempotency_key text)
returns public.marketplace_reservation_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); result public.marketplace_reservation_orders;
begin
  select * into result from public.marketplace_reservation_orders where id=p_order_id for update;
  if result.id is null or not public.is_active_match_participant(result.match_id::text,viewer) then raise exception 'order unavailable'; end if;
  if result.status <> 'awaiting_match_acceptance' then return result; end if;
  if p_accept then
    update public.marketplace_reservation_orders set accepted_by=array(select distinct unnest(accepted_by||viewer)), status=case when cardinality(array(select distinct unnest(accepted_by||viewer)))=2 then 'awaiting_payment' else status end,updated_at=now() where id=p_order_id returning * into result;
  else update public.marketplace_reservation_orders set status='cancelled',updated_at=now() where id=p_order_id returning * into result;
  end if;
  insert into public.marketplace_reservation_events(order_id,event_type,actor_id,provider_event_id) values(p_order_id,case when p_accept then 'member_accepted' else 'member_declined' end,viewer,p_idempotency_key) on conflict do nothing;
  return result;
end $$;

create or replace function public.prepare_marketplace_payment(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); o public.marketplace_reservation_orders; q public.marketplace_reservation_quotes; s public.marketplace_availability_slots;
begin
  select * into o from public.marketplace_reservation_orders where id=p_order_id for update;
  select * into q from public.marketplace_reservation_quotes where id=o.quote_id;
  select * into s from public.marketplace_availability_slots where id=q.slot_id;
  if o.purchaser_id<>viewer or o.status<>'awaiting_payment' or cardinality(o.accepted_by)<>2 or q.expires_at<=now() or s.provider_synced_at<now()-interval '15 minutes' then raise exception 'order not ready for payment'; end if;
  return jsonb_build_object('orderId',o.id,'amountCents',o.amount_cents,'currency',o.currency);
end $$;

create or replace function public.cancel_marketplace_reservation_order(p_order_id uuid, p_reason text, p_idempotency_key text)
returns public.marketplace_reservation_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); result public.marketplace_reservation_orders;
begin
  update public.marketplace_reservation_orders set status=case when status in ('awaiting_match_acceptance','awaiting_payment') then 'cancelled' else 'cancellation_requested' end,updated_at=now()
  where id=p_order_id and public.is_active_match_participant(match_id::text,viewer) and status in ('awaiting_match_acceptance','awaiting_payment','payment_authorized','provider_confirming','confirmed') returning * into result;
  if result.id is null then raise exception 'order cannot be cancelled'; end if;
  insert into public.marketplace_reservation_events(order_id,event_type,actor_id,provider_event_id,safe_metadata) values(p_order_id,'cancellation_requested',viewer,p_idempotency_key,jsonb_build_object('reason',left(coalesce(p_reason,''),240))) on conflict do nothing;
  return result;
end $$;

create or replace function public.process_marketplace_booking_webhook(p_provider text, p_provider_event_id text, p_order_id uuid, p_event_type text, p_payment_intent_id text default null, p_provider_confirmation text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare target_status text;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  insert into public.marketplace_provider_webhook_receipts(provider,provider_event_id,payload_hash) values(p_provider,p_provider_event_id,encode(digest(convert_to(concat_ws('|',p_order_id::text,p_event_type,coalesce(p_payment_intent_id,''),coalesce(p_provider_confirmation,'')),'utf8'),'sha256'),'hex')) on conflict do nothing;
  if not found then return false; end if;
  target_status:=case p_event_type when 'payment_authorized' then 'payment_authorized' when 'provider_confirming' then 'provider_confirming' when 'confirmed' then 'confirmed' when 'refunded' then 'refunded' when 'partially_refunded' then 'partially_refunded' when 'failed' then 'support_required' else null end;
  if target_status is null then raise exception 'unsupported event'; end if;
  update public.marketplace_reservation_orders set status=target_status,payment_intent_id=coalesce(p_payment_intent_id,payment_intent_id),provider_confirmation=coalesce(p_provider_confirmation,provider_confirmation),updated_at=now() where id=p_order_id;
  if not found then raise exception 'order unavailable'; end if;
  insert into public.marketplace_reservation_events(order_id,event_type,provider_event_id) values(p_order_id,p_event_type,p_provider_event_id);
  update public.marketplace_provider_webhook_receipts set processed_at=now() where provider=p_provider and provider_event_id=p_provider_event_id;
  return true;
end $$;

revoke all on all tables in schema public from anon;
revoke all on public.marketplace_partners,public.marketplace_venues,public.marketplace_offerings,public.marketplace_availability_slots,public.marketplace_provider_webhook_receipts from authenticated;
revoke execute on function public.create_marketplace_quote(uuid,uuid,integer,text) from public,anon;
revoke execute on function public.create_marketplace_reservation_order(uuid,uuid,text) from public,anon;
revoke execute on function public.respond_marketplace_reservation_order(uuid,boolean,text) from public,anon;
revoke execute on function public.prepare_marketplace_payment(uuid) from public,anon;
revoke execute on function public.cancel_marketplace_reservation_order(uuid,text,text) from public,anon;
grant execute on function public.create_marketplace_quote(uuid,uuid,integer,text) to authenticated;
grant execute on function public.create_marketplace_reservation_order(uuid,uuid,text) to authenticated;
grant execute on function public.respond_marketplace_reservation_order(uuid,boolean,text) to authenticated;
grant execute on function public.prepare_marketplace_payment(uuid) to authenticated;
grant execute on function public.cancel_marketplace_reservation_order(uuid,text,text) to authenticated;
revoke execute on function public.process_marketplace_booking_webhook(text,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.process_marketplace_booking_webhook(text,text,uuid,text,text,text) to service_role;
