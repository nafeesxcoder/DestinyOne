-- Store-compliant billing receipts, immutable entitlements and finance operations.
create table if not exists public.billing_products (
  product_key text primary key check (char_length(product_key) between 3 and 100),
  product_class text not null check (product_class in ('membership','spark_pack','executive_membership','physical_gift','date_reservation')),
  platform text not null check (platform in ('apple_iap','google_play','real_world_processor')),
  external_product_id text not null,
  entitlement_key text not null,
  units integer not null default 1 check (units>0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform,external_product_id),
  check ((product_class in ('membership','spark_pack','executive_membership') and platform in ('apple_iap','google_play')) or (product_class in ('physical_gift','date_reservation') and platform='real_world_processor'))
);

create table if not exists public.billing_purchase_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_key text not null references public.billing_products(product_key),
  platform text not null check (platform in ('apple_iap','google_play')),
  status text not null default 'prepared' check (status in ('prepared','consumed','expired','revoked')),
  idempotency_key text not null,
  expires_at timestamptz not null default (now()+interval '30 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
create index if not exists billing_purchase_sessions_user_idx on public.billing_purchase_sessions(user_id,created_at desc);

create table if not exists public.billing_purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_key text not null references public.billing_products(product_key),
  platform text not null check (platform in ('apple_iap','google_play','real_world_processor')),
  external_transaction_hash text not null,
  original_transaction_hash text,
  status text not null check (status in ('created','pending_store','verified','active','grace_period','billing_retry','expired','partially_refunded','refunded','chargeback','revoked')),
  server_verified_at timestamptz,
  purchased_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform,external_transaction_hash)
);
create index if not exists billing_purchase_receipts_user_idx on public.billing_purchase_receipts(user_id,updated_at desc);

create table if not exists public.billing_entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  receipt_id uuid references public.billing_purchase_receipts(id),
  entitlement_key text not null,
  event_type text not null check (event_type in ('grant','renew','grace','consume','expire','refund','chargeback','revoke','restore')),
  unit_delta integer not null,
  source_event_key text not null unique,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata)='object')
);
create index if not exists billing_entitlement_ledger_user_idx on public.billing_entitlement_ledger(user_id,effective_at desc);

create table if not exists public.billing_entitlement_snapshots (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entitlement_key text not null,
  status text not null check (status in ('active','grace_period','billing_retry','expired','refunded','chargeback','revoked')),
  units integer not null default 0 check (units>=0),
  source_receipt_id uuid references public.billing_purchase_receipts(id),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,entitlement_key)
);

create table if not exists public.billing_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('apple_iap','google_play','real_world_processor')),
  external_event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(platform,external_event_id)
);

create table if not exists public.billing_refund_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  receipt_id uuid not null references public.billing_purchase_receipts(id),
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'requested' check (status in ('requested','reviewing','provider_pending','approved','partially_refunded','refunded','declined','chargeback_review','closed')),
  idempotency_key text not null,
  provider_case_hash text,
  resolution_note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table if not exists public.billing_daily_finance_snapshots (
  snapshot_date date not null,
  platform text not null,
  city_key text not null default 'all',
  gross_revenue_cents bigint not null default 0,
  store_processor_fees_cents bigint not null default 0,
  taxes_cents bigint not null default 0,
  refunds_cents bigint not null default 0,
  chargebacks_cents bigint not null default 0,
  marketplace_cost_cents bigint not null default 0,
  support_cost_cents bigint not null default 0,
  acquisition_cost_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key(snapshot_date,platform,city_key)
);

alter table public.billing_products enable row level security;
alter table public.billing_purchase_sessions enable row level security;
alter table public.billing_purchase_receipts enable row level security;
alter table public.billing_entitlement_ledger enable row level security;
alter table public.billing_entitlement_snapshots enable row level security;
alter table public.billing_webhook_receipts enable row level security;
alter table public.billing_refund_cases enable row level security;
alter table public.billing_daily_finance_snapshots enable row level security;

