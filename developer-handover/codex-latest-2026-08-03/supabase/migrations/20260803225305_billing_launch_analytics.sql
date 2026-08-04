-- Production store-verification audit and privacy-consented launch analytics.
-- No paid capability is granted by a client write. The verification Edge
-- Function records attempts here, then the existing immutable billing ledger
-- is updated only after a trusted provider returns a verified transaction.

create table if not exists public.billing_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purchase_session_id uuid references public.billing_purchase_sessions(id) on delete restrict,
  restore_session_id uuid references public.billing_restore_sessions(id) on delete restrict,
  platform text not null check (platform in ('apple_iap','google_play')),
  product_key text references public.billing_products(product_key) on delete restrict,
  purchase_token_hash text not null check (char_length(purchase_token_hash)=64),
  transaction_hash text check (transaction_hash is null or char_length(transaction_hash)=64),
  status text not null default 'pending' check (status in ('pending','provider_unavailable','rejected','verified','ledger_failed')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 20),
  error_code text check (error_code is null or char_length(error_code) between 2 and 80),
  provider_event_id_hash text check (provider_event_id_hash is null or char_length(provider_event_id_hash)=64),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((purchase_session_id is not null)::integer+(restore_session_id is not null)::integer=1),
  unique(platform,purchase_token_hash)
);
create index if not exists billing_verification_attempts_user_idx on public.billing_verification_attempts(user_id,created_at desc);

create table if not exists public.launch_analytics_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  build_variant text not null check (build_variant in ('development','pilot','production','preview')),
  event_count integer not null default 0 check (event_count between 0 and 10000),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(user_id,id)
);
create index if not exists launch_analytics_sessions_user_started_idx on public.launch_analytics_sessions(user_id,started_at desc);

create table if not exists public.launch_analytics_events (
  id uuid primary key,
  session_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null check (event_name in (
    'app_session_started','screen_viewed','onboarding_started','membership_viewed',
    'checkout_started','checkout_store_opened','checkout_verification_started',
    'checkout_completed','checkout_failed','restore_started','restore_completed','restore_failed',
    'discovery_signal','gift_sent','physical_gift_requested','relationship_path_opened',
    'date_plan_status_changed','private_reflection_saved',
    'relationship_learning_consent_changed','date_reminder_changed'
  )),
  properties jsonb not null default '{}' check (jsonb_typeof(properties)='object'),
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  foreign key(user_id,session_id) references public.launch_analytics_sessions(user_id,id) on delete cascade,
  unique(user_id,id)
);
create index if not exists launch_analytics_events_funnel_idx on public.launch_analytics_events(event_name,occurred_at desc);
create index if not exists launch_analytics_events_session_idx on public.launch_analytics_events(session_id,occurred_at);

alter table public.billing_verification_attempts enable row level security;
alter table public.launch_analytics_sessions enable row level security;
alter table public.launch_analytics_events enable row level security;

create or replace function public.start_launch_analytics_session(
  p_session_id uuid,
  p_platform text,
  p_app_version text,
  p_build_variant text
)
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid();
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  if p_platform not in ('ios','android','web') or p_build_variant not in ('development','pilot','production','preview')
    or char_length(trim(coalesce(p_app_version,''))) not between 1 and 32 then raise exception 'launch session is invalid'; end if;
  if not exists(select 1 from public.launch_analytics_sessions where user_id=viewer and id=p_session_id)
    and (select count(*) from public.launch_analytics_sessions where user_id=viewer and started_at>now()-interval '1 hour')>=12
    then raise exception 'launch session rate limit reached'; end if;
  insert into public.launch_analytics_sessions(id,user_id,platform,app_version,build_variant)
  values(p_session_id,viewer,p_platform,left(trim(p_app_version),32),p_build_variant)
  on conflict(user_id,id) do update set last_seen_at=now(),ended_at=null;
  return true;
end;
$$;

