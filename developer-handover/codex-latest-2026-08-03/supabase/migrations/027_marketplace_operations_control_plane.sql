-- Production marketplace controls: partner compliance, atomic inventory holds,
-- provider sync provenance, server-owned refunds, and reconciliation cases.
alter table public.marketplace_reservation_orders
  add column if not exists captured_amount_cents integer not null default 0 check (captured_amount_cents>=0),
  add column if not exists refunded_amount_cents integer not null default 0 check (refunded_amount_cents>=0),
  add column if not exists provider_amount_cents integer check (provider_amount_cents is null or provider_amount_cents>=0);

create table if not exists public.marketplace_partner_compliance (
  partner_id uuid primary key references public.marketplace_partners(id) on delete cascade,
  contract_status text not null default 'missing' check (contract_status in ('missing','review','verified','expired')),
  insurance_status text not null default 'missing' check (insurance_status in ('missing','review','verified','expired')),
  tax_status text not null default 'missing' check (tax_status in ('missing','review','verified','expired')),
  payout_status text not null default 'missing' check (payout_status in ('missing','review','verified','paused')),
  safety_playbook_accepted boolean not null default false,
  cancellation_policy_version text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_inventory_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (char_length(provider) between 2 and 80),
  provider_sync_id text not null check (char_length(provider_sync_id) between 8 and 160),
  offering_id uuid not null references public.marketplace_offerings(id) on delete restrict,
  payload_hash text not null check (char_length(payload_hash) between 32 and 128),
  slot_count integer not null check (slot_count between 0 and 500),
  status text not null default 'accepted' check (status in ('accepted','rejected')),
  received_at timestamptz not null default now(),
  unique(provider,provider_sync_id)
);

