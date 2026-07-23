-- Real DoorDash Drive-backed gift fulfillment.
-- The client never talks to DoorDash directly and never writes gift_orders
-- rows itself (table grants only allow select). All writes go through the
-- Edge Functions (service_role) or the respond_gift_order RPC below, and
-- every status change mirrors a safe, non-address-leaking message into chat.

alter table public.gift_orders
  add column if not exists doordash_delivery_id text,
  add column if not exists doordash_external_delivery_id text;

create unique index if not exists gift_orders_doordash_external_delivery_id_key
  on public.gift_orders(doordash_external_delivery_id)
  where doordash_external_delivery_id is not null;

-- Recipient delivery address. Deliberately isolated from gift_orders so the
-- existing "members view their gift orders" select policy (which covers the
-- sender too) can never expose it. Only service_role (DoorDash submission,
-- webhook handling) can read this table; there is no authenticated select
-- policy at all, including for the recipient who entered it.
create table if not exists public.gift_order_addresses (
  id uuid primary key default gen_random_uuid(),
  gift_order_id uuid not null unique references public.gift_orders(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  line1 text not null check (char_length(line1) between 3 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 120),
  region text not null check (char_length(region) between 1 and 80),
  postal_code text not null check (char_length(postal_code) between 2 and 20),
  country_code text not null default 'US' check (country_code in ('US', 'CA')),
  dropoff_phone text check (dropoff_phone is null or char_length(dropoff_phone) between 7 and 20),
  dropoff_instructions text check (dropoff_instructions is null or char_length(dropoff_instructions) <= 300),
  created_at timestamptz not null default now()
);

alter table public.gift_order_addresses enable row level security;
-- No policies granted here on purpose: this table is service_role-only.

create table if not exists public.gift_order_webhook_receipts (
  provider text not null,
  provider_event_id text not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, provider_event_id)
);
alter table public.gift_order_webhook_receipts enable row level security;

-- Builds a safe (never contains the address) chat message for a gift order
-- status change and inserts it as kind 'gift'. p_author is 'sender' or
-- 'recipient' and picks which match participant appears as the message
-- sender, since these updates are system/provider driven rather than typed
-- by either person.
create or replace function public.post_gift_status_message(p_order jsonb, p_title text, p_body text, p_author text default 'sender')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  author_id uuid := case when p_author = 'recipient' then (p_order->>'recipient_id')::uuid else (p_order->>'sender_id')::uuid end;
  match_id_value uuid := nullif(p_order->>'match_id', '')::uuid;
  metadata jsonb;
begin
  if match_id_value is null then return; end if;
  metadata := jsonb_build_object('gift', jsonb_build_object(
    'name', p_order->>'product_name',
    'physical', true,
    'orderId', p_order->>'id',
    'deliveryStatus', p_order->>'status',
    'etaLabel', p_order->>'eta_label',
    'provider', p_order->>'provider',
    'trackingUrl', p_order->>'tracking_url',
    'totalCents', (p_order->>'total_cents')::int
  ));
  insert into public.messages(match_id, sender_id, client_message_id, kind, body, metadata)
  values (
    match_id_value, author_id,
    'gift-status-' || (p_order->>'id') || '-' || (p_order->>'status') || '-' || substr(md5(random()::text), 1, 8),
    'gift', coalesce(p_body, p_title), metadata
  );
end;
$$;
revoke all on function public.post_gift_status_message(jsonb, text, text, text) from public, anon, authenticated, service_role;