create policy "members view own billing entitlement snapshots" on public.billing_entitlement_snapshots for select to authenticated using ((select auth.uid())=user_id);
create policy "members view own refund cases" on public.billing_refund_cases for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.prevent_billing_ledger_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'billing audit rows are immutable'; end $$;
create trigger billing_entitlement_ledger_immutable before update or delete on public.billing_entitlement_ledger for each row execute function public.prevent_billing_ledger_mutation();
create trigger billing_webhook_receipts_immutable_delete before delete on public.billing_webhook_receipts for each row execute function public.prevent_billing_ledger_mutation();

create or replace function public.get_current_entitlements()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'entitlements',coalesce(jsonb_agg(jsonb_build_object('key',entitlement_key,'status',status,'units',units,'expiresAt',expires_at) order by entitlement_key),'[]'::jsonb),
    'verifiedByServer',true,
    'asOf',now()
  ) from public.billing_entitlement_snapshots where user_id=auth.uid() and status in ('active','grace_period','billing_retry')
$$;

create or replace function public.restore_store_purchases()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'restored',coalesce(jsonb_agg(jsonb_build_object('key',entitlement_key,'status',status,'units',units,'expiresAt',expires_at) order by entitlement_key),'[]'::jsonb),
    'receiptVerificationRequired',true,
    'asOf',now()
  ) from public.billing_entitlement_snapshots where user_id=auth.uid() and status in ('active','grace_period','billing_retry')
$$;

