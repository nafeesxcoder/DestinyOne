-- Privacy-consented growth measurement, attribution, controlled experiments and verified referral rewards.
create table if not exists public.growth_attribution_touches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  touch_id uuid not null,
  channel text not null check (channel in ('direct','organic','referral','ambassador','event','partnership','paid_search','paid_social','creator')),
  campaign_key text check (campaign_key is null or char_length(campaign_key) between 2 and 80),
  city_key text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id,touch_id)
);

create table if not exists public.growth_events (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null,
  event_name text not null check (event_name in ('signup_started','profile_verified','profile_completed','qualified_introduction_viewed','mutual_match_created','meaningful_conversation_reached','date_plan_accepted','date_outcome_submitted','member_retained_week_8')),
  properties jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(properties)='object'),
  unique(user_id,id)
);
create index if not exists growth_events_funnel_idx on public.growth_events(event_name,occurred_at desc);

create table if not exists public.growth_experiments (
  experiment_key text primary key check (char_length(experiment_key) between 3 and 80),
  hypothesis text not null check (char_length(hypothesis) between 20 and 1000),
  primary_metric text not null,
  guardrail_metrics text[] not null default array['report_rate','block_rate','unmatch_rate','eight_week_retention'],
  variants jsonb not null check (jsonb_typeof(variants)='array'),
  city_keys text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','approved','running','paused','completed','rolled_back')),
  starts_at timestamptz,
  ends_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references public.growth_experiments(experiment_key),
  user_id uuid not null references public.profiles(id) on delete cascade,
  variant_key text not null,
  bucket integer not null check (bucket between 0 and 9999),
  exposed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(experiment_key,user_id)
);

create table if not exists public.growth_referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_invite_id uuid not null unique references public.city_referral_invites(id),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_verification' check (status in ('pending_verification','pending_activation','fraud_review','eligible','rewarded','rejected','reversed')),
  activated_at timestamptz,
  fraud_cleared_at timestamptz,
  rejection_reason text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inviter_id<>invitee_id)
);