-- Called by the create-gift-order Edge Function (service_role) once it has
-- computed a quote. This is the only place a gift_orders row is created.
create or replace function public.record_gift_order_request(
  p_order_id uuid, p_match_id uuid, p_sender_id uuid, p_recipient_id uuid,
  p_product_id text, p_product_name text, p_note text, p_provider text,
  p_item_subtotal_cents integer, p_delivery_fee_cents integer, p_service_fee_cents integer,
  p_estimated_tax_cents integer, p_total_cents integer,
  p_eta_minutes_min integer, p_eta_minutes_max integer, p_eta_label text,
  p_tracking_url text, p_service_level text, p_provider_recommendation text,
  p_payment_policy text, p_recipient_privacy text, p_acceptance_window_minutes integer
) returns public.gift_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.gift_orders; order_json jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_match_id is null or p_sender_id is null or p_recipient_id is null then
    raise exception 'match, sender and recipient are required';
  end if;
  insert into public.gift_orders(
    id, match_id, sender_id, recipient_id, product_id, product_name, note, status, provider,
    item_subtotal_cents, delivery_fee_cents, service_fee_cents, estimated_tax_cents, total_cents,
    eta_minutes_min, eta_minutes_max, eta_label, tracking_url, service_level, provider_recommendation,
    payment_policy, recipient_privacy, acceptance_window_minutes, acceptance_expires_at
  ) values (
    p_order_id, p_match_id, p_sender_id, p_recipient_id, p_product_id, p_product_name, p_note, 'recipient_pending', p_provider,
    p_item_subtotal_cents, p_delivery_fee_cents, p_service_fee_cents, p_estimated_tax_cents, p_total_cents,
    p_eta_minutes_min, p_eta_minutes_max, p_eta_label, p_tracking_url, p_service_level, p_provider_recommendation,
    p_payment_policy, p_recipient_privacy, p_acceptance_window_minutes, now() + make_interval(mins => p_acceptance_window_minutes)
  ) returning * into result;
  insert into public.gift_order_events(gift_order_id, status, title, body)
  values (result.id, 'recipient_pending', 'Gift request created', p_product_name || ' requested · ' || p_eta_label);
  order_json := to_jsonb(result);
  perform public.post_gift_status_message(order_json, result.product_name || ' requested', result.product_name || ' requested · ' || result.eta_label || '. Waiting for private acceptance.', 'sender');
  return result;