create or replace function public.request_billing_refund(p_receipt_id uuid,p_reason text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid(); result public.billing_refund_cases;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'refund reason required'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;
  if not exists(select 1 from public.billing_purchase_receipts where id=p_receipt_id and user_id=viewer) then raise exception 'receipt unavailable'; end if;
  insert into public.billing_refund_cases(user_id,receipt_id,reason,idempotency_key)
  values(viewer,p_receipt_id,left(trim(p_reason),1000),left(trim(p_idempotency_key),120))
  on conflict(user_id,idempotency_key) do update set updated_at=public.billing_refund_cases.updated_at
  returning * into result;
  return jsonb_build_object('caseId',result.id,'status',result.status,'requestedAt',result.requested_at);
end $$;

create or replace function public.prepare_store_purchase(p_product_key text,p_platform text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid(); product public.billing_products; purchase_session public.billing_purchase_sessions;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if p_platform not in ('apple_iap','google_play') then raise exception 'store platform required'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;
  select * into purchase_session from public.billing_purchase_sessions where user_id=viewer and idempotency_key=left(trim(p_idempotency_key),120);
  if purchase_session.id is not null then
    select * into product from public.billing_products where product_key=purchase_session.product_key;
    return jsonb_build_object('purchaseSessionId',purchase_session.id,'externalProductId',product.external_product_id,'platform',purchase_session.platform,'expiresAt',purchase_session.expires_at);
  end if;
  if (select count(*) from public.billing_purchase_sessions where user_id=viewer and created_at>now()-interval '1 hour')>=10 then raise exception 'purchase preparation rate limit reached'; end if;
  select * into product from public.billing_products where product_key=p_product_key and platform=p_platform and active and product_class in ('membership','spark_pack','executive_membership');
  if product.product_key is null then raise exception 'store product unavailable'; end if;
  insert into public.billing_purchase_sessions(user_id,product_key,platform,idempotency_key)
  values(viewer,product.product_key,p_platform,left(trim(p_idempotency_key),120)) returning * into purchase_session;
  return jsonb_build_object('purchaseSessionId',purchase_session.id,'externalProductId',product.external_product_id,'platform',purchase_session.platform,'expiresAt',purchase_session.expires_at);
end $$;

create or replace function public.billing_status_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable set search_path=public,pg_temp as $$
  select case
    when p_from is null then p_to in ('verified','active','grace_period','billing_retry','expired','refunded','chargeback','revoked')
    when p_from=p_to then true
    when p_from='created' then p_to in ('pending_store','revoked')
    when p_from='pending_store' then p_to in ('verified','revoked')
    when p_from='verified' then p_to in ('active','grace_period','billing_retry','expired','refunded','chargeback','revoked')
    when p_from='active' then p_to in ('grace_period','billing_retry','expired','partially_refunded','refunded','chargeback','revoked')
    when p_from='grace_period' then p_to in ('active','billing_retry','expired','refunded','chargeback','revoked')
    when p_from='billing_retry' then p_to in ('active','grace_period','expired','refunded','chargeback','revoked')
    when p_from='partially_refunded' then p_to in ('active','refunded','chargeback','revoked')
    when p_from='expired' then p_to in ('active','refunded','chargeback','revoked')
    when p_from='chargeback' then p_to='revoked'
    else false
  end
$$;

create or replace function public.process_billing_webhook(
  p_platform text,p_external_event_id text,p_event_type text,p_payload_sha256 text,p_purchase_session_id uuid,
  p_transaction_hash text,p_original_transaction_hash text,p_status text,
  p_purchased_at timestamptz,p_expires_at timestamptz,p_units integer
)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare hook public.billing_webhook_receipts; receipt public.billing_purchase_receipts; existing public.billing_purchase_receipts; product public.billing_products; purchase_session public.billing_purchase_sessions; ledger_event text; delta integer; prior_status text; resolved_user_id uuid; resolved_product_key text;
begin
  if auth.role()<>'service_role' then raise exception 'service role required'; end if;
  if p_status not in ('verified','active','grace_period','billing_retry','expired','partially_refunded','refunded','chargeback','revoked') then raise exception 'invalid billing status'; end if;
  insert into public.billing_webhook_receipts(platform,external_event_id,event_type,payload_sha256)
  values(p_platform,p_external_event_id,p_event_type,p_payload_sha256)
  on conflict(platform,external_event_id) do nothing returning * into hook;
  if hook.id is null then return true; end if;
  select * into purchase_session from public.billing_purchase_sessions where id=p_purchase_session_id for update;
  if purchase_session.id is null or purchase_session.platform<>p_platform or purchase_session.status in ('expired','revoked') or (purchase_session.status='prepared' and purchase_session.expires_at<=now()) then
    update public.billing_webhook_receipts set processing_error='purchase session unavailable',processed_at=now() where id=hook.id;
    return false;
  end if;
  resolved_user_id:=purchase_session.user_id;
  resolved_product_key:=purchase_session.product_key;
  select * into product from public.billing_products where product_key=resolved_product_key and platform=p_platform and active;
  if product.product_key is null then
    update public.billing_webhook_receipts set processing_error='active billing product unavailable',processed_at=now() where id=hook.id;
    return false;
  end if;
  select * into existing from public.billing_purchase_receipts where platform=p_platform and external_transaction_hash=p_transaction_hash for update;
  if existing.id is not null and (existing.user_id<>resolved_user_id or existing.product_key<>resolved_product_key) then
    update public.billing_webhook_receipts set processing_error='transaction owner or product mismatch',processed_at=now() where id=hook.id;
    return false;
  end if;
  prior_status:=existing.status;
  if not public.billing_status_transition_allowed(prior_status,p_status) then
    update public.billing_webhook_receipts set processing_error='unsupported status transition',processed_at=now() where id=hook.id;
    return false;
  end if;
  insert into public.billing_purchase_receipts(user_id,product_key,platform,external_transaction_hash,original_transaction_hash,status,server_verified_at,purchased_at,expires_at,last_event_at)
  values(resolved_user_id,resolved_product_key,p_platform,p_transaction_hash,p_original_transaction_hash,p_status,now(),p_purchased_at,p_expires_at,now())
  on conflict(platform,external_transaction_hash) do update set status=excluded.status,expires_at=excluded.expires_at,last_event_at=now(),updated_at=now(),server_verified_at=coalesce(public.billing_purchase_receipts.server_verified_at,now())
  returning * into receipt;
  ledger_event:=case when p_status in ('verified','active') then 'grant' when p_status in ('grace_period','billing_retry') then 'grace' when p_status='expired' then 'expire' when p_status in ('partially_refunded','refunded') then 'refund' when p_status='chargeback' then 'chargeback' else 'revoke' end;
  delta:=case
    when p_status in ('verified','active') and product.product_class='spark_pack' and prior_status is not null then 0
    when p_status in ('verified','active') and prior_status in ('verified','active','grace_period','billing_retry','partially_refunded') then 0
    when p_status in ('verified','active') then greatest(coalesce(p_units,product.units),0)
    when p_status in ('grace_period','billing_retry') or prior_status=p_status then 0
    else -greatest(coalesce(p_units,product.units),0)
  end;
  insert into public.billing_entitlement_ledger(user_id,receipt_id,entitlement_key,event_type,unit_delta,source_event_key,expires_at,metadata)
  values(resolved_user_id,receipt.id,product.entitlement_key,ledger_event,delta,p_platform||':'||p_external_event_id,p_expires_at,jsonb_build_object('platform',p_platform,'status',p_status));
  insert into public.billing_entitlement_snapshots(user_id,entitlement_key,status,units,source_receipt_id,expires_at)
  values(resolved_user_id,product.entitlement_key,case when p_status in ('verified','active','partially_refunded') then 'active' else p_status end,case when delta>0 then delta else 0 end,receipt.id,p_expires_at)
  on conflict(user_id,entitlement_key) do update set
    status=excluded.status,
    units=case
      when p_status in ('grace_period','billing_retry') then public.billing_entitlement_snapshots.units
      when p_status='partially_refunded' then greatest(public.billing_entitlement_snapshots.units+delta,0)
      when p_status in ('verified','active') and product.product_class='spark_pack' then greatest(public.billing_entitlement_snapshots.units+delta,0)
      when p_status in ('verified','active') then greatest(delta,0)
      else 0
    end,
    source_receipt_id=excluded.source_receipt_id,expires_at=excluded.expires_at,updated_at=now();
  if p_status in ('verified','active') and purchase_session.status='prepared' then update public.billing_purchase_sessions set status='consumed',consumed_at=now(),updated_at=now() where id=purchase_session.id; end if;
  update public.billing_webhook_receipts set processed=true,processed_at=now() where id=hook.id;
  return true;
exception when others then
  update public.billing_webhook_receipts set processing_error=left(sqlerrm,500),processed_at=now() where id=hook.id;
  return false;
end $$;

revoke all on public.billing_products,public.billing_purchase_sessions,public.billing_purchase_receipts,public.billing_entitlement_ledger,public.billing_entitlement_snapshots,public.billing_webhook_receipts,public.billing_refund_cases,public.billing_daily_finance_snapshots from anon,authenticated;
grant select on public.billing_entitlement_snapshots,public.billing_refund_cases to authenticated;
revoke execute on function public.get_current_entitlements() from public,anon;
revoke execute on function public.restore_store_purchases() from public,anon;
revoke execute on function public.request_billing_refund(uuid,text,text) from public,anon;
revoke execute on function public.prepare_store_purchase(text,text,text) from public,anon;
revoke execute on function public.billing_status_transition_allowed(text,text) from public,anon,authenticated;
revoke execute on function public.process_billing_webhook(text,text,text,text,uuid,text,text,text,timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.get_current_entitlements() to authenticated;
grant execute on function public.restore_store_purchases() to authenticated;
grant execute on function public.request_billing_refund(uuid,text,text) to authenticated;
grant execute on function public.prepare_store_purchase(text,text,text) to authenticated;
grant execute on function public.billing_status_transition_allowed(text,text) to service_role;
grant execute on function public.process_billing_webhook(text,text,text,text,uuid,text,text,text,timestamptz,timestamptz,integer) to service_role;