create table if not exists public.marketplace_inventory_holds (
  quote_id uuid primary key references public.marketplace_reservation_quotes(id) on delete restrict,
  slot_id uuid not null references public.marketplace_availability_slots(id) on delete restrict,
  party_size integer not null check (party_size between 1 and 12),
  status text not null default 'held' check (status in ('held','converted','released','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_inventory_holds_expiry_idx on public.marketplace_inventory_holds(expires_at) where status='held';

create table if not exists public.marketplace_refund_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_reservation_orders(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(reason) between 8 and 500),
  eligible_amount_cents integer not null check (eligible_amount_cents>=0),
  status text not null default 'requested' check (status in ('requested','provider_pending','approved','partially_refunded','refunded','denied','support_required')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 160),
  provider_refund_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(requested_by,idempotency_key)
);

create table if not exists public.marketplace_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_reservation_orders(id) on delete restrict,
  case_type text not null check (case_type in ('amount_mismatch','stale_confirmation','missing_payment','refund_mismatch','inventory_mismatch','provider_failure')),
  severity text not null check (severity in ('normal','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','resolved','dismissed')),
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique nulls not distinct(order_id,case_type,resolved_at)
);

alter table public.marketplace_partner_compliance enable row level security;
alter table public.marketplace_inventory_sync_runs enable row level security;
alter table public.marketplace_inventory_holds enable row level security;
alter table public.marketplace_refund_cases enable row level security;
alter table public.marketplace_reconciliation_cases enable row level security;
create policy "members view own marketplace refunds" on public.marketplace_refund_cases
  for select to authenticated using ((select auth.uid())=requested_by);

-- Booking records remain financial records even if the related match later ends.
drop policy if exists "match participants view reservation orders" on public.marketplace_reservation_orders;
create policy "booking participants view reservation orders" on public.marketplace_reservation_orders
  for select to authenticated using (
    (select auth.uid())=purchaser_id or (select auth.uid())=any(accepted_by)
  );
drop policy if exists "match participants view reservation events" on public.marketplace_reservation_events;
create policy "booking participants view reservation events" on public.marketplace_reservation_events
  for select to authenticated using (exists (
    select 1 from public.marketplace_reservation_orders o
    where o.id=order_id and ((select auth.uid())=o.purchaser_id or (select auth.uid())=any(o.accepted_by))
  ));

create or replace function public.enforce_marketplace_partner_activation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='active' and old.status is distinct from 'active' and not exists(
    select 1 from public.marketplace_partner_compliance c where c.partner_id=new.id
      and c.contract_status='verified' and c.insurance_status='verified' and c.tax_status='verified'
      and c.payout_status='verified' and c.safety_playbook_accepted
      and char_length(coalesce(c.cancellation_policy_version,''))>=3 and c.verified_at is not null
  ) then raise exception 'Partner compliance must be verified before activation'; end if;
  return new;
end;
$$;
drop trigger if exists marketplace_partner_activation_guard on public.marketplace_partners;
create trigger marketplace_partner_activation_guard before insert or update on public.marketplace_partners
for each row execute function public.enforce_marketplace_partner_activation();

create or replace function public.expire_marketplace_inventory_holds(p_limit integer default 500)
returns integer language plpgsql security definer set search_path=public as $$
declare hold_row public.marketplace_inventory_holds%rowtype; released integer:=0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  for hold_row in select * from public.marketplace_inventory_holds where status='held' and expires_at<=now() order by expires_at for update skip locked limit least(greatest(p_limit,1),500) loop
    update public.marketplace_availability_slots set remaining_capacity=least(capacity,remaining_capacity+hold_row.party_size) where id=hold_row.slot_id;
    update public.marketplace_inventory_holds set status='expired',updated_at=now() where quote_id=hold_row.quote_id;
    released:=released+1;
  end loop;
  return released;
end;
$$;

create or replace function public.sync_marketplace_inventory(p_provider text,p_provider_sync_id text,p_offering_id uuid,p_slots jsonb,p_payload_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare sync_row public.marketplace_inventory_sync_runs%rowtype; slot jsonb; slot_total integer; held_capacity integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if jsonb_typeof(p_slots)<>'array' then raise exception 'Inventory slots must be an array'; end if;
  slot_total:=jsonb_array_length(p_slots);
  if slot_total>500 or char_length(trim(coalesce(p_provider,''))) not between 2 and 80
     or char_length(trim(coalesce(p_provider_sync_id,''))) not between 8 and 160
     or char_length(trim(coalesce(p_payload_hash,''))) not between 32 and 128 then raise exception 'Inventory sync provenance is invalid'; end if;
  if not exists(select 1 from public.marketplace_offerings o join public.marketplace_venues v on v.id=o.venue_id join public.marketplace_partners p on p.id=v.partner_id where o.id=p_offering_id and o.active and v.status='active' and p.status='active') then raise exception 'Active marketplace offering is required'; end if;
  if exists(select 1 from public.marketplace_inventory_sync_runs where provider=trim(p_provider) and provider_sync_id=trim(p_provider_sync_id)) then
    select * into sync_row from public.marketplace_inventory_sync_runs where provider=trim(p_provider) and provider_sync_id=trim(p_provider_sync_id);
    return jsonb_build_object('sync_id',sync_row.id,'slot_count',sync_row.slot_count,'idempotent',true);
  end if;
  insert into public.marketplace_inventory_sync_runs(provider,provider_sync_id,offering_id,payload_hash,slot_count)
  values(trim(p_provider),trim(p_provider_sync_id),p_offering_id,lower(trim(p_payload_hash)),slot_total) returning * into sync_row;
  for slot in select value from jsonb_array_elements(p_slots) loop
    if not slot ?& array['starts_at','capacity','provider_reference'] or (slot->>'capacity')::integer<1 or (slot->>'capacity')::integer>500
       or (slot->>'starts_at')::timestamptz<=now() or (slot->>'starts_at')::timestamptz>now()+interval '180 days' then raise exception 'Inventory slot is invalid'; end if;
    perform 1 from public.marketplace_availability_slots where offering_id=p_offering_id and starts_at=(slot->>'starts_at')::timestamptz for update;
    select coalesce(sum(h.party_size),0)::integer into held_capacity from public.marketplace_inventory_holds h
      join public.marketplace_reservation_quotes q on q.id=h.quote_id
      where q.offering_id=p_offering_id and h.status='held' and h.expires_at>now()
        and h.slot_id in(select id from public.marketplace_availability_slots where offering_id=p_offering_id and starts_at=(slot->>'starts_at')::timestamptz);
    insert into public.marketplace_availability_slots(offering_id,starts_at,capacity,remaining_capacity,provider_synced_at,provider_reference)
    values(p_offering_id,(slot->>'starts_at')::timestamptz,(slot->>'capacity')::integer,greatest((slot->>'capacity')::integer-held_capacity,0),now(),trim(slot->>'provider_reference'))
    on conflict(offering_id,starts_at) do update set capacity=excluded.capacity,remaining_capacity=excluded.remaining_capacity,provider_synced_at=now(),provider_reference=excluded.provider_reference;
  end loop;
  return jsonb_build_object('sync_id',sync_row.id,'slot_count',slot_total,'idempotent',false);
end;
$$;

create or replace function public.release_marketplace_inventory_hold(p_quote_id uuid,p_release_status text)
returns boolean language plpgsql security definer set search_path=public as $$
declare hold_row public.marketplace_inventory_holds%rowtype;
begin
  if p_release_status not in('released','expired') then raise exception 'Unsupported hold release'; end if;
  select * into hold_row from public.marketplace_inventory_holds where quote_id=p_quote_id for update;
  if hold_row.quote_id is null or hold_row.status<>'held' then return false; end if;
  update public.marketplace_availability_slots set remaining_capacity=least(capacity,remaining_capacity+hold_row.party_size) where id=hold_row.slot_id;
  update public.marketplace_inventory_holds set status=p_release_status,updated_at=now() where quote_id=p_quote_id;
  return true;
end;
$$;

create or replace function public.create_marketplace_quote(p_offering_id uuid,p_slot_id uuid,p_party_size integer,p_idempotency_key text)
returns public.marketplace_reservation_quotes language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); result public.marketplace_reservation_quotes; offering public.marketplace_offerings; slot public.marketplace_availability_slots; expired_capacity integer:=0;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if p_party_size not between 1 and 12 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'quote request is invalid'; end if;
  select * into result from public.marketplace_reservation_quotes where member_id=viewer and idempotency_key=trim(p_idempotency_key);
  if result.id is not null then return result; end if;
  select o.* into offering from public.marketplace_offerings o join public.marketplace_venues v on v.id=o.venue_id join public.marketplace_partners p on p.id=v.partner_id
    join public.marketplace_partner_compliance c on c.partner_id=p.id
    where o.id=p_offering_id and o.active and v.status='active' and p.status='active' and c.contract_status='verified' and c.insurance_status='verified' and c.tax_status='verified' and c.payout_status='verified' and c.safety_playbook_accepted;
  select * into slot from public.marketplace_availability_slots where id=p_slot_id and offering_id=p_offering_id for update;
  perform 1 from public.marketplace_inventory_holds where slot_id=p_slot_id and status='held' and expires_at<=now() for update;
  select coalesce(sum(party_size),0)::integer into expired_capacity from public.marketplace_inventory_holds where slot_id=p_slot_id and status='held' and expires_at<=now();
  if expired_capacity>0 then
    update public.marketplace_inventory_holds set status='expired',updated_at=now() where slot_id=p_slot_id and status='held' and expires_at<=now();
    update public.marketplace_availability_slots set remaining_capacity=least(capacity,remaining_capacity+expired_capacity) where id=p_slot_id returning * into slot;
  end if;
  if offering.id is null or slot.id is null or slot.starts_at<=now() or slot.provider_synced_at<now()-interval '15 minutes' or slot.remaining_capacity<p_party_size then raise exception 'fresh availability unavailable'; end if;
  insert into public.marketplace_reservation_quotes(member_id,offering_id,slot_id,party_size,amount_cents,currency,expires_at,idempotency_key)
  values(viewer,offering.id,slot.id,p_party_size,offering.amount_cents,offering.currency,least(now()+interval '12 minutes',slot.starts_at),trim(p_idempotency_key)) returning * into result;
  update public.marketplace_availability_slots set remaining_capacity=remaining_capacity-p_party_size where id=p_slot_id;
  insert into public.marketplace_inventory_holds(quote_id,slot_id,party_size,expires_at) values(result.id,p_slot_id,p_party_size,result.expires_at);
  return result;
end;
$$;

create or replace function public.respond_marketplace_reservation_order(p_order_id uuid,p_accept boolean,p_idempotency_key text)
returns public.marketplace_reservation_orders language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); result public.marketplace_reservation_orders;
begin
  if viewer is null or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Order response is invalid'; end if;
  select * into result from public.marketplace_reservation_orders where id=p_order_id for update;
  if result.id is null or not public.is_active_match_participant(result.match_id::text,viewer) then raise exception 'order unavailable'; end if;
  if result.status<>'awaiting_match_acceptance' then return result; end if;
  if p_accept then
    update public.marketplace_reservation_orders set accepted_by=array(select distinct unnest(accepted_by||viewer)),status=case when cardinality(array(select distinct unnest(accepted_by||viewer)))=2 then 'awaiting_payment' else status end,updated_at=now() where id=p_order_id returning * into result;
  else
    update public.marketplace_reservation_orders set status='cancelled',updated_at=now() where id=p_order_id returning * into result;
    perform public.release_marketplace_inventory_hold(result.quote_id,'released');
  end if;
  insert into public.marketplace_reservation_events(order_id,event_type,actor_id,provider_event_id)
  values(p_order_id,case when p_accept then 'member_accepted' else 'member_declined' end,viewer,trim(p_idempotency_key)) on conflict do nothing;
  return result;