end;
$$;
revoke all on function public.record_gift_order_request(uuid, uuid, uuid, uuid, text, text, text, text, integer, integer, integer, integer, integer, integer, integer, text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.record_gift_order_request(uuid, uuid, uuid, uuid, text, text, text, text, integer, integer, integer, integer, integer, integer, integer, text, text, text, text, text, text, integer) to service_role;

-- Recipient accepts (with private address) or declines. This is the only
-- client-callable write on gift_orders.
create or replace function public.respond_gift_order(p_order_id uuid, p_accept boolean, p_dropoff jsonb default null)
returns public.gift_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare viewer uuid := auth.uid(); result public.gift_orders; order_json jsonb; address_id uuid;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  select * into result from public.gift_orders where id = p_order_id for update;
  if result.id is null or result.recipient_id <> viewer then raise exception 'gift order unavailable'; end if;
  if result.status <> 'recipient_pending' then return result; end if;
  if result.acceptance_expires_at is not null and result.acceptance_expires_at < now() then
    update public.gift_orders set status = 'cancelled', cancelled_at = now(), failure_reason = 'acceptance window expired', updated_at = now()
    where id = p_order_id returning * into result;
    insert into public.gift_order_events(gift_order_id, status, title, body) values (result.id, 'cancelled', 'Acceptance window expired', null);
    perform public.post_gift_status_message(to_jsonb(result), 'Gift request expired', 'The private acceptance window closed before a response.', 'recipient');
    return result;
  end if;
  if p_accept then
    if p_dropoff is null or nullif(trim(p_dropoff->>'line1'), '') is null or nullif(trim(p_dropoff->>'city'), '') is null
       or nullif(trim(p_dropoff->>'region'), '') is null or nullif(trim(p_dropoff->>'postalCode'), '') is null then
      raise exception 'a complete delivery address is required to accept';
    end if;
    insert into public.gift_order_addresses(gift_order_id, recipient_id, line1, line2, city, region, postal_code, country_code, dropoff_phone, dropoff_instructions)
    values (
      p_order_id, viewer, trim(p_dropoff->>'line1'), nullif(trim(coalesce(p_dropoff->>'line2', '')), ''),
      trim(p_dropoff->>'city'), trim(p_dropoff->>'region'), trim(p_dropoff->>'postalCode'),
      coalesce(nullif(trim(coalesce(p_dropoff->>'countryCode', '')), ''), 'US'),
      nullif(trim(coalesce(p_dropoff->>'phone', '')), ''), nullif(trim(coalesce(p_dropoff->>'instructions', '')), '')
    )
    on conflict (gift_order_id) do update set line1 = excluded.line1, line2 = excluded.line2, city = excluded.city,
      region = excluded.region, postal_code = excluded.postal_code, country_code = excluded.country_code,
      dropoff_phone = excluded.dropoff_phone, dropoff_instructions = excluded.dropoff_instructions
    returning id into address_id;
    update public.gift_orders set status = 'recipient_accepted', recipient_accepted_at = now(),
      recipient_address_token = address_id::text, updated_at = now()
    where id = p_order_id returning * into result;
    insert into public.gift_order_events(gift_order_id, status, title, body) values (result.id, 'recipient_accepted', 'Recipient accepted', 'Address confirmed privately.');
    perform public.post_gift_status_message(to_jsonb(result), 'Recipient accepted', 'Recipient accepted privately. Payment authorization can begin.', 'recipient');
  else
    update public.gift_orders set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = p_order_id returning * into result;
    insert into public.gift_order_events(gift_order_id, status, title, body) values (result.id, 'cancelled', 'Recipient declined', null);
    perform public.post_gift_status_message(to_jsonb(result), 'Gift request declined', 'Recipient declined this gift request.', 'recipient');
  end if;
  return result;
end;
$$;
revoke all on function public.respond_gift_order(uuid, boolean, jsonb) from public, anon;
grant execute on function public.respond_gift_order(uuid, boolean, jsonb) to authenticated;

-- Called by the advance-gift-order Edge Function (service_role) after it
-- authorizes payment, before submitting to DoorDash.
create or replace function public.record_gift_payment_authorized(p_order_id uuid)
returns public.gift_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.gift_orders;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  update public.gift_orders set status = 'payment_authorized', payment_authorized_at = now(), updated_at = now()
  where id = p_order_id and status = 'recipient_accepted' returning * into result;
  if result.id is null then raise exception 'order not ready for payment authorization'; end if;
  insert into public.gift_order_events(gift_order_id, status, title, body) values (result.id, 'payment_authorized', 'Payment authorized', null);
  perform public.post_gift_status_message(to_jsonb(result), 'Payment authorized', 'Payment authorized. Submitting to the delivery partner.', 'sender');
  return result;
end;
$$;
revoke all on function public.record_gift_payment_authorized(uuid) from public, anon, authenticated;
grant execute on function public.record_gift_payment_authorized(uuid) to service_role;

-- Called by the advance-gift-order Edge Function (service_role) once
-- DoorDash Drive accepts the delivery.
create or replace function public.record_gift_provider_submitted(
  p_order_id uuid, p_doordash_delivery_id text, p_doordash_external_delivery_id text, p_tracking_url text
) returns public.gift_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.gift_orders;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  update public.gift_orders set status = 'merchant_preparing', provider_submitted_at = now(),
    doordash_delivery_id = p_doordash_delivery_id, doordash_external_delivery_id = p_doordash_external_delivery_id,
    tracking_url = coalesce(p_tracking_url, tracking_url), updated_at = now()
  where id = p_order_id and status = 'payment_authorized' returning * into result;
  if result.id is null then raise exception 'order not ready for provider submission'; end if;
  insert into public.gift_order_events(gift_order_id, status, title, body, provider_payload)
  values (result.id, 'merchant_preparing', 'Submitted to DoorDash Drive', null, jsonb_build_object('doordashDeliveryId', p_doordash_delivery_id));
  perform public.post_gift_status_message(to_jsonb(result), 'Partner is preparing', result.product_name || ' is being prepared. ETA ' || result.eta_label || '.', 'sender');
  return result;
end;
$$;
revoke all on function public.record_gift_provider_submitted(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_gift_provider_submitted(uuid, text, text, text) to service_role;

-- Marks a DoorDash submission failure so support can retry/refund instead of
-- leaving the order stuck in payment_authorized.
create or replace function public.record_gift_provider_failed(p_order_id uuid, p_reason text)
returns public.gift_orders language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.gift_orders;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  update public.gift_orders set status = 'failed', failure_reason = left(coalesce(p_reason, 'Delivery partner could not accept this order'), 300), updated_at = now()
  where id = p_order_id returning * into result;
  if result.id is null then raise exception 'order unavailable'; end if;
  insert into public.gift_order_events(gift_order_id, status, title, body) values (result.id, 'failed', 'Delivery partner could not fulfill this order', result.failure_reason);
  perform public.post_gift_status_message(to_jsonb(result), 'Needs support', 'The delivery partner could not complete this order. Support can retry or refund.', 'sender');
  return result;
end;
$$;
revoke all on function public.record_gift_provider_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.record_gift_provider_failed(uuid, text) to service_role;

-- Idempotent DoorDash Drive webhook processing, called by the
-- doordash-gift-webhook Edge Function (service_role) via RPC.
create or replace function public.process_gift_delivery_webhook(
  p_provider text, p_provider_event_id text, p_external_delivery_id text, p_event_type text, p_tracking_url text default null
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare target_status public.gift_order_status; result public.gift_orders; title_text text; body_text text;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  insert into public.gift_order_webhook_receipts(provider, provider_event_id, payload_hash)
  values (p_provider, p_provider_event_id, encode(digest(convert_to(concat_ws('|', p_external_delivery_id, p_event_type), 'utf8'), 'sha256'), 'hex'))
  on conflict do nothing;
  if not found then return false; end if;

  target_status := case p_event_type
    when 'dasher_confirmed' then 'courier_assigned'
    when 'dasher_confirmed_pickup_address' then 'courier_assigned'
    when 'dasher_picked_up' then 'picked_up'
    when 'picked_up' then 'picked_up'
    when 'dasher_dropped_off' then 'delivered'
    when 'delivered' then 'delivered'
    when 'delivery_cancelled' then 'cancelled'
    when 'cancelled' then 'cancelled'
    else null
  end::public.gift_order_status;
  if target_status is null then
    update public.gift_order_webhook_receipts set processed_at = now() where provider = p_provider and provider_event_id = p_provider_event_id;
    return true;
  end if;

  update public.gift_orders set
    status = target_status,
    tracking_url = coalesce(p_tracking_url, tracking_url),
    delivered_at = case when target_status = 'delivered' then now() else delivered_at end,
    cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
    updated_at = now()
  where doordash_external_delivery_id = p_external_delivery_id returning * into result;
  if result.id is null then raise exception 'gift order for delivery % not found', p_external_delivery_id; end if;

  insert into public.gift_order_events(gift_order_id, status, title, body, provider_payload)
  values (result.id, target_status, 'DoorDash update: ' || p_event_type, null, jsonb_build_object('eventType', p_event_type));

  title_text := case target_status
    when 'courier_assigned' then 'Courier assigned'
    when 'picked_up' then 'Courier picked up the order'
    when 'delivered' then 'Delivered'
    when 'cancelled' then 'Delivery cancelled'
    else 'Delivery update'
  end;
  body_text := case target_status
    when 'courier_assigned' then 'A courier is on the way to pick up ' || result.product_name || '.'
    when 'picked_up' then 'On the way. ETA ' || result.eta_label || '.'
    when 'delivered' then result.product_name || ' arrived.'
    when 'cancelled' then 'The delivery partner cancelled this order. Support can retry or refund.'
    else null
  end;
  perform public.post_gift_status_message(to_jsonb(result), title_text, body_text, 'sender');
  update public.gift_order_webhook_receipts set processed_at = now() where provider = p_provider and provider_event_id = p_provider_event_id;
  return true;
end;
$$;
revoke all on function public.process_gift_delivery_webhook(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.process_gift_delivery_webhook(text, text, text, text, text) to service_role;

-- Server-only lookup used by the advance-gift-order Edge Function to fetch
-- the private dropoff address plus everything needed to call DoorDash.
create or replace function public.get_gift_order_for_dispatch(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  select to_jsonb(o) || jsonb_build_object('address', to_jsonb(a) - 'recipient_id' - 'gift_order_id')
  into result
  from public.gift_orders o
  join public.gift_order_addresses a on a.gift_order_id = o.id
  where o.id = p_order_id;
  if result is null then raise exception 'order or address not found'; end if;
  return result;
end;
$$;
revoke all on function public.get_gift_order_for_dispatch(uuid) from public, anon, authenticated;
grant execute on function public.get_gift_order_for_dispatch(uuid) to service_role;

revoke all on public.gift_order_addresses, public.gift_order_webhook_receipts from anon, authenticated; 