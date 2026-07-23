-- Real-world gift fulfillment.
-- Sender never sees the recipient's address. The server stores consent,
-- payment and provider state, then mirrors safe status into chat metadata.

create type public.gift_order_status as enum (
  'recipient_pending',
  'recipient_accepted',
  'payment_authorized',
  'merchant_preparing',
  'courier_assigned',
  'picked_up',
  'delivered',
  'cancelled',
  'failed'
);

create table public.gift_orders (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  note text check (char_length(note) <= 160),
  status public.gift_order_status not null default 'recipient_pending',
  provider text not null default 'demo_local',
  provider_order_id text,
  provider_quote_id text,
  item_subtotal_cents integer not null check (item_subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  estimated_tax_cents integer not null default 0 check (estimated_tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  eta_minutes_min integer not null check (eta_minutes_min >= 0),
  eta_minutes_max integer not null check (eta_minutes_max >= eta_minutes_min),
  eta_label text not null,
  tracking_url text,
  recipient_address_token text,
  recipient_accepted_at timestamptz,
  payment_authorized_at timestamptz,
  provider_submitted_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table public.gift_order_events (
  id uuid primary key default gen_random_uuid(),
  gift_order_id uuid not null references public.gift_orders(id) on delete cascade,
  status public.gift_order_status not null,
  title text not null,
  body text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index gift_orders_sender_created_idx on public.gift_orders(sender_id, created_at desc);
create index gift_orders_recipient_status_idx on public.gift_orders(recipient_id, status, created_at desc);
create index gift_order_events_order_created_idx on public.gift_order_events(gift_order_id, created_at);

alter table public.gift_orders enable row level security;
alter table public.gift_order_events enable row level security;

create policy "members view their gift orders" on public.gift_orders
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

create policy "members create sent gift orders" on public.gift_orders
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

-- Recipient acceptance/payment/provider transitions should go through Edge
-- Functions using the service role so members cannot edit price, provider state,
-- address tokens, or delivery status directly from the client.

create policy "members view their gift order events" on public.gift_order_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.gift_orders go
      where go.id = gift_order_id
        and ((select auth.uid()) = go.sender_id or (select auth.uid()) = go.recipient_id)
    )
  );