end;
$$;

create or replace function public.cancel_marketplace_reservation_order(p_order_id uuid,p_reason text,p_idempotency_key text)
returns public.marketplace_reservation_orders language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); result public.marketplace_reservation_orders; prior_status text;
begin
  if viewer is null or char_length(trim(coalesce(p_reason,''))) not between 8 and 500 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Cancellation request is invalid'; end if;
  select status into prior_status from public.marketplace_reservation_orders where id=p_order_id for update;
  update public.marketplace_reservation_orders set status=case when status in('awaiting_match_acceptance','awaiting_payment') then 'cancelled' else 'cancellation_requested' end,updated_at=now()
  where id=p_order_id and (purchaser_id=viewer or viewer=any(accepted_by)) and status in('awaiting_match_acceptance','awaiting_payment','payment_authorized','provider_confirming','confirmed') returning * into result;
  if result.id is null then raise exception 'order cannot be cancelled'; end if;
  if prior_status in('awaiting_match_acceptance','awaiting_payment') then perform public.release_marketplace_inventory_hold(result.quote_id,'released'); end if;
  insert into public.marketplace_reservation_events(order_id,event_type,actor_id,provider_event_id,safe_metadata)
  values(p_order_id,'cancellation_requested',viewer,trim(p_idempotency_key),jsonb_build_object('reason',left(trim(p_reason),240))) on conflict do nothing;
  return result;