create or replace function public.record_launch_analytics_event(
  p_event_id uuid,
  p_session_id uuid,
  p_event_name text,
  p_properties jsonb default '{}',
  p_occurred_at timestamptz default now()
)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  viewer uuid:=auth.uid();
  allowed_events text[]:=array[
    'app_session_started','screen_viewed','onboarding_started','membership_viewed',
    'checkout_started','checkout_store_opened','checkout_verification_started',
    'checkout_completed','checkout_failed','restore_started','restore_completed','restore_failed',
    'discovery_signal','gift_sent','physical_gift_requested','relationship_path_opened',
    'date_plan_status_changed','private_reflection_saved',
    'relationship_learning_consent_changed','date_reminder_changed'
  ];
  allowed_keys text[]:=array[
    'screen_key','action_key','item_key','status_key','source_key','type','stage',
    'from_status','to_status','choice','enabled','demo','count_bucket','value_bucket',
    'platform','app_version','build_variant','network_state','duration_bucket','error_code'
  ];
  supplied_key text;
  supplied_value jsonb;
  inserted_count integer;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  if not p_event_name=any(allowed_events) then raise exception 'launch event is invalid'; end if;
  if not exists(select 1 from public.launch_analytics_sessions where id=p_session_id and user_id=viewer and ended_at is null) then raise exception 'launch session is unavailable'; end if;
  if jsonb_typeof(coalesce(p_properties,'{}'))<>'object' or jsonb_object_length(coalesce(p_properties,'{}'))>12 then raise exception 'launch properties are invalid'; end if;
  for supplied_key,supplied_value in select key,value from jsonb_each(coalesce(p_properties,'{}')) loop
    if not supplied_key=any(allowed_keys) then raise exception 'launch property is not allowed'; end if;
    if jsonb_typeof(supplied_value) not in ('string','number','boolean','null') or length(supplied_value::text)>130 then raise exception 'launch property value is invalid'; end if;
    if jsonb_typeof(supplied_value)='string' and (
      (supplied_value#>>'{}')~*'[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' or
      (supplied_value#>>'{}')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
      (supplied_value#>>'{}')~'(^|[^0-9])[0-9]{8,}([^0-9]|$)'
    ) then raise exception 'launch property contains a private identifier'; end if;
  end loop;
  if p_occurred_at<now()-interval '24 hours' or p_occurred_at>now()+interval '5 minutes' then raise exception 'launch event time is invalid'; end if;
  if not exists(select 1 from public.launch_analytics_events where user_id=viewer and id=p_event_id)
    and (select count(*) from public.launch_analytics_events where user_id=viewer and received_at>now()-interval '1 hour')>=600
    then raise exception 'launch event rate limit reached'; end if;
  insert into public.launch_analytics_events(id,session_id,user_id,event_name,properties,occurred_at)
  values(p_event_id,p_session_id,viewer,p_event_name,coalesce(p_properties,'{}'),p_occurred_at)
  on conflict(user_id,id) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then
    update public.launch_analytics_sessions set event_count=least(event_count+1,10000),last_seen_at=now()
    where id=p_session_id and user_id=viewer;
  end if;
  return true;
end;
$$;

create or replace function public.close_launch_analytics_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); changed integer;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  update public.launch_analytics_sessions set ended_at=coalesce(ended_at,now()),last_seen_at=now()
  where id=p_session_id and user_id=viewer;
  get diagnostics changed=row_count;
  return changed=1;
end;
$$;

create or replace function public.get_launch_analytics_snapshot(p_since timestamptz default now()-interval '30 days')
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_since<now()-interval '370 days' or p_since>now() then raise exception 'analytics window is invalid'; end if;
  return jsonb_build_object(
    'since',p_since,
    'generatedAt',now(),
    'sessions',(select count(*) from public.launch_analytics_sessions where started_at>=p_since),
    'members',(select count(distinct user_id) from public.launch_analytics_sessions where started_at>=p_since),
    'events',coalesce((select jsonb_object_agg(event_name,total) from (
      select event_name,count(*) total from public.launch_analytics_events where occurred_at>=p_since group by event_name order by event_name
    ) counts),'{}'::jsonb),
    'platforms',coalesce((select jsonb_object_agg(platform,total) from (
      select platform,count(*) total from public.launch_analytics_sessions where started_at>=p_since group by platform order by platform
    ) counts),'{}'::jsonb)
  );
end;
$$;

create or replace function public.withdraw_growth_analytics_consent()
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid();
begin
  if viewer is null then raise exception 'authentication required'; end if;
  update public.privacy_settings set analytics_consent=false,updated_at=now() where user_id=viewer;
  delete from public.growth_experiment_assignments where user_id=viewer;
  delete from public.growth_attribution_touches where user_id=viewer;
  delete from public.growth_events where user_id=viewer;
  delete from public.launch_analytics_sessions where user_id=viewer;
  return true;
end;
$$;

-- Draft, inactive mappings. Launch activation still requires provider catalog
-- evidence through record_billing_catalog_version and the activation guard.
insert into public.billing_products(product_key,product_class,platform,external_product_id,entitlement_key,units,active,product_group)
select logical_key||'.'||platform,product_class,platform,external_product_id,entitlement_key,units,false,product_group
from (values
  ('membership.base.monthly','membership','com.destinyone.app.membership.base.monthly','membership_base',1,'membership'),
  ('membership.base.annual','membership','com.destinyone.app.membership.base.annual','membership_base',1,'membership'),
  ('membership.plus.monthly','membership','com.destinyone.app.membership.plus.monthly','membership_plus',1,'membership'),
  ('membership.plus.annual','membership','com.destinyone.app.membership.plus.annual','membership_plus',1,'membership'),
  ('membership.elite.monthly','membership','com.destinyone.app.membership.elite.monthly','membership_elite',1,'membership'),
  ('membership.elite.annual','membership','com.destinyone.app.membership.elite.annual','membership_elite',1,'membership'),
  ('spark.5','spark_pack','com.destinyone.app.spark.5','spark_wallet',5,'sparks'),
  ('spark.15','spark_pack','com.destinyone.app.spark.15','spark_wallet',15,'sparks'),
  ('spark.40','spark_pack','com.destinyone.app.spark.40','spark_wallet',40,'sparks'),
  ('executive.annual','executive_membership','com.destinyone.app.executive.annual','executive_membership',1,'executive')
) catalog(logical_key,product_class,external_product_id,entitlement_key,units,product_group)
cross join (values('apple_iap'),('google_play')) stores(platform)
on conflict(product_key) do nothing;

revoke all on public.billing_verification_attempts,public.launch_analytics_sessions,public.launch_analytics_events from public,anon,authenticated;
revoke all on function public.start_launch_analytics_session(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.record_launch_analytics_event(uuid,uuid,text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.close_launch_analytics_session(uuid) from public,anon,authenticated;
revoke all on function public.get_launch_analytics_snapshot(timestamptz) from public,anon,authenticated;
grant execute on function public.start_launch_analytics_session(uuid,text,text,text) to authenticated;
grant execute on function public.record_launch_analytics_event(uuid,uuid,text,jsonb,timestamptz) to authenticated;
grant execute on function public.close_launch_analytics_session(uuid) to authenticated;
grant execute on function public.get_launch_analytics_snapshot(timestamptz) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v35','schema_version',35,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from(select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from(select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public,anon,authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