create table if not exists public.growth_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  referral_conversion_id uuid not null references public.growth_referral_conversions(id),
  reward_type text not null check (reward_type in ('gift_coins','profile_boost','event_priority','city_founder')),
  units integer not null check (units>0),
  status text not null default 'granted' check (status in ('granted','reversed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  unique(referral_conversion_id,reward_type)
);

create table if not exists public.growth_daily_cohort_snapshots (
  snapshot_date date not null,
  city_key text not null,
  cohort_key text not null,
  acquisition_channel text not null,
  verified_members integer not null default 0 check (verified_members>=0),
  activated_members integer not null default 0 check (activated_members>=0),
  accepted_dates integer not null default 0 check (accepted_dates>=0),
  retained_week_8 integer not null default 0 check (retained_week_8>=0),
  reports integer not null default 0 check (reports>=0),
  spend_cents bigint not null default 0 check (spend_cents>=0),
  created_at timestamptz not null default now(),
  primary key(snapshot_date,city_key,cohort_key,acquisition_channel)
);

alter table public.growth_attribution_touches enable row level security;
alter table public.growth_events enable row level security;
alter table public.growth_experiments enable row level security;
alter table public.growth_experiment_assignments enable row level security;
alter table public.growth_referral_conversions enable row level security;
alter table public.growth_reward_ledger enable row level security;
alter table public.growth_daily_cohort_snapshots enable row level security;

create policy "members view own growth attribution" on public.growth_attribution_touches for select to authenticated using ((select auth.uid())=user_id);
create policy "members view own experiment assignments" on public.growth_experiment_assignments for select to authenticated using ((select auth.uid())=user_id);
create policy "members view own referral conversions" on public.growth_referral_conversions for select to authenticated using ((select auth.uid()) in (inviter_id,invitee_id));
create policy "members view own growth rewards" on public.growth_reward_ledger for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.record_growth_event(p_event_id uuid,p_session_id uuid,p_event_name text,p_properties jsonb default '{}')
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid(); allowed_keys text[]:=array['city_key','cohort_key','acquisition_channel','campaign_key','experiment_key','variant_key','screen_key','intent_key','days_since_signup','count_bucket']; supplied_key text;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  if p_event_name not in ('signup_started','profile_verified','profile_completed','qualified_introduction_viewed','mutual_match_created','meaningful_conversation_reached','date_plan_accepted','date_outcome_submitted','member_retained_week_8') then raise exception 'invalid growth event'; end if;
  if jsonb_typeof(coalesce(p_properties,'{}'))<>'object' then raise exception 'properties must be an object'; end if;
  for supplied_key in select jsonb_object_keys(coalesce(p_properties,'{}')) loop
    if not supplied_key=any(allowed_keys) then raise exception 'property not allowed'; end if;
  end loop;
  insert into public.growth_events(id,user_id,session_id,event_name,properties) values(p_event_id,viewer,p_session_id,p_event_name,coalesce(p_properties,'{}')) on conflict(user_id,id) do nothing;
  return true;
end $$;

create or replace function public.record_growth_attribution_touch(p_touch_id uuid,p_channel text,p_campaign_key text default null,p_city_key text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid();
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  insert into public.growth_attribution_touches(user_id,touch_id,channel,campaign_key,city_key) values(viewer,p_touch_id,lower(trim(p_channel)),nullif(left(trim(coalesce(p_campaign_key,'')),80),''),nullif(left(trim(coalesce(p_city_key,'')),80),'')) on conflict(user_id,touch_id) do nothing;
  return true;
end $$;

create or replace function public.redeem_growth_referral(p_invite_code text,p_idempotency_key text)
returns public.growth_referral_conversions language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid(); invite public.city_referral_invites; result public.growth_referral_conversions;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;
  select * into result from public.growth_referral_conversions where invitee_id=viewer and idempotency_key=p_idempotency_key;
  if result.id is not null then return result; end if;
  select * into invite from public.city_referral_invites where invite_code=trim(p_invite_code) for update;
  if invite.id is null or invite.expires_at<=now() or invite.status in ('expired','revoked') then raise exception 'invite unavailable'; end if;
  if invite.inviter_id=viewer then raise exception 'self referral unavailable'; end if;
  if exists(select 1 from public.growth_referral_conversions where invitee_id=viewer) then raise exception 'referral already linked'; end if;
  insert into public.growth_referral_conversions(referral_invite_id,inviter_id,invitee_id,status,idempotency_key) values(invite.id,invite.inviter_id,viewer,case when coalesce((select verified from public.profiles where id=viewer),false) then 'pending_activation' else 'pending_verification' end,p_idempotency_key) returning * into result;
  update public.city_referral_invites set status='joined',redeemed_by=viewer where id=invite.id;
  return result;
end $$;

create or replace function public.assign_growth_experiment(p_experiment_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=auth.uid(); experiment public.growth_experiments; existing public.growth_experiment_assignments; bucket_value integer; chosen text; variant jsonb; cursor numeric:=0;
begin
  if viewer is null or not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return null; end if;
  select * into experiment from public.growth_experiments where experiment_key=p_experiment_key and status='running' and starts_at<=now() and (ends_at is null or ends_at>now());
  if experiment.experiment_key is null or not ('report_rate'=any(experiment.guardrail_metrics) and 'block_rate'=any(experiment.guardrail_metrics)) then return null; end if;
  select * into existing from public.growth_experiment_assignments where experiment_key=p_experiment_key and user_id=viewer;
  if existing.id is not null then return jsonb_build_object('experimentKey',existing.experiment_key,'variantKey',existing.variant_key); end if;
  bucket_value:=abs(hashtextextended(p_experiment_key||':'||viewer::text,0)%10000)::integer;
  for variant in select * from jsonb_array_elements(experiment.variants) loop
    cursor:=cursor+coalesce((variant->>'allocationPercent')::numeric,0);
    if bucket_value/100.0<cursor then chosen:=variant->>'key'; exit; end if;
  end loop;
  if chosen is null then return null; end if;
  insert into public.growth_experiment_assignments(experiment_key,user_id,variant_key,bucket) values(p_experiment_key,viewer,chosen,bucket_value);
  return jsonb_build_object('experimentKey',p_experiment_key,'variantKey',chosen);
end $$;

create or replace function public.process_growth_referral_reward(p_conversion_id uuid,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare conversion public.growth_referral_conversions; invitee public.profiles; activated boolean;
begin
  if auth.role()<>'service_role' then raise exception 'service role required'; end if;
  select * into conversion from public.growth_referral_conversions where id=p_conversion_id for update;
  select * into invitee from public.profiles where id=conversion.invitee_id;
  activated:=invitee.onboarding_complete and exists(select 1 from public.matches where status='mutual' and conversion.invitee_id in (user_a,user_b));
  if conversion.id is null or not invitee.verified or not activated or conversion.status not in ('pending_verification','pending_activation','eligible') then return false; end if;
  if conversion.fraud_cleared_at is null then update public.growth_referral_conversions set status='fraud_review',updated_at=now() where id=conversion.id; return false; end if;
  insert into public.growth_reward_ledger(user_id,referral_conversion_id,reward_type,units,idempotency_key) values(conversion.inviter_id,conversion.id,'gift_coins',100,p_idempotency_key) on conflict(idempotency_key) do nothing;
  update public.growth_referral_conversions set status='rewarded',activated_at=coalesce(activated_at,now()),updated_at=now() where id=conversion.id;
  update public.city_referral_invites set status='verified',reward_status='granted' where id=conversion.referral_invite_id;
  return true;
end $$;

revoke all on public.growth_attribution_touches,public.growth_events,public.growth_experiments,public.growth_experiment_assignments,public.growth_referral_conversions,public.growth_reward_ledger,public.growth_daily_cohort_snapshots from anon,authenticated;
grant select on public.growth_attribution_touches,public.growth_experiment_assignments,public.growth_referral_conversions,public.growth_reward_ledger to authenticated;
revoke execute on function public.record_growth_event(uuid,uuid,text,jsonb) from public,anon;
revoke execute on function public.record_growth_attribution_touch(uuid,text,text,text) from public,anon;
revoke execute on function public.redeem_growth_referral(text,text) from public,anon;
revoke execute on function public.assign_growth_experiment(text) from public,anon;
revoke execute on function public.process_growth_referral_reward(uuid,text) from public,anon,authenticated;
grant execute on function public.record_growth_event(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.record_growth_attribution_touch(uuid,text,text,text) to authenticated;
grant execute on function public.redeem_growth_referral(text,text) to authenticated;
grant execute on function public.assign_growth_experiment(text) to authenticated;
grant execute on function public.process_growth_referral_reward(uuid,text) to service_role;