end;
$$;

create or replace function public.request_marketplace_refund(p_order_id uuid,p_reason text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); order_row public.marketplace_reservation_orders%rowtype; refund_row public.marketplace_refund_cases%rowtype; late_percent integer; eligible integer;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 8 and 500 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Refund request is invalid'; end if;
  select * into refund_row from public.marketplace_refund_cases where requested_by=viewer and idempotency_key=trim(p_idempotency_key);
  if refund_row.id is not null then return jsonb_build_object('refund_case_id',refund_row.id,'eligible_amount_cents',refund_row.eligible_amount_cents,'status',refund_row.status,'idempotent',true); end if;
  select * into order_row from public.marketplace_reservation_orders where id=p_order_id for update;
  if order_row.id is null or (order_row.purchaser_id<>viewer and not viewer=any(order_row.accepted_by)) or order_row.status not in('confirmed','cancellation_requested','support_required') then raise exception 'Order is not eligible for refund review'; end if;
  select o.late_refund_percent into late_percent from public.marketplace_reservation_quotes q join public.marketplace_offerings o on o.id=q.offering_id where q.id=order_row.quote_id;
  eligible:=case when now()<=order_row.cancellation_cutoff_at then order_row.captured_amount_cents else round(order_row.captured_amount_cents*late_percent/100.0)::integer end;
  insert into public.marketplace_refund_cases(order_id,requested_by,reason,eligible_amount_cents,idempotency_key)
  values(p_order_id,viewer,trim(p_reason),eligible,trim(p_idempotency_key)) returning * into refund_row;
  update public.marketplace_reservation_orders set status='cancellation_requested',updated_at=now() where id=p_order_id and status='confirmed';
  insert into public.marketplace_reservation_events(order_id,event_type,actor_id,provider_event_id,safe_metadata)
  values(p_order_id,'refund_requested',viewer,'refund:'||refund_row.id::text,jsonb_build_object('eligible_amount_cents',eligible));
  return jsonb_build_object('refund_case_id',refund_row.id,'eligible_amount_cents',eligible,'status',refund_row.status,'idempotent',false);
end;
$$;

