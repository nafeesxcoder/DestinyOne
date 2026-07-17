-- Store catalog verification, renewal-safe ownership, restore sessions, refund
-- review, finance provenance, reconciliation, and protected free capabilities.
alter table public.billing_products
  add column if not exists product_group text not null default 'default' check (char_length(product_group) between 3 and 80);

alter table public.billing_purchase_receipts
  add column if not exists amount_cents integer check (amount_cents is null or amount_cents>=0),
  add column if not exists currency text check (currency is null or currency~'^[a-z]{3}$'),
  add column if not exists provider_environment text check (provider_environment is null or provider_environment in('sandbox','production')),
  add column if not exists verification_source text check (verification_source is null or verification_source in('apple_server_api','google_play_api')),
  add column if not exists provider_signed_at timestamptz;

alter table public.billing_webhook_receipts
  add column if not exists retry_count integer not null default 0 check (retry_count>=0),
  add column if not exists last_attempt_at timestamptz;

alter table public.billing_refund_cases
  add column if not exists eligible_amount_cents integer not null default 0 check (eligible_amount_cents>=0),
  add column if not exists requested_amount_cents integer not null default 0 check (requested_amount_cents>=0),
  add column if not exists currency text check (currency is null or currency~'^[a-z]{3}$');

alter table public.billing_daily_finance_snapshots
  add column if not exists transaction_count integer not null default 0 check (transaction_count>=0);

create table if not exists public.billing_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  product_key text not null references public.billing_products(product_key) on delete restrict,
  environment text not null check (environment in('sandbox','production')),
  storefront text not null check (char_length(storefront) between 2 and 12),
  amount_cents integer not null check (amount_cents>0),
  currency text not null check (currency~'^[a-z]{3}$'),
  provider_catalog_hash text not null check (char_length(provider_catalog_hash) between 32 and 128),
  effective_from timestamptz not null,
  approved_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 160),
  created_at timestamptz not null default now(),
  unique(product_key,environment,storefront,currency,effective_from)
);

