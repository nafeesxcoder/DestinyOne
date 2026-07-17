-- Trustworthy growth measurement, governed experiments, referral risk controls,
-- consent withdrawal, and provenance-backed cohort economics.
alter table public.growth_events
  add column if not exists source text not null default 'member_rpc' check (source in ('member_rpc','server_verified','backfill')),
  add column if not exists schema_version integer not null default 1 check (schema_version between 1 and 20),
  add column if not exists verified_at timestamptz;

alter table public.growth_experiments
  add column if not exists owner_id uuid references auth.users(id) on delete restrict,
  add column if not exists minimum_sample_size integer not null default 200 check (minimum_sample_size between 50 and 1000000),
  add column if not exists rollout_percent numeric(5,2) not null default 0 check (rollout_percent between 0 and 100),
  add column if not exists kill_switch boolean not null default true,
  add column if not exists guardrail_thresholds jsonb not null default '{"report_rate":2,"block_rate":4,"eight_week_retention_floor":30}'::jsonb,
  add column if not exists approval_expires_at timestamptz;

alter table public.growth_daily_cohort_snapshots
  add column if not exists attributed_signups integer not null default 0 check (attributed_signups>=0),
  add column if not exists completed_profiles integer not null default 0 check (completed_profiles>=0),
  add column if not exists meaningful_conversations integer not null default 0 check (meaningful_conversations>=0),
  add column if not exists revenue_cents bigint not null default 0 check (revenue_cents>=0),
  add column if not exists contribution_margin_cents bigint not null default 0;

create table if not exists public.growth_campaigns (
  campaign_key text primary key check (char_length(campaign_key) between 3 and 80),
  channel text not null check (channel in ('referral','ambassador','event','partnership','paid_search','paid_social','creator')),
  city_keys text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','approved','active','paused','completed','cancelled')),
  spend_cap_cents bigint not null default 0 check (spend_cap_cents>=0),
  starts_at timestamptz,
  ends_at timestamptz,
  owner_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at>starts_at)
);

create table if not exists public.growth_experiment_approvals (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references public.growth_experiments(experiment_key) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reviewer_role text not null check (reviewer_role in ('product','data','safety')),
  decision text not null check (decision in ('approved','rejected','revoked')),
  note text not null check (char_length(note) between 12 and 1000),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(experiment_key,reviewer_role)
);

create table if not exists public.growth_experiment_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references public.growth_experiments(experiment_key) on delete cascade,
  source_run_id text not null unique check (char_length(source_run_id) between 8 and 160),
  sample_size integer not null check (sample_size>=0),
  primary_metric_value numeric not null,
  report_rate numeric(7,4) not null check (report_rate between 0 and 100),
  block_rate numeric(7,4) not null check (block_rate between 0 and 100),
  eight_week_retention numeric(7,4) not null check (eight_week_retention between 0 and 100),
  guardrail_breached boolean not null default false,
  recorded_at timestamptz not null default now(),
  safe_metadata jsonb not null default '{}' check (jsonb_typeof(safe_metadata)='object')
);