create or replace function public.marketplace_booking_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable set search_path=public as $$
  select case p_from
    when 'awaiting_payment' then p_to in('payment_authorized','cancelled','failed')
    when 'payment_authorized' then p_to in('provider_confirming','refunded','support_required','failed')
    when 'provider_confirming' then p_to in('confirmed','refunded','failed','support_required')
    when 'confirmed' then p_to in('cancellation_requested','support_required')
    when 'cancellation_requested' then p_to in('cancelled','partially_refunded','refunded','support_required')
    when 'support_required' then p_to in('cancelled','partially_refunded','refunded')
    else false end;
$$;

drop function if exists public.process_marketplace_booking_webhook(text,text,uuid,text,text,text);
create function public.process_marketplace_booking_webhook(
  p_provider text,p_provider_event_id text,p_order_id uuid,p_event_type text,p_amount_cents integer,p_currency text,
  p_payload_hash text,p_payment_intent_id text default null,p_provider_confirmation text default null
)
returns boolean language plpgsql security definer set search_path=public as $$
declare target_status text; order_row public.marketplace_reservation_orders%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if char_length(trim(coalesce(p_provider_event_id,''))) not between 8 and 160 or char_length(trim(coalesce(p_payload_hash,''))) not between 32 and 128 then raise exception 'Webhook provenance is invalid'; end if;
  select * into order_row from public.marketplace_reservation_orders where id=p_order_id for update;
  if order_row.id is null then raise exception 'order unavailable'; end if;
  insert into public.marketplace_provider_webhook_receipts(provider,provider_event_id,payload_hash)
  values(trim(p_provider),trim(p_provider_event_id),lower(trim(p_payload_hash))) on conflict do nothing;
  if not found then return false; end if;
  target_status:=case p_event_type when 'payment_authorized' then 'payment_authorized' when 'provider_confirming' then 'provider_confirming' when 'confirmed' then 'confirmed' when 'refunded' then 'refunded' when 'partially_refunded' then 'partially_refunded' when 'failed' then 'support_required' else null end;
  if target_status is null or not public.marketplace_booking_transition_allowed(order_row.status,target_status) then raise exception 'Unsupported booking transition'; end if;
  if p_event_type='payment_authorized' and (p_amount_cents<>order_row.amount_cents or lower(p_currency)<>order_row.currency or nullif(trim(coalesce(p_payment_intent_id,'')),'') is null) then raise exception 'Payment amount or currency mismatch'; end if;
  if p_event_type in('provider_confirming','confirmed') and (p_amount_cents<>order_row.amount_cents or lower(p_currency)<>order_row.currency) then raise exception 'Provider amount or currency mismatch'; end if;
  if p_event_type='confirmed' and (order_row.payment_intent_id is null or nullif(trim(coalesce(p_provider_confirmation,'')),'') is null) then raise exception 'Provider confirmation is incomplete'; end if;
  if p_event_type in('refunded','partially_refunded') and (p_amount_cents<0 or order_row.refunded_amount_cents+p_amount_cents>order_row.captured_amount_cents) then raise exception 'Refund amount is invalid'; end if;
  update public.marketplace_reservation_orders set status=target_status,
    payment_intent_id=coalesce(nullif(trim(coalesce(p_payment_intent_id,'')),''),payment_intent_id),
    provider_confirmation=coalesce(nullif(trim(coalesce(p_provider_confirmation,'')),''),provider_confirmation),
    captured_amount_cents=case when p_event_type='payment_authorized' then p_amount_cents else captured_amount_cents end,
    provider_amount_cents=case when p_event_type in('provider_confirming','confirmed') then p_amount_cents else provider_amount_cents end,
    refunded_amount_cents=case when p_event_type in('refunded','partially_refunded') then refunded_amount_cents+p_amount_cents else refunded_amount_cents end,
    updated_at=now() where id=p_order_id returning * into order_row;
  if p_event_type='confirmed' then update public.marketplace_inventory_holds set status='converted',updated_at=now() where quote_id=order_row.quote_id and status='held'; end if;
  if p_event_type='failed' then
    perform public.release_marketplace_inventory_hold(order_row.quote_id,'released');
    insert into public.marketplace_reconciliation_cases(order_id,case_type,severity,evidence) values(p_order_id,'provider_failure','high',jsonb_build_object('provider',p_provider,'event_id',p_provider_event_id)) on conflict do nothing;
  end if;
  update public.marketplace_refund_cases set status=case p_event_type when 'refunded' then 'refunded' when 'partially_refunded' then 'partially_refunded' else status end,
    resolved_at=case when p_event_type in('refunded','partially_refunded') then now() else resolved_at end where order_id=p_order_id and status in('requested','provider_pending','approved');
  insert into public.marketplace_reservation_events(order_id,event_type,provider_event_id,safe_metadata)
  values(p_order_id,p_event_type,p_provider_event_id,jsonb_build_object('amount_cents',p_amount_cents,'currency',lower(p_currency)));
  update public.marketplace_provider_webhook_receipts set processed_at=now() where provider=trim(p_provider) and provider_event_id=trim(p_provider_event_id);
  return true;
