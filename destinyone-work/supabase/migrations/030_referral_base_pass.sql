-- Verified referral reward: seven days of Base access after a referred member
-- completes identity verification and onboarding, with risk review and reversal.
alter table public.growth_reward_ledger drop constraint if exists growth_reward_ledger_reward_type_check;
alter table public.growth_reward_ledger add constraint growth_reward_ledger_reward_type_check
  check (reward_type in ('gift_coins','profile_boost','event_priority','city_founder','base_pass_7d'));

create table if not exists public.referral_base_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  referral_conversion_id uuid not null unique references public.growth_referral_conversions(id) on delete restrict,
  reward_ledger_id uuid not null unique references public.growth_reward_ledger(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at>starts_at and expires_at<=starts_at+interval '7 days 5 minutes')
);

alter table public.referral_base_passes enable row level security;
create policy "members view own referral Base passes" on public.referral_base_passes
  for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.process_growth_referral_reward(p_conversion_id uuid,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public as $$
declare conversion public.growth_referral_conversions; invitee public.profiles; inserted_id uuid; existing_reward public.growth_reward_ledger;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Referral reward idempotency key is invalid'; end if;
  select * into existing_reward from public.growth_reward_ledger where idempotency_key=trim(p_idempotency_key);
  if existing_reward.id is not null then return existing_reward.status='granted'; end if;
  select * into conversion from public.growth_referral_conversions where id=p_conversion_id for update;
  select * into invitee from public.profiles where id=conversion.invitee_id;
  if conversion.id is null or not coalesce(invitee.verified,false) or not coalesce(invitee.onboarding_complete,false)
     or conversion.status not in('pending_verification','pending_activation','eligible','fraud_review') then return false; end if;
  if conversion.fraud_cleared_at is null or not exists(
    select 1 from public.growth_referral_risk_reviews r where r.conversion_id=conversion.id and r.decision='cleared'
  ) then
    update public.growth_referral_conversions set status='fraud_review',updated_at=now() where id=conversion.id;
    return false;
  end if;
  insert into public.growth_reward_ledger(user_id,referral_conversion_id,reward_type,units,idempotency_key)
  values(conversion.inviter_id,conversion.id,'base_pass_7d',7,trim(p_idempotency_key))
  on conflict(idempotency_key) do nothing returning id into inserted_id;
  if inserted_id is null then return true; end if;
  insert into public.referral_base_passes(user_id,referral_conversion_id,reward_ledger_id)
  values(conversion.inviter_id,conversion.id,inserted_id);
  update public.growth_referral_conversions set status='rewarded',activated_at=coalesce(activated_at,now()),updated_at=now() where id=conversion.id;
  update public.city_referral_invites set status='verified',reward_status='granted' where id=conversion.referral_invite_id;
  return true;
end;
$$;

create or replace function public.reverse_growth_referral_reward(p_conversion_id uuid,p_reviewer_id uuid,p_reason text,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public as $$
declare reward public.growth_reward_ledger%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 1000 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Referral reversal is invalid'; end if;
  select * into reward from public.growth_reward_ledger where referral_conversion_id=p_conversion_id and reward_type in('base_pass_7d','gift_coins') order by created_at desc limit 1 for update;
  if reward.id is null or reward.status='reversed' then return false; end if;
  update public.growth_reward_ledger set status='reversed' where id=reward.id;
  if reward.reward_type='gift_coins' then insert into public.coin_ledger(user_id,amount,reason,reference_id) values(reward.user_id,-reward.units,'referral_reward_reversed',p_conversion_id); end if;
  update public.referral_base_passes set status='revoked',revoked_at=now(),updated_at=now() where reward_ledger_id=reward.id and status='active';
  insert into public.growth_referral_risk_reviews(conversion_id,reviewer_id,decision,risk_evidence_hash,note,idempotency_key)
  values(p_conversion_id,p_reviewer_id,'rejected',encode(digest(p_reason||':'||p_reviewer_id::text,'sha256'),'hex'),trim(p_reason),trim(p_idempotency_key));
  update public.growth_referral_conversions set status='reversed',rejection_reason=left(trim(p_reason),500),updated_at=now() where id=p_conversion_id;
  update public.city_referral_invites set reward_status='reversed' where id=(select referral_invite_id from public.growth_referral_conversions where id=p_conversion_id);
  return true;
end;
$$;

create or replace function public.get_current_referral_pass()
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select jsonb_build_object(
    'status',case when p.status='active' and p.expires_at>now() then 'active' when p.status='revoked' then 'revoked' else 'expired' end,
    'plan','base','startsAt',p.starts_at,'expiresAt',p.expires_at,'days',7
  ) from public.referral_base_passes p where p.user_id=auth.uid() order by p.created_at desc limit 1),jsonb_build_object('status','none'))
$$;

revoke all on public.referral_base_passes from public,anon,authenticated;
grant select on public.referral_base_passes to authenticated;
revoke all on function public.get_current_referral_pass() from public,anon,authenticated;
grant execute on function public.get_current_referral_pass() to authenticated;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v30','schema_version',30,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from(select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from(select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public,anon,authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