create table if not exists public.billing_restore_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in('apple_iap','google_play')),
  status text not null default 'prepared' check (status in('prepared','provider_syncing','verified','failed','expired')),
  idempotency_key text not null,
  expires_at timestamptz not null default(now()+interval '20 minutes'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table if not exists public.billing_ops_reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  role text not null check (role in('billing_support','finance','risk','executive')),
  status text not null default 'active' check (status in('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_refund_case_events (
  id bigint generated always as identity primary key,
  refund_case_id uuid not null references public.billing_refund_cases(id) on delete restrict,
  event_type text not null check (event_type in('requested','claimed','approved','partially_approved','declined','provider_pending','refunded','chargeback_review','closed')),
  actor_id uuid references auth.users(id) on delete restrict,
  amount_cents integer check (amount_cents is null or amount_cents>=0),
  note text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(refund_case_id,idempotency_key)
);

create table if not exists public.billing_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null check (char_length(case_key) between 8 and 220),
  case_type text not null check (case_type in('catalog_mismatch','receipt_amount_mismatch','entitlement_mismatch','stuck_webhook','refund_mismatch','finance_mismatch')),
  severity text not null check (severity in('normal','high','critical')),
  status text not null default 'open' check (status in('open','investigating','resolved','dismissed')),
  receipt_id uuid references public.billing_purchase_receipts(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete restrict,
  evidence jsonb not null default '{}' check (jsonb_typeof(evidence)='object'),
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete restrict,
  resolution_idempotency_key text unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique nulls not distinct(case_key,resolved_at)
);

create table if not exists public.billing_finance_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  platform text not null check (platform in('apple_iap','google_play','real_world_processor')),
  source_run_id text not null unique check (char_length(source_run_id) between 8 and 160),
  payload_hash text not null check (char_length(payload_hash) between 32 and 128),
  recorded_at timestamptz not null default now()
);

alter table public.billing_catalog_versions enable row level security;
alter table public.billing_restore_sessions enable row level security;
alter table public.billing_ops_reviewers enable row level security;
alter table public.billing_refund_case_events enable row level security;
alter table public.billing_reconciliation_cases enable row level security;
alter table public.billing_finance_ingestion_runs enable row level security;

create policy "members view own billing restore sessions" on public.billing_restore_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy "members view own billing refund events" on public.billing_refund_case_events for select to authenticated using (exists(select 1 from public.billing_refund_cases c where c.id=refund_case_id and c.user_id=(select auth.uid())));

create or replace function public.prevent_billing_catalog_mutation()
returns trigger language plpgsql set search_path=public as $$ begin raise exception 'Approved billing catalog versions are immutable'; end; $$;
drop trigger if exists billing_catalog_versions_immutable on public.billing_catalog_versions;
create trigger billing_catalog_versions_immutable before update or delete on public.billing_catalog_versions for each row execute function public.prevent_billing_catalog_mutation();

create or replace function public.enforce_billing_product_activation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.entitlement_key~*'(safety|report|block|unmatch|emergency|privacy|verification|deletion)' then raise exception 'Safety and privacy capabilities cannot be paid entitlements'; end if;
  if new.active and (tg_op='INSERT' or old.active is distinct from true) and not exists(select 1 from public.billing_catalog_versions c where c.product_key=new.product_key and c.effective_from<=now()) then raise exception 'Approved store catalog evidence is required before product activation'; end if;
  new.updated_at:=now(); return new;
end;
$$;
drop trigger if exists billing_product_activation_guard on public.billing_products;
create trigger billing_product_activation_guard before insert or update on public.billing_products for each row execute function public.enforce_billing_product_activation();

create or replace function public.record_billing_catalog_version(p_product_key text,p_environment text,p_storefront text,p_amount_cents integer,p_currency text,p_provider_catalog_hash text,p_effective_from timestamptz,p_approved_by uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.billing_catalog_versions%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into result from public.billing_catalog_versions where idempotency_key=trim(p_idempotency_key); if result.id is not null then return to_jsonb(result); end if;
  if p_environment not in('sandbox','production') or p_amount_cents<=0 or lower(trim(p_currency))!~'^[a-z]{3}$' or p_effective_from>now()+interval '30 days' then raise exception 'Catalog version is invalid'; end if;
  insert into public.billing_catalog_versions(product_key,environment,storefront,amount_cents,currency,provider_catalog_hash,effective_from,approved_by,idempotency_key)
  values(p_product_key,p_environment,upper(trim(p_storefront)),p_amount_cents,lower(trim(p_currency)),lower(trim(p_provider_catalog_hash)),p_effective_from,p_approved_by,trim(p_idempotency_key)) returning * into result;
  return to_jsonb(result);
end;
$$;

create or replace function public.prepare_store_purchase(p_product_key text,p_platform text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); product public.billing_products; purchase_session public.billing_purchase_sessions; catalog public.billing_catalog_versions;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if p_platform not in('apple_iap','google_play') or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 120 then raise exception 'store purchase request is invalid'; end if;
  select * into purchase_session from public.billing_purchase_sessions where user_id=viewer and idempotency_key=trim(p_idempotency_key);
  if purchase_session.id is not null then select * into product from public.billing_products where product_key=purchase_session.product_key; return jsonb_build_object('purchaseSessionId',purchase_session.id,'externalProductId',product.external_product_id,'platform',purchase_session.platform,'expiresAt',purchase_session.expires_at); end if;
  if (select count(*) from public.billing_purchase_sessions where user_id=viewer and created_at>now()-interval '1 hour')>=10 then raise exception 'purchase preparation rate limit reached'; end if;
  select * into product from public.billing_products where product_key=p_product_key and platform=p_platform and active and product_class in('membership','spark_pack','executive_membership');
  select * into catalog from public.billing_catalog_versions where product_key=p_product_key and effective_from<=now() order by effective_from desc limit 1;
  if product.product_key is null or catalog.id is null then raise exception 'verified store product unavailable'; end if;
  insert into public.billing_purchase_sessions(user_id,product_key,platform,idempotency_key) values(viewer,product.product_key,p_platform,trim(p_idempotency_key)) returning * into purchase_session;
  return jsonb_build_object('purchaseSessionId',purchase_session.id,'externalProductId',product.external_product_id,'platform',purchase_session.platform,'expiresAt',purchase_session.expires_at,'catalogCurrency',catalog.currency);
end;
$$;

create or replace function public.begin_store_restore(p_platform text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); result public.billing_restore_sessions%rowtype;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if p_platform not in('apple_iap','google_play') or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 120 then raise exception 'restore request is invalid'; end if;
  insert into public.billing_restore_sessions(user_id,platform,idempotency_key) values(viewer,p_platform,trim(p_idempotency_key))
  on conflict(user_id,idempotency_key) do update set updated_at=public.billing_restore_sessions.updated_at returning * into result;
  return jsonb_build_object('restoreSessionId',result.id,'platform',result.platform,'status',result.status,'expiresAt',result.expires_at,'providerSyncRequired',true);
end;
$$;

create or replace function public.complete_store_restore(p_restore_session_id uuid,p_verified_count integer,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.billing_restore_sessions%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_verified_count<0 then raise exception 'Verified purchase count is invalid'; end if;
  update public.billing_restore_sessions set status=case when nullif(trim(coalesce(p_error,'')),'') is null then 'verified' else 'failed' end,
    verified_at=case when nullif(trim(coalesce(p_error,'')),'') is null then now() else null end,updated_at=now()
  where id=p_restore_session_id and status in('prepared','provider_syncing') and expires_at>now() returning * into result;
  if result.id is null then raise exception 'Restore session is unavailable'; end if;
  return jsonb_build_object('restoreSessionId',result.id,'status',result.status,'verifiedPurchaseCount',p_verified_count,'error',nullif(trim(coalesce(p_error,'')),''));
end;
$$;

create or replace function public.restore_store_purchases()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('restored',coalesce(jsonb_agg(jsonb_build_object('key',entitlement_key,'status',status,'units',units,'expiresAt',expires_at) order by entitlement_key),'[]'::jsonb),'providerSyncRequired',true,'asOf',now())
  from public.billing_entitlement_snapshots where user_id=auth.uid() and status in('active','grace_period','billing_retry')
$$;

create or replace function public.request_billing_refund(p_receipt_id uuid,p_reason text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); result public.billing_refund_cases; receipt public.billing_purchase_receipts;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 8 and 1000 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 120 then raise exception 'refund request is invalid'; end if;
  select * into result from public.billing_refund_cases where user_id=viewer and idempotency_key=trim(p_idempotency_key); if result.id is not null then return jsonb_build_object('caseId',result.id,'status',result.status,'eligibleAmountCents',result.eligible_amount_cents,'currency',result.currency); end if;
  select * into receipt from public.billing_purchase_receipts where id=p_receipt_id and user_id=viewer for update;
  if receipt.id is null or receipt.status not in('verified','active','grace_period','billing_retry','partially_refunded') or coalesce(receipt.amount_cents,0)<=0 then raise exception 'receipt is not eligible for refund review'; end if;
  insert into public.billing_refund_cases(user_id,receipt_id,reason,idempotency_key,eligible_amount_cents,requested_amount_cents,currency)
  values(viewer,p_receipt_id,trim(p_reason),trim(p_idempotency_key),receipt.amount_cents,receipt.amount_cents,receipt.currency) returning * into result;
  insert into public.billing_refund_case_events(refund_case_id,event_type,actor_id,amount_cents,note,idempotency_key) values(result.id,'requested',viewer,result.requested_amount_cents,'Member requested refund','request:'||result.id::text);
  return jsonb_build_object('caseId',result.id,'status',result.status,'eligibleAmountCents',result.eligible_amount_cents,'currency',result.currency);
end;
$$;

create or replace function public.review_billing_refund(p_case_id uuid,p_reviewer_id uuid,p_decision text,p_amount_cents integer,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.billing_refund_cases%rowtype; event_type text; existing_event public.billing_refund_case_events%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.billing_ops_reviewers r where r.user_id=p_reviewer_id and r.status='active' and r.role in('billing_support','finance','risk')) then raise exception 'Qualified billing reviewer required'; end if;
  select * into existing_event from public.billing_refund_case_events where refund_case_id=p_case_id and idempotency_key=trim(p_idempotency_key);
  if existing_event.id is not null then select * into result from public.billing_refund_cases where id=p_case_id; return jsonb_build_object('caseId',result.id,'status',result.status,'idempotent',true); end if;
  select * into result from public.billing_refund_cases where id=p_case_id for update;
  if result.id is null or result.status not in('requested','reviewing','chargeback_review') or p_decision not in('approve','partial','decline','escalate') or char_length(trim(coalesce(p_note,'')))<12 then raise exception 'Refund review is invalid'; end if;
  if p_decision in('approve','partial') and (p_amount_cents<=0 or p_amount_cents>result.eligible_amount_cents or (p_decision='partial' and p_amount_cents>=result.eligible_amount_cents)) then raise exception 'Refund amount exceeds eligibility'; end if;
  event_type:=case p_decision when 'approve' then 'approved' when 'partial' then 'partially_approved' when 'decline' then 'declined' else 'chargeback_review' end;
  insert into public.billing_refund_case_events(refund_case_id,event_type,actor_id,amount_cents,note,idempotency_key) values(p_case_id,event_type,p_reviewer_id,case when p_decision in('approve','partial') then p_amount_cents else null end,trim(p_note),trim(p_idempotency_key)) on conflict(refund_case_id,idempotency_key) do nothing;
  update public.billing_refund_cases set status=case p_decision when 'approve' then 'provider_pending' when 'partial' then 'provider_pending' when 'decline' then 'declined' else 'chargeback_review' end,resolution_note=trim(p_note),resolved_at=case when p_decision='decline' then now() else null end,updated_at=now() where id=p_case_id returning * into result;
  return jsonb_build_object('caseId',result.id,'status',result.status,'approvedAmountCents',case when p_decision in('approve','partial') then p_amount_cents else 0 end);
end;
$$;

drop function if exists public.process_billing_webhook(text,text,text,text,uuid,text,text,text,timestamptz,timestamptz,integer);
create function public.process_billing_webhook(
  p_platform text,p_external_event_id text,p_event_type text,p_payload_sha256 text,p_purchase_session_id uuid,p_external_product_id text,
  p_transaction_hash text,p_original_transaction_hash text,p_status text,p_amount_cents integer,p_currency text,p_environment text,
  p_verification_source text,p_provider_signed_at timestamptz,p_purchased_at timestamptz,p_expires_at timestamptz,p_units integer
)
returns boolean language plpgsql security definer set search_path=public as $$
declare hook public.billing_webhook_receipts; receipt public.billing_purchase_receipts; existing public.billing_purchase_receipts; origin public.billing_purchase_receipts; product public.billing_products; purchase_session public.billing_purchase_sessions; catalog public.billing_catalog_versions; snapshot public.billing_entitlement_snapshots; ledger_event text; delta integer:=0; prior_status text; resolved_user_id uuid; resolved_product_key text; receipt_balance integer:=0; failure_reason text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into hook from public.billing_webhook_receipts where platform=p_platform and external_event_id=p_external_event_id for update;
  if hook.id is not null and hook.processed then return true; end if;
  if hook.id is null then insert into public.billing_webhook_receipts(platform,external_event_id,event_type,payload_sha256,retry_count,last_attempt_at) values(p_platform,p_external_event_id,p_event_type,lower(p_payload_sha256),1,now()) returning * into hook;
  else update public.billing_webhook_receipts set retry_count=retry_count+1,last_attempt_at=now(),processing_error=null where id=hook.id returning * into hook; end if;
  if char_length(trim(coalesce(p_external_event_id,''))) not between 8 and 220 or char_length(trim(coalesce(p_payload_sha256,''))) not between 32 and 128 then failure_reason:='provider event identity invalid';
  elsif p_status not in('verified','active','grace_period','billing_retry','expired','partially_refunded','refunded','chargeback','revoked') then failure_reason:='invalid billing status';
  elsif p_environment not in('sandbox','production') or p_provider_signed_at is null or p_provider_signed_at<now()-interval '7 days' or p_provider_signed_at>now()+interval '5 minutes' then failure_reason:='provider verification timestamp invalid';
  elsif (p_platform='apple_iap' and p_verification_source<>'apple_server_api') or (p_platform='google_play' and p_verification_source<>'google_play_api') then failure_reason:='provider verification source mismatch';
  elsif p_amount_cents is null or p_amount_cents<0 or p_currency is null or lower(p_currency)!~'^[a-z]{3}$' then failure_reason:='billing amount or currency invalid'; end if;
  if failure_reason is not null then update public.billing_webhook_receipts set processing_error=failure_reason,processed_at=null where id=hook.id; insert into public.billing_reconciliation_cases(case_key,case_type,severity,evidence) values('webhook:'||p_platform||':'||p_external_event_id,'receipt_amount_mismatch','critical',jsonb_build_object('event_id',p_external_event_id,'reason',failure_reason)) on conflict do nothing; return false; end if;
  select * into product from public.billing_products where platform=p_platform and external_product_id=p_external_product_id and active;
  select * into catalog from public.billing_catalog_versions where product_key=product.product_key and environment=p_environment and amount_cents=p_amount_cents and currency=lower(p_currency) and effective_from<=coalesce(p_purchased_at,now()) order by effective_from desc limit 1;
  if product.product_key is null or (p_status in('verified','active') and catalog.id is null) then update public.billing_webhook_receipts set processing_error='verified catalog product or price unavailable',processed_at=null where id=hook.id; insert into public.billing_reconciliation_cases(case_key,case_type,severity,evidence) values('webhook:'||p_platform||':'||p_external_event_id,'catalog_mismatch','critical',jsonb_build_object('event_id',p_external_event_id,'product_id',p_external_product_id,'amount_cents',p_amount_cents,'currency',lower(p_currency))) on conflict do nothing; return false; end if;
  if p_purchase_session_id is not null then select * into purchase_session from public.billing_purchase_sessions where id=p_purchase_session_id for update; resolved_user_id:=purchase_session.user_id; resolved_product_key:=purchase_session.product_key;
  elsif nullif(p_original_transaction_hash,'') is not null then select * into origin from public.billing_purchase_receipts where platform=p_platform and (external_transaction_hash=p_original_transaction_hash or original_transaction_hash=p_original_transaction_hash) order by purchased_at nulls last,created_at limit 1; resolved_user_id:=origin.user_id; resolved_product_key:=origin.product_key; end if;
  if resolved_user_id is null or resolved_product_key<>product.product_key or (purchase_session.id is not null and (purchase_session.platform<>p_platform or purchase_session.status in('expired','revoked'))) then update public.billing_webhook_receipts set processing_error='purchase ownership unavailable',processed_at=null where id=hook.id; insert into public.billing_reconciliation_cases(case_key,case_type,severity,evidence) values('webhook:'||p_platform||':'||p_external_event_id,'catalog_mismatch','critical',jsonb_build_object('event_id',p_external_event_id,'reason','purchase ownership unavailable')) on conflict do nothing; return false; end if;
  select * into existing from public.billing_purchase_receipts where platform=p_platform and external_transaction_hash=p_transaction_hash for update;
  if existing.id is not null and (existing.user_id<>resolved_user_id or existing.product_key<>resolved_product_key) then update public.billing_webhook_receipts set processing_error='transaction owner or product mismatch',processed_at=null where id=hook.id; return false; end if;
  prior_status:=existing.status;
  if not public.billing_status_transition_allowed(prior_status,p_status) then update public.billing_webhook_receipts set processing_error='unsupported status transition',processed_at=null where id=hook.id; return false; end if;
  insert into public.billing_purchase_receipts(user_id,product_key,platform,external_transaction_hash,original_transaction_hash,status,server_verified_at,purchased_at,expires_at,last_event_at,amount_cents,currency,provider_environment,verification_source,provider_signed_at)
  values(resolved_user_id,resolved_product_key,p_platform,p_transaction_hash,p_original_transaction_hash,p_status,now(),p_purchased_at,p_expires_at,now(),p_amount_cents,lower(p_currency),p_environment,p_verification_source,p_provider_signed_at)
  on conflict(platform,external_transaction_hash) do update set status=excluded.status,expires_at=excluded.expires_at,last_event_at=now(),updated_at=now(),server_verified_at=coalesce(public.billing_purchase_receipts.server_verified_at,now()),provider_signed_at=excluded.provider_signed_at returning * into receipt;
  select * into snapshot from public.billing_entitlement_snapshots where user_id=resolved_user_id and entitlement_key=product.entitlement_key for update;
  select coalesce(sum(unit_delta),0)::integer into receipt_balance from public.billing_entitlement_ledger where receipt_id=receipt.id;
  ledger_event:=case when p_status in('verified','active') then case when prior_status is null and product.product_class in('membership','executive_membership') and snapshot.status in('active','grace_period','billing_retry') then 'renew' else 'grant' end when p_status in('grace_period','billing_retry') then 'grace' when p_status='expired' then 'expire' when p_status in('partially_refunded','refunded') then 'refund' when p_status='chargeback' then 'chargeback' else 'revoke' end;
  delta:=case when p_status in('verified','active') and prior_status is not null then 0 when p_status in('verified','active') and product.product_class in('membership','executive_membership') and snapshot.status in('active','grace_period','billing_retry') then 0 when p_status in('verified','active') then product.units when p_status in('grace_period','billing_retry') then 0 when p_status='partially_refunded' then -least(greatest(coalesce(p_units,1),1),greatest(receipt_balance,0)) when product.product_class in('membership','executive_membership') then -greatest(coalesce(snapshot.units,0),0) else -greatest(receipt_balance,0) end;
  insert into public.billing_entitlement_ledger(user_id,receipt_id,entitlement_key,event_type,unit_delta,source_event_key,expires_at,metadata) values(resolved_user_id,receipt.id,product.entitlement_key,ledger_event,delta,p_platform||':'||p_external_event_id,p_expires_at,jsonb_build_object('platform',p_platform,'status',p_status,'amount_cents',p_amount_cents,'currency',lower(p_currency)));
  insert into public.billing_entitlement_snapshots(user_id,entitlement_key,status,units,source_receipt_id,expires_at) values(resolved_user_id,product.entitlement_key,case when p_status in('verified','active','partially_refunded') then 'active' else p_status end,greatest(delta,0),receipt.id,p_expires_at)
  on conflict(user_id,entitlement_key) do update set status=case when greatest(public.billing_entitlement_snapshots.units+delta,0)>0 and product.product_class='spark_pack' then 'active' else excluded.status end,units=greatest(public.billing_entitlement_snapshots.units+delta,0),source_receipt_id=excluded.source_receipt_id,expires_at=excluded.expires_at,updated_at=now();
  if purchase_session.id is not null and p_status in('verified','active') and purchase_session.status='prepared' then update public.billing_purchase_sessions set status='consumed',consumed_at=now(),updated_at=now() where id=purchase_session_id; end if;
  if p_status in('partially_refunded','refunded') then
    update public.billing_refund_cases set status=case when p_status='refunded' then 'refunded' else 'partially_refunded' end,resolved_at=now(),updated_at=now() where receipt_id=receipt.id and status='provider_pending';
    insert into public.billing_refund_case_events(refund_case_id,event_type,amount_cents,note,idempotency_key) select id,'refunded',p_amount_cents,'Provider-confirmed refund','provider:'||p_external_event_id from public.billing_refund_cases where receipt_id=receipt.id on conflict do nothing;
  end if;
  update public.billing_webhook_receipts set processed=true,processing_error=null,processed_at=now() where id=hook.id;
  return true;
end;
$$;

create or replace function public.record_billing_finance_snapshot(p_snapshot_date date,p_platform text,p_city_key text,p_source_run_id text,p_payload_hash text,p_metrics jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare run_row public.billing_finance_ingestion_runs%rowtype; expected_gross bigint; result public.billing_daily_finance_snapshots%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into run_row from public.billing_finance_ingestion_runs where source_run_id=trim(p_source_run_id); if run_row.id is not null then return jsonb_build_object('ingestionRunId',run_row.id,'idempotent',true); end if;
  if p_snapshot_date>current_date or p_platform not in('apple_iap','google_play','real_world_processor') or not p_metrics ?& array['gross_revenue_cents','store_processor_fees_cents','taxes_cents','refunds_cents','chargebacks_cents','marketplace_cost_cents','support_cost_cents','acquisition_cost_cents','transaction_count'] or exists(select 1 from jsonb_each_text(p_metrics) m where m.value~'^-' and m.key in('gross_revenue_cents','store_processor_fees_cents','taxes_cents','refunds_cents','chargebacks_cents','marketplace_cost_cents','support_cost_cents','acquisition_cost_cents','transaction_count')) then raise exception 'Finance snapshot is invalid'; end if;
  insert into public.billing_finance_ingestion_runs(snapshot_date,platform,source_run_id,payload_hash) values(p_snapshot_date,p_platform,trim(p_source_run_id),lower(trim(p_payload_hash))) returning * into run_row;
  insert into public.billing_daily_finance_snapshots(snapshot_date,platform,city_key,gross_revenue_cents,store_processor_fees_cents,taxes_cents,refunds_cents,chargebacks_cents,marketplace_cost_cents,support_cost_cents,acquisition_cost_cents,transaction_count)
  values(p_snapshot_date,p_platform,trim(p_city_key),(p_metrics->>'gross_revenue_cents')::bigint,(p_metrics->>'store_processor_fees_cents')::bigint,(p_metrics->>'taxes_cents')::bigint,(p_metrics->>'refunds_cents')::bigint,(p_metrics->>'chargebacks_cents')::bigint,(p_metrics->>'marketplace_cost_cents')::bigint,(p_metrics->>'support_cost_cents')::bigint,(p_metrics->>'acquisition_cost_cents')::bigint,(p_metrics->>'transaction_count')::integer)
  on conflict(snapshot_date,platform,city_key) do update set gross_revenue_cents=excluded.gross_revenue_cents,store_processor_fees_cents=excluded.store_processor_fees_cents,taxes_cents=excluded.taxes_cents,refunds_cents=excluded.refunds_cents,chargebacks_cents=excluded.chargebacks_cents,marketplace_cost_cents=excluded.marketplace_cost_cents,support_cost_cents=excluded.support_cost_cents,acquisition_cost_cents=excluded.acquisition_cost_cents,transaction_count=excluded.transaction_count returning * into result;
  select coalesce(sum(amount_cents),0) into expected_gross from public.billing_purchase_receipts where platform=p_platform and purchased_at::date=p_snapshot_date and status in('verified','active','grace_period','billing_retry');
  if expected_gross<>result.gross_revenue_cents then insert into public.billing_reconciliation_cases(case_key,case_type,severity,evidence) values('finance:'||p_snapshot_date::text||':'||p_platform||':'||trim(p_city_key),'finance_mismatch','critical',jsonb_build_object('snapshot_date',p_snapshot_date,'platform',p_platform,'receipt_gross',expected_gross,'finance_gross',result.gross_revenue_cents)) on conflict do nothing; end if;
  return jsonb_build_object('ingestionRunId',run_row.id,'financeMismatch',expected_gross<>result.gross_revenue_cents);
end;
$$;

create or replace function public.reconcile_billing_operations(p_stale_minutes integer default 30)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer:=0; affected integer:=0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_stale_minutes not between 15 and 1440 then raise exception 'Reconciliation window is invalid'; end if;
  insert into public.billing_reconciliation_cases(case_key,case_type,severity,user_id,evidence)
  select 'entitlement:'||s.user_id::text||':'||s.entitlement_key,'entitlement_mismatch','critical',s.user_id,jsonb_build_object('entitlement_key',s.entitlement_key,'snapshot_units',s.units,'ledger_units',coalesce(sum(l.unit_delta),0)) from public.billing_entitlement_snapshots s left join public.billing_entitlement_ledger l on l.user_id=s.user_id and l.entitlement_key=s.entitlement_key group by s.user_id,s.entitlement_key,s.units having s.units<>coalesce(sum(l.unit_delta),0) on conflict do nothing;
  get diagnostics inserted_count=row_count;
  insert into public.billing_reconciliation_cases(case_key,case_type,severity,evidence) select 'webhook:'||platform||':'||external_event_id,'stuck_webhook','high',jsonb_build_object('webhook_id',id,'event_id',external_event_id,'error',processing_error,'retry_count',retry_count) from public.billing_webhook_receipts where not processed and received_at<now()-make_interval(mins=>p_stale_minutes) on conflict do nothing; get diagnostics affected=row_count; inserted_count:=inserted_count+affected;
  insert into public.billing_reconciliation_cases(case_key,case_type,severity,receipt_id,user_id,evidence) select 'receipt:'||r.id::text||':catalog','catalog_mismatch','critical',r.id,r.user_id,jsonb_build_object('product_key',r.product_key,'amount_cents',r.amount_cents,'currency',r.currency) from public.billing_purchase_receipts r where r.server_verified_at is not null and (r.amount_cents is null or r.currency is null or r.verification_source is null) on conflict do nothing; get diagnostics affected=row_count; inserted_count:=inserted_count+affected;
  insert into public.billing_reconciliation_cases(case_key,case_type,severity,receipt_id,user_id,evidence) select 'receipt:'||r.id::text||':refund','refund_mismatch','high',r.id,r.user_id,jsonb_build_object('receipt_status',r.status,'refund_status',c.status) from public.billing_refund_cases c join public.billing_purchase_receipts r on r.id=c.receipt_id where (c.status in('refunded','partially_refunded') and r.status not in('refunded','partially_refunded')) or (r.status in('refunded','partially_refunded') and c.status not in('refunded','partially_refunded','closed')) on conflict do nothing; get diagnostics affected=row_count; inserted_count:=inserted_count+affected;
  return inserted_count;
end;
$$;

create or replace function public.resolve_billing_reconciliation_case(p_case_id uuid,p_reviewer_id uuid,p_status text,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.billing_reconciliation_cases%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.billing_ops_reviewers r where r.user_id=p_reviewer_id and r.status='active' and r.role in('finance','risk','executive')) then raise exception 'Qualified finance reviewer required'; end if;
  if p_status not in('resolved','dismissed') or char_length(trim(coalesce(p_note,'')))<20 or char_length(trim(coalesce(p_idempotency_key,'')))<8 then raise exception 'Reconciliation decision is invalid'; end if;
  select * into result from public.billing_reconciliation_cases where resolution_idempotency_key=trim(p_idempotency_key); if result.id is not null then return to_jsonb(result); end if;
  update public.billing_reconciliation_cases set status=p_status,resolution_note=trim(p_note),resolved_by=p_reviewer_id,resolved_at=now(),resolution_idempotency_key=trim(p_idempotency_key) where id=p_case_id and status in('open','investigating') returning * into result;
  if result.id is null then raise exception 'Reconciliation case is unavailable'; end if;
  return to_jsonb(result);
end;
$$;

revoke all on public.billing_catalog_versions,public.billing_restore_sessions,public.billing_ops_reviewers,public.billing_refund_case_events,public.billing_reconciliation_cases,public.billing_finance_ingestion_runs from public,anon,authenticated;
grant select on public.billing_restore_sessions,public.billing_refund_case_events to authenticated;
revoke all on function public.prevent_billing_catalog_mutation() from public,anon,authenticated;
revoke all on function public.enforce_billing_product_activation() from public,anon,authenticated;
revoke all on function public.record_billing_catalog_version(text,text,text,integer,text,text,timestamptz,uuid,text) from public,anon,authenticated;
revoke all on function public.begin_store_restore(text,text) from public,anon,authenticated;
revoke all on function public.complete_store_restore(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.review_billing_refund(uuid,uuid,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.process_billing_webhook(text,text,text,text,uuid,text,text,text,text,integer,text,text,text,timestamptz,timestamptz,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.record_billing_finance_snapshot(date,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.reconcile_billing_operations(integer) from public,anon,authenticated;
revoke all on function public.resolve_billing_reconciliation_case(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.begin_store_restore(text,text) to authenticated;
grant execute on function public.complete_store_restore(uuid,integer,text) to service_role;
grant execute on function public.record_billing_catalog_version(text,text,text,integer,text,text,timestamptz,uuid,text) to service_role;
grant execute on function public.review_billing_refund(uuid,uuid,text,integer,text,text) to service_role;
grant execute on function public.process_billing_webhook(text,text,text,text,uuid,text,text,text,text,integer,text,text,text,timestamptz,timestamptz,timestamptz,integer) to service_role;
grant execute on function public.record_billing_finance_snapshot(date,text,text,text,text,jsonb) to service_role;
grant execute on function public.reconcile_billing_operations(integer) to service_role;
grant execute on function public.resolve_billing_reconciliation_case(uuid,uuid,text,text,text) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v29','schema_version',29,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from(select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from(select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