end;
$$;

create or replace function public.reconcile_marketplace_orders(p_stale_minutes integer default 30)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer:=0; affected integer:=0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_stale_minutes not between 15 and 1440 then raise exception 'Reconciliation window is invalid'; end if;
  insert into public.marketplace_reconciliation_cases(order_id,case_type,severity,evidence)
  select id,'amount_mismatch','critical',jsonb_build_object('order_amount',amount_cents,'captured_amount',captured_amount_cents,'provider_amount',provider_amount_cents)
  from public.marketplace_reservation_orders where (captured_amount_cents>0 and captured_amount_cents<>amount_cents) or (provider_amount_cents is not null and provider_amount_cents<>amount_cents)
  on conflict do nothing;
  get diagnostics inserted_count=row_count;
  insert into public.marketplace_reconciliation_cases(order_id,case_type,severity,evidence)
  select id,'stale_confirmation','high',jsonb_build_object('status',status,'updated_at',updated_at)
  from public.marketplace_reservation_orders where status in('payment_authorized','provider_confirming') and updated_at<now()-make_interval(mins=>p_stale_minutes)
  on conflict do nothing;
  get diagnostics affected=row_count;
  inserted_count:=inserted_count+affected;
  insert into public.marketplace_reconciliation_cases(order_id,case_type,severity,evidence)
  select id,'refund_mismatch','high',jsonb_build_object('captured_amount',captured_amount_cents,'refunded_amount',refunded_amount_cents)
  from public.marketplace_reservation_orders where refunded_amount_cents>captured_amount_cents
  on conflict do nothing;
  get diagnostics affected=row_count;
  inserted_count:=inserted_count+affected;
  return inserted_count;
end;
$$;

revoke all on public.marketplace_partner_compliance,public.marketplace_inventory_sync_runs,public.marketplace_inventory_holds,public.marketplace_refund_cases,public.marketplace_reconciliation_cases from public,anon,authenticated;
grant select on public.marketplace_refund_cases to authenticated;
revoke all on function public.enforce_marketplace_partner_activation() from public,anon,authenticated;
revoke all on function public.expire_marketplace_inventory_holds(integer) from public,anon,authenticated;
revoke all on function public.sync_marketplace_inventory(text,text,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.release_marketplace_inventory_hold(uuid,text) from public,anon,authenticated;
revoke all on function public.create_marketplace_quote(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.respond_marketplace_reservation_order(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.cancel_marketplace_reservation_order(uuid,text,text) from public,anon,authenticated;
revoke all on function public.request_marketplace_refund(uuid,text,text) from public,anon,authenticated;
revoke all on function public.marketplace_booking_transition_allowed(text,text) from public,anon,authenticated;
revoke all on function public.process_marketplace_booking_webhook(text,text,uuid,text,integer,text,text,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_marketplace_orders(integer) from public,anon,authenticated;
grant execute on function public.create_marketplace_quote(uuid,uuid,integer,text) to authenticated;
grant execute on function public.respond_marketplace_reservation_order(uuid,boolean,text) to authenticated;
grant execute on function public.cancel_marketplace_reservation_order(uuid,text,text) to authenticated;
grant execute on function public.request_marketplace_refund(uuid,text,text) to authenticated;
grant execute on function public.expire_marketplace_inventory_holds(integer) to service_role;
grant execute on function public.sync_marketplace_inventory(text,text,uuid,jsonb,text) to service_role;
grant execute on function public.process_marketplace_booking_webhook(text,text,uuid,text,integer,text,text,text,text) to service_role;
grant execute on function public.reconcile_marketplace_orders(integer) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v27','schema_version',27,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from (
      select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname
      where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles && array['public','anon']::name[]
    ) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from (
      select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
    ) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