create table if not exists public.growth_experiment_decisions (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references public.growth_experiments(experiment_key) on delete restrict,
  decision text not null check (decision in ('ship','stop','inconclusive','rollback')),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(reason) between 20 and 2000),
  evidence_snapshot_id uuid references public.growth_experiment_metric_snapshots(id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.growth_referral_risk_reviews (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references public.growth_referral_conversions(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('cleared','rejected','manual_review')),
  shared_device boolean not null default false,
  shared_payment_identity boolean not null default false,
  velocity_risk boolean not null default false,
  risk_evidence_hash text not null check (char_length(risk_evidence_hash) between 32 and 128),
  note text not null check (char_length(note) between 12 and 1000),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.growth_cohort_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  source_name text not null check (char_length(source_name) between 3 and 80),
  source_run_id text not null unique check (char_length(source_run_id) between 8 and 160),
  payload_hash text not null check (char_length(payload_hash) between 32 and 128),
  row_count integer not null check (row_count between 1 and 10000),
  recorded_at timestamptz not null default now()
);

alter table public.growth_campaigns enable row level security;
alter table public.growth_experiment_approvals enable row level security;
alter table public.growth_experiment_metric_snapshots enable row level security;
alter table public.growth_experiment_decisions enable row level security;
alter table public.growth_referral_risk_reviews enable row level security;
alter table public.growth_cohort_ingestion_runs enable row level security;

create or replace function public.growth_outcome_is_verified(p_user_id uuid,p_event_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select case p_event_name
    when 'signup_started' then exists(select 1 from public.profiles p where p.id=p_user_id)
    when 'profile_verified' then coalesce((select p.verified from public.profiles p where p.id=p_user_id),false)
    when 'profile_completed' then coalesce((select p.onboarding_complete from public.profiles p where p.id=p_user_id),false)
    when 'qualified_introduction_viewed' then exists(select 1 from public.discovery_signals d where d.user_id=p_user_id and d.signal='view')
    when 'mutual_match_created' then exists(select 1 from public.matches m where m.status='mutual' and p_user_id in(m.user_a,m.user_b))
    when 'meaningful_conversation_reached' then exists(
      select 1 from public.messages msg join public.matches m on m.id=msg.match_id
      where m.status='mutual' and p_user_id in(m.user_a,m.user_b)
      group by msg.match_id having count(*)>=6 and count(distinct msg.sender_id)=2
    )
    when 'date_plan_accepted' then exists(
      select 1 from public.date_proposals d join public.matches m on m.id=d.match_id
      where d.status in('accepted','completed') and p_user_id in(m.user_a,m.user_b)
    )
    when 'date_outcome_submitted' then exists(select 1 from public.relationship_reflections r where r.user_id=p_user_id)
    when 'member_retained_week_8' then exists(
      select 1 from public.profiles p where p.id=p_user_id and p.created_at<=now()-interval '56 days'
        and (exists(select 1 from public.messages msg where msg.sender_id=p_user_id and msg.created_at>=now()-interval '14 days')
          or exists(select 1 from public.relationship_reflections r where r.user_id=p_user_id and r.updated_at>=now()-interval '14 days'))
    )
    else false end;
$$;

create or replace function public.record_growth_event(p_event_id uuid,p_session_id uuid,p_event_name text,p_properties jsonb default '{}')
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); allowed_keys text[]:=array['city_key','cohort_key','acquisition_channel','campaign_key','experiment_key','variant_key','screen_key','intent_key','days_since_signup','count_bucket']; supplied_key text;
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  if p_event_name not in ('signup_started','profile_verified','profile_completed','qualified_introduction_viewed','mutual_match_created','meaningful_conversation_reached','date_plan_accepted','date_outcome_submitted','member_retained_week_8') then raise exception 'invalid growth event'; end if;
  if not public.growth_outcome_is_verified(viewer,p_event_name) then raise exception 'Growth outcome is not server verified'; end if;
  if jsonb_typeof(coalesce(p_properties,'{}'))<>'object' then raise exception 'properties must be an object'; end if;
  for supplied_key in select jsonb_object_keys(coalesce(p_properties,'{}')) loop if not supplied_key=any(allowed_keys) then raise exception 'property not allowed'; end if; end loop;
  insert into public.growth_events(id,user_id,session_id,event_name,properties,source,verified_at)
  values(p_event_id,viewer,p_session_id,p_event_name,coalesce(p_properties,'{}'),'server_verified',now()) on conflict(user_id,id) do nothing;
  return true;
end;
$$;

create or replace function public.record_growth_attribution_touch(p_touch_id uuid,p_channel text,p_campaign_key text default null,p_city_key text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); campaign public.growth_campaigns%rowtype; normalized_channel text:=lower(trim(p_channel));
begin
  if viewer is null then raise exception 'authentication required'; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  if normalized_channel not in('direct','organic','referral','ambassador','event','partnership','paid_search','paid_social','creator') then raise exception 'Attribution channel is invalid'; end if;
  if normalized_channel not in('direct','organic') then
    select * into campaign from public.growth_campaigns c where c.campaign_key=trim(p_campaign_key) and c.channel=normalized_channel and c.status='active' and c.starts_at<=now() and (c.ends_at is null or c.ends_at>now());
    if campaign.campaign_key is null then raise exception 'Active matching campaign is required'; end if;
    if cardinality(campaign.city_keys)>0 and nullif(trim(coalesce(p_city_key,'')),'') is not null and not trim(p_city_key)=any(campaign.city_keys) then raise exception 'Campaign city is invalid'; end if;
  elsif nullif(trim(coalesce(p_campaign_key,'')),'') is not null then raise exception 'Direct or organic touch cannot claim a campaign'; end if;
  insert into public.growth_attribution_touches(user_id,touch_id,channel,campaign_key,city_key)
  values(viewer,p_touch_id,normalized_channel,nullif(trim(coalesce(p_campaign_key,'')),''),nullif(left(trim(coalesce(p_city_key,'')),80),'')) on conflict(user_id,touch_id) do nothing;
  return true;
end;
$$;

create or replace function public.enforce_growth_experiment_controls()
returns trigger language plpgsql security definer set search_path=public as $$
declare allocation numeric; distinct_keys integer;
begin
  select coalesce(sum((v->>'allocationPercent')::numeric),0),count(distinct v->>'key') into allocation,distinct_keys from jsonb_array_elements(new.variants) v;
  if jsonb_array_length(new.variants) not between 2 and 5 or allocation<>100 or distinct_keys<>jsonb_array_length(new.variants) then raise exception 'Experiment variants must be unique and total 100 percent'; end if;
  if not (array['report_rate','block_rate','eight_week_retention'] <@ new.guardrail_metrics) then raise exception 'Required growth guardrails are missing'; end if;
  if new.status='running' and (new.kill_switch or new.rollout_percent<=0 or new.approval_expires_at<=now() or
    (select count(distinct a.reviewer_role) from public.growth_experiment_approvals a where a.experiment_key=new.experiment_key and a.decision='approved' and a.expires_at>now())<3 or
    (select count(distinct a.reviewer_id) from public.growth_experiment_approvals a where a.experiment_key=new.experiment_key and a.decision='approved' and a.expires_at>now())<3) then raise exception 'Experiment approvals or rollout controls are incomplete'; end if;
  new.updated_at:=now(); return new;
end;
$$;
drop trigger if exists growth_experiment_control_guard on public.growth_experiments;
create trigger growth_experiment_control_guard before insert or update on public.growth_experiments for each row execute function public.enforce_growth_experiment_controls();

create or replace function public.start_growth_experiment(p_experiment_key text,p_rollout_percent numeric,p_starts_at timestamptz,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.growth_experiments%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_rollout_percent not between 1 and 100 or p_starts_at<now()-interval '5 minutes' or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Experiment start request is invalid'; end if;
  select * into result from public.growth_experiments where experiment_key=p_experiment_key and status='running';
  if result.experiment_key is not null then return jsonb_build_object('experiment_key',result.experiment_key,'status',result.status,'rollout_percent',result.rollout_percent,'idempotent',true); end if;
  update public.growth_experiments set status='running',rollout_percent=p_rollout_percent,kill_switch=false,starts_at=p_starts_at
  where experiment_key=p_experiment_key and status in('approved','paused') returning * into result;
  if result.experiment_key is null then raise exception 'Experiment is not approved for start'; end if;
  return jsonb_build_object('experiment_key',result.experiment_key,'status',result.status,'rollout_percent',result.rollout_percent);
end;
$$;

create or replace function public.assign_growth_experiment(p_experiment_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); experiment public.growth_experiments; existing public.growth_experiment_assignments; bucket_value integer; chosen text; variant jsonb; cursor numeric:=0;
begin
  if viewer is null or not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return null; end if;
  select * into experiment from public.growth_experiments where experiment_key=p_experiment_key and status='running' and not kill_switch and starts_at<=now() and (ends_at is null or ends_at>now()) and approval_expires_at>now();
  if experiment.experiment_key is null then return null; end if;
  select * into existing from public.growth_experiment_assignments where experiment_key=p_experiment_key and user_id=viewer;
  if existing.id is not null then return jsonb_build_object('experimentKey',existing.experiment_key,'variantKey',existing.variant_key); end if;
  bucket_value:=abs(hashtextextended(p_experiment_key||':'||viewer::text,0)%10000)::integer;
  if bucket_value>=experiment.rollout_percent*100 then return null; end if;
  for variant in select * from jsonb_array_elements(experiment.variants) loop cursor:=cursor+coalesce((variant->>'allocationPercent')::numeric,0); if bucket_value/experiment.rollout_percent<cursor then chosen:=variant->>'key'; exit; end if; end loop;
  if chosen is null then return null; end if;
  insert into public.growth_experiment_assignments(experiment_key,user_id,variant_key,bucket) values(p_experiment_key,viewer,chosen,bucket_value);
  return jsonb_build_object('experimentKey',p_experiment_key,'variantKey',chosen);
end;
$$;

create or replace function public.record_growth_experiment_exposure(p_experiment_key text,p_variant_key text)
returns boolean language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); affected integer;
begin
  if viewer is null or not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return false; end if;
  update public.growth_experiment_assignments set exposed_at=coalesce(exposed_at,now()) where experiment_key=p_experiment_key and user_id=viewer and variant_key=p_variant_key;
  get diagnostics affected=row_count; return affected=1;
end;
$$;

create or replace function public.record_growth_experiment_metric_snapshot(p_experiment_key text,p_source_run_id text,p_sample_size integer,p_primary_metric_value numeric,p_report_rate numeric,p_block_rate numeric,p_eight_week_retention numeric,p_safe_metadata jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare experiment public.growth_experiments%rowtype; result public.growth_experiment_metric_snapshots%rowtype; breached boolean;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into result from public.growth_experiment_metric_snapshots where source_run_id=trim(p_source_run_id);
  if result.id is not null then return jsonb_build_object('snapshot_id',result.id,'guardrail_breached',result.guardrail_breached,'idempotent',true); end if;
  select * into experiment from public.growth_experiments where experiment_key=p_experiment_key for update;
  if experiment.experiment_key is null or p_sample_size<0 or jsonb_typeof(coalesce(p_safe_metadata,'{}'))<>'object' then raise exception 'Experiment metric snapshot is invalid'; end if;
  breached:=p_report_rate>(experiment.guardrail_thresholds->>'report_rate')::numeric or p_block_rate>(experiment.guardrail_thresholds->>'block_rate')::numeric or p_eight_week_retention<(experiment.guardrail_thresholds->>'eight_week_retention_floor')::numeric;
  insert into public.growth_experiment_metric_snapshots(experiment_key,source_run_id,sample_size,primary_metric_value,report_rate,block_rate,eight_week_retention,guardrail_breached,safe_metadata)
  values(p_experiment_key,trim(p_source_run_id),p_sample_size,p_primary_metric_value,p_report_rate,p_block_rate,p_eight_week_retention,breached,coalesce(p_safe_metadata,'{}')) returning * into result;
  if breached and experiment.status='running' then update public.growth_experiments set status='paused',kill_switch=true where experiment_key=p_experiment_key; end if;
  return jsonb_build_object('snapshot_id',result.id,'guardrail_breached',breached,'experiment_paused',breached and experiment.status='running');
end;
$$;

create or replace function public.decide_growth_experiment(p_experiment_key text,p_decision text,p_reviewer_id uuid,p_reason text,p_evidence_snapshot_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.growth_experiment_decisions%rowtype; experiment public.growth_experiments%rowtype; sample integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into result from public.growth_experiment_decisions where idempotency_key=trim(p_idempotency_key); if result.id is not null then return to_jsonb(result); end if;
  select * into experiment from public.growth_experiments where experiment_key=p_experiment_key for update;
  select sample_size into sample from public.growth_experiment_metric_snapshots where id=p_evidence_snapshot_id and experiment_key=p_experiment_key;
  if p_decision not in('ship','stop','inconclusive','rollback') or char_length(trim(coalesce(p_reason,''))) not between 20 and 2000 or experiment.experiment_key is null then raise exception 'Experiment decision is invalid'; end if;
  if p_decision='ship' and coalesce(sample,0)<experiment.minimum_sample_size then raise exception 'Minimum sample size is not met'; end if;
  insert into public.growth_experiment_decisions(experiment_key,decision,reviewer_id,reason,evidence_snapshot_id,idempotency_key)
  values(p_experiment_key,p_decision,p_reviewer_id,trim(p_reason),p_evidence_snapshot_id,trim(p_idempotency_key)) returning * into result;
  update public.growth_experiments set status=case when p_decision='rollback' then 'rolled_back' else 'completed' end,kill_switch=true,rollout_percent=0,decision_note=trim(p_reason) where experiment_key=p_experiment_key;
  return to_jsonb(result);
end;
$$;

create or replace function public.review_growth_referral_risk(p_conversion_id uuid,p_reviewer_id uuid,p_decision text,p_shared_device boolean,p_shared_payment_identity boolean,p_velocity_risk boolean,p_risk_evidence_hash text,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.growth_referral_risk_reviews%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into result from public.growth_referral_risk_reviews where idempotency_key=trim(p_idempotency_key);
  if result.id is not null then return to_jsonb(result); end if;
  if p_decision='cleared' and (p_shared_device or p_shared_payment_identity or p_velocity_risk) then raise exception 'Risk signals must be resolved before clearance'; end if;
  insert into public.growth_referral_risk_reviews(conversion_id,reviewer_id,decision,shared_device,shared_payment_identity,velocity_risk,risk_evidence_hash,note,idempotency_key)
  values(p_conversion_id,p_reviewer_id,p_decision,p_shared_device,p_shared_payment_identity,p_velocity_risk,lower(trim(p_risk_evidence_hash)),trim(p_note),trim(p_idempotency_key)) returning * into result;
  update public.growth_referral_conversions set fraud_cleared_at=case when p_decision='cleared' then now() else null end,status=case when p_decision='rejected' then 'rejected' else status end,rejection_reason=case when p_decision='rejected' then left(trim(p_note),500) else rejection_reason end,updated_at=now() where id=p_conversion_id;
  return to_jsonb(result);
end;
$$;

create or replace function public.process_growth_referral_reward(p_conversion_id uuid,p_idempotency_key text)
returns boolean language plpgsql security definer set search_path=public as $$
declare conversion public.growth_referral_conversions; invitee public.profiles; activated boolean; inserted_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into conversion from public.growth_referral_conversions where id=p_conversion_id for update;
  select * into invitee from public.profiles where id=conversion.invitee_id;
  activated:=invitee.onboarding_complete and exists(select 1 from public.matches where status='mutual' and conversion.invitee_id in(user_a,user_b));
  if conversion.id is null or not invitee.verified or not activated or conversion.status not in('pending_verification','pending_activation','eligible','fraud_review') then return false; end if;
  if conversion.fraud_cleared_at is null or not exists(select 1 from public.growth_referral_risk_reviews r where r.conversion_id=conversion.id and r.decision='cleared') then update public.growth_referral_conversions set status='fraud_review',updated_at=now() where id=conversion.id; return false; end if;
  insert into public.growth_reward_ledger(user_id,referral_conversion_id,reward_type,units,idempotency_key) values(conversion.inviter_id,conversion.id,'gift_coins',100,trim(p_idempotency_key)) on conflict(idempotency_key) do nothing returning id into inserted_id;
  if inserted_id is null then return true; end if;
  insert into public.coin_ledger(user_id,amount,reason,reference_id) values(conversion.inviter_id,100,'verified_referral_reward',conversion.id);
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
  select * into reward from public.growth_reward_ledger where referral_conversion_id=p_conversion_id and reward_type='gift_coins' for update;
  if reward.id is null or reward.status='reversed' then return false; end if;
  update public.growth_reward_ledger set status='reversed' where id=reward.id;
  insert into public.coin_ledger(user_id,amount,reason,reference_id) values(reward.user_id,-reward.units,'referral_reward_reversed',p_conversion_id);
  insert into public.growth_referral_risk_reviews(conversion_id,reviewer_id,decision,risk_evidence_hash,note,idempotency_key)
  values(p_conversion_id,p_reviewer_id,'rejected',encode(digest(p_reason||':'||p_reviewer_id::text,'sha256'),'hex'),trim(p_reason),trim(p_idempotency_key));
  update public.growth_referral_conversions set status='reversed',rejection_reason=left(trim(p_reason),500),updated_at=now() where id=p_conversion_id;
  update public.city_referral_invites set reward_status='reversed' where id=(select referral_invite_id from public.growth_referral_conversions where id=p_conversion_id);
  return true;
end;
$$;

create or replace function public.record_growth_cohort_snapshot(p_snapshot_date date,p_source_name text,p_source_run_id text,p_payload_hash text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; run_row public.growth_cohort_ingestion_runs%rowtype; row_total integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into run_row from public.growth_cohort_ingestion_runs where source_run_id=trim(p_source_run_id);
  if run_row.id is not null then return jsonb_build_object('ingestion_run_id',run_row.id,'row_count',run_row.row_count,'idempotent',true); end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 10000 or p_snapshot_date>current_date then raise exception 'Cohort snapshot payload is invalid'; end if;
  row_total:=jsonb_array_length(p_rows);
  insert into public.growth_cohort_ingestion_runs(snapshot_date,source_name,source_run_id,payload_hash,row_count)
  values(p_snapshot_date,trim(p_source_name),trim(p_source_run_id),lower(trim(p_payload_hash)),row_total) returning * into run_row;
  for item in select value from jsonb_array_elements(p_rows) loop
    if not item ?& array['city_key','cohort_key','acquisition_channel','attributed_signups','verified_members','completed_profiles','activated_members','meaningful_conversations','accepted_dates','retained_week_8','reports','spend_cents','revenue_cents','contribution_margin_cents'] then raise exception 'Cohort snapshot row is incomplete'; end if;
    if (item->>'verified_members')::integer>(item->>'attributed_signups')::integer or (item->>'completed_profiles')::integer>(item->>'verified_members')::integer or (item->>'activated_members')::integer>(item->>'completed_profiles')::integer or (item->>'retained_week_8')::integer>(item->>'activated_members')::integer then raise exception 'Cohort funnel counts are inconsistent'; end if;
    insert into public.growth_daily_cohort_snapshots(snapshot_date,city_key,cohort_key,acquisition_channel,attributed_signups,verified_members,completed_profiles,activated_members,meaningful_conversations,accepted_dates,retained_week_8,reports,spend_cents,revenue_cents,contribution_margin_cents)
    values(p_snapshot_date,trim(item->>'city_key'),trim(item->>'cohort_key'),trim(item->>'acquisition_channel'),(item->>'attributed_signups')::integer,(item->>'verified_members')::integer,(item->>'completed_profiles')::integer,(item->>'activated_members')::integer,(item->>'meaningful_conversations')::integer,(item->>'accepted_dates')::integer,(item->>'retained_week_8')::integer,(item->>'reports')::integer,(item->>'spend_cents')::bigint,(item->>'revenue_cents')::bigint,(item->>'contribution_margin_cents')::bigint)
    on conflict(snapshot_date,city_key,cohort_key,acquisition_channel) do update set attributed_signups=excluded.attributed_signups,verified_members=excluded.verified_members,completed_profiles=excluded.completed_profiles,activated_members=excluded.activated_members,meaningful_conversations=excluded.meaningful_conversations,accepted_dates=excluded.accepted_dates,retained_week_8=excluded.retained_week_8,reports=excluded.reports,spend_cents=excluded.spend_cents,revenue_cents=excluded.revenue_cents,contribution_margin_cents=excluded.contribution_margin_cents;
  end loop;
  return jsonb_build_object('ingestion_run_id',run_row.id,'row_count',row_total);
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
  return true;
end;
$$;

revoke all on public.growth_campaigns,public.growth_experiment_approvals,public.growth_experiment_metric_snapshots,public.growth_experiment_decisions,public.growth_referral_risk_reviews,public.growth_cohort_ingestion_runs from public,anon,authenticated;
revoke all on function public.growth_outcome_is_verified(uuid,text) from public,anon,authenticated;
revoke all on function public.enforce_growth_experiment_controls() from public,anon,authenticated;
revoke all on function public.start_growth_experiment(text,numeric,timestamptz,text) from public,anon,authenticated;
revoke all on function public.record_growth_experiment_exposure(text,text) from public,anon,authenticated;
revoke all on function public.record_growth_experiment_metric_snapshot(text,text,integer,numeric,numeric,numeric,numeric,jsonb) from public,anon,authenticated;
revoke all on function public.decide_growth_experiment(text,text,uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.review_growth_referral_risk(uuid,uuid,text,boolean,boolean,boolean,text,text,text) from public,anon,authenticated;
revoke all on function public.reverse_growth_referral_reward(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.record_growth_cohort_snapshot(date,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.withdraw_growth_analytics_consent() from public,anon,authenticated;
grant execute on function public.record_growth_experiment_exposure(text,text) to authenticated;
grant execute on function public.withdraw_growth_analytics_consent() to authenticated;
grant execute on function public.start_growth_experiment(text,numeric,timestamptz,text) to service_role;
grant execute on function public.record_growth_experiment_metric_snapshot(text,text,integer,numeric,numeric,numeric,numeric,jsonb) to service_role;
grant execute on function public.decide_growth_experiment(text,text,uuid,text,uuid,text) to service_role;
grant execute on function public.review_growth_referral_risk(uuid,uuid,text,boolean,boolean,boolean,text,text,text) to service_role;
grant execute on function public.reverse_growth_referral_reward(uuid,uuid,text,text) to service_role;
grant execute on function public.record_growth_cohort_snapshot(date,text,text,text,jsonb) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v28','schema_version',28,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from (select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from (select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
