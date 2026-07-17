-- Authoritative city-density ingestion, privacy suppression, dual-approved
-- launch decisions, rollback, and discovery enforcement.
create table if not exists public.city_metric_runs (
  id uuid primary key default gen_random_uuid(),
  city_key text not null references public.city_launch_markets(city_key) on delete restrict,
  snapshot_week date not null,
  source_name text not null check (char_length(source_name) between 3 and 80),
  source_job_id text not null check (char_length(source_job_id) between 8 and 160),
  consent_policy_version text not null check (char_length(consent_policy_version) between 3 and 80),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 160),
  cohort_count integer not null default 0 check (cohort_count between 0 and 100),
  status text not null default 'accepted' check (status in ('accepted','rejected')),
  recorded_at timestamptz not null default now(),
  unique(source_name,source_job_id)
);

create table if not exists public.city_ops_reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  role text not null check (role in ('growth_lead','safety_lead','executive')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_expansion_decisions (
  id uuid primary key default gen_random_uuid(),
  city_key text not null references public.city_launch_markets(city_key) on delete restrict,
  from_state text not null check (from_state in ('waitlist_only','controlled_pilot','healthy_pilot','open')),
  to_state text not null check (to_state in ('waitlist_only','controlled_pilot','healthy_pilot','open')),
  evidence_snapshot_week date,
  primary_reviewer_id uuid not null references public.city_ops_reviewers(id) on delete restrict,
  secondary_reviewer_id uuid not null references public.city_ops_reviewers(id) on delete restrict,
  reason text not null check (char_length(reason) between 20 and 1000),
  decision_status text not null check (decision_status in ('applied','rolled_back')),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 160),
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (primary_reviewer_id <> secondary_reviewer_id),
  check (from_state <> to_state)
);
create index if not exists city_expansion_decisions_timeline_idx
  on public.city_expansion_decisions(city_key,created_at desc);

alter table public.city_metric_runs enable row level security;
alter table public.city_ops_reviewers enable row level security;
alter table public.city_expansion_decisions enable row level security;

create or replace function public.record_city_density_week(
  p_city_key text,
  p_snapshot_week date,
  p_metrics jsonb,
  p_cohorts jsonb,
  p_source_name text,
  p_source_job_id text,
  p_consent_policy_version text,
  p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare normalized_city text:=lower(trim(coalesce(p_city_key,''))); run_row public.city_metric_runs%rowtype;
  cohort jsonb; cohort_total integer; healthy_weeks integer:=0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.city_launch_markets where city_key=normalized_city) then raise exception 'Unsupported launch market'; end if;
  if p_snapshot_week>current_date or p_snapshot_week<current_date-21 or extract(isodow from p_snapshot_week)<>1 then raise exception 'Snapshot week must be a recent Monday'; end if;
  if jsonb_typeof(p_metrics)<>'object' or jsonb_typeof(p_cohorts)<>'array' then raise exception 'City metrics payload is invalid'; end if;
  if exists(select 1 from jsonb_object_keys(p_metrics) key where key not in(
    'verified_active_members','cohort_floor_percent','median_eligible_candidates','qualified_introductions_per_active',
    'reply_rate_percent','meaningful_conversation_rate_percent','accepted_date_rate_percent',
    'eight_week_retention_percent','safety_incidents_per_100_dates','waitlist_members','active_ambassadors','monthly_event_seats'
  )) then raise exception 'Unsupported city metric'; end if;
  if not p_metrics ?& array['verified_active_members','cohort_floor_percent','median_eligible_candidates','qualified_introductions_per_active','reply_rate_percent','meaningful_conversation_rate_percent','accepted_date_rate_percent','eight_week_retention_percent','safety_incidents_per_100_dates'] then raise exception 'Required city metrics are missing'; end if;
  cohort_total:=jsonb_array_length(p_cohorts);
  if cohort_total>100 then raise exception 'Too many city cohorts'; end if;
  if char_length(trim(coalesce(p_source_name,''))) not between 3 and 80
     or char_length(trim(coalesce(p_source_job_id,''))) not between 8 and 160
     or char_length(trim(coalesce(p_consent_policy_version,''))) not between 3 and 80
     or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Metric provenance is invalid'; end if;
  if exists(select 1 from public.city_metric_runs where idempotency_key=trim(p_idempotency_key)) then
    select * into run_row from public.city_metric_runs where idempotency_key=trim(p_idempotency_key);
    return jsonb_build_object('run_id',run_row.id,'city_key',run_row.city_key,'snapshot_week',run_row.snapshot_week,'idempotent',true);
  end if;

  insert into public.city_metric_runs(city_key,snapshot_week,source_name,source_job_id,consent_policy_version,idempotency_key,cohort_count)
  values(normalized_city,p_snapshot_week,trim(p_source_name),trim(p_source_job_id),trim(p_consent_policy_version),trim(p_idempotency_key),cohort_total)
  returning * into run_row;
  insert into public.city_liquidity_snapshots(
    city_key,snapshot_week,verified_active_members,cohort_floor_percent,median_eligible_candidates,
    qualified_introductions_per_active,reply_rate_percent,meaningful_conversation_rate_percent,
    accepted_date_rate_percent,eight_week_retention_percent,safety_incidents_per_100_dates,
    waitlist_members,active_ambassadors,monthly_event_seats,consecutive_healthy_weeks
  ) values (
    normalized_city,p_snapshot_week,(p_metrics->>'verified_active_members')::integer,(p_metrics->>'cohort_floor_percent')::numeric,
    (p_metrics->>'median_eligible_candidates')::numeric,(p_metrics->>'qualified_introductions_per_active')::numeric,
    (p_metrics->>'reply_rate_percent')::numeric,(p_metrics->>'meaningful_conversation_rate_percent')::numeric,
    (p_metrics->>'accepted_date_rate_percent')::numeric,(p_metrics->>'eight_week_retention_percent')::numeric,
    (p_metrics->>'safety_incidents_per_100_dates')::numeric,coalesce((p_metrics->>'waitlist_members')::integer,0),
    coalesce((p_metrics->>'active_ambassadors')::integer,0),coalesce((p_metrics->>'monthly_event_seats')::integer,0),0
  ) on conflict(city_key,snapshot_week) do update set
    verified_active_members=excluded.verified_active_members,cohort_floor_percent=excluded.cohort_floor_percent,
    median_eligible_candidates=excluded.median_eligible_candidates,qualified_introductions_per_active=excluded.qualified_introductions_per_active,
    reply_rate_percent=excluded.reply_rate_percent,meaningful_conversation_rate_percent=excluded.meaningful_conversation_rate_percent,
    accepted_date_rate_percent=excluded.accepted_date_rate_percent,eight_week_retention_percent=excluded.eight_week_retention_percent,
    safety_incidents_per_100_dates=excluded.safety_incidents_per_100_dates,waitlist_members=excluded.waitlist_members,
    active_ambassadors=excluded.active_ambassadors,monthly_event_seats=excluded.monthly_event_seats,generated_at=now();

  delete from public.city_cohort_snapshots where city_key=normalized_city and snapshot_week=p_snapshot_week;
  for cohort in select value from jsonb_array_elements(p_cohorts) loop
    if jsonb_typeof(cohort)<>'object' or not cohort ?& array['cohort_key','eligible_active_members','median_reciprocal_candidates','qualified_introductions'] then raise exception 'Cohort metric is invalid'; end if;
    if (cohort->>'eligible_active_members')::integer<0 or (cohort->>'median_reciprocal_candidates')::numeric<0 or (cohort->>'qualified_introductions')::integer<0 then raise exception 'Cohort metrics cannot be negative'; end if;
    insert into public.city_cohort_snapshots(city_key,snapshot_week,cohort_key,eligible_active_members,median_reciprocal_candidates,qualified_introductions,suppressed)
    values(normalized_city,p_snapshot_week,trim(cohort->>'cohort_key'),
      case when (cohort->>'eligible_active_members')::integer<20 then 0 else (cohort->>'eligible_active_members')::integer end,
      case when (cohort->>'eligible_active_members')::integer<20 then 0 else (cohort->>'median_reciprocal_candidates')::numeric end,
      case when (cohort->>'eligible_active_members')::integer<20 then 0 else (cohort->>'qualified_introductions')::integer end,
      (cohort->>'eligible_active_members')::integer<20);
  end loop;

  select case when count(*)>0 and bool_and(
      verified_active_members>=50 and cohort_floor_percent>=20 and median_eligible_candidates>=15
      and qualified_introductions_per_active>=3 and reply_rate_percent>=45
      and meaningful_conversation_rate_percent>=25 and accepted_date_rate_percent>=8
      and eight_week_retention_percent>=35 and safety_incidents_per_100_dates<=1.5
    ) then count(*) else 0 end into healthy_weeks
  from (select * from public.city_liquidity_snapshots where city_key=normalized_city order by snapshot_week desc limit 8) recent;
  update public.city_liquidity_snapshots set consecutive_healthy_weeks=healthy_weeks where city_key=normalized_city and snapshot_week=p_snapshot_week;
  return jsonb_build_object('run_id',run_row.id,'city_key',normalized_city,'snapshot_week',p_snapshot_week,'cohorts',cohort_total,'healthy_weeks',healthy_weeks,'idempotent',false);
end;
$$;

create or replace function public.evaluate_city_expansion(p_city_key text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare normalized_city text:=lower(trim(coalesce(p_city_key,''))); latest public.city_liquidity_snapshots%rowtype;
  target_goal integer; recent_count integer:=0; healthy_count integer:=0; week_span integer:=0; gate_count integer:=0; expansion_ready boolean:=false;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select verified_active_goal into target_goal from public.city_launch_markets where city_key=normalized_city;
  if target_goal is null then raise exception 'Unsupported launch market'; end if;
  select * into latest from public.city_liquidity_snapshots where city_key=normalized_city order by snapshot_week desc limit 1;
  if latest.id is null then return jsonb_build_object('city_key',normalized_city,'expansion_ready',false,'gate_count',0,'healthy_weeks',0,'reason','No weekly measurement exists'); end if;
  gate_count:=(latest.verified_active_members>=target_goal)::integer+(latest.cohort_floor_percent>=20)::integer
    +(latest.median_eligible_candidates>=15 and latest.qualified_introductions_per_active>=3)::integer
    +(latest.reply_rate_percent>=45 and latest.meaningful_conversation_rate_percent>=25 and latest.accepted_date_rate_percent>=8)::integer
    +(latest.eight_week_retention_percent>=35)::integer+(latest.safety_incidents_per_100_dates<=1.5)::integer;
  select count(*),count(*) filter(where healthy),coalesce(max(snapshot_week)-min(snapshot_week),0)
    into recent_count,healthy_count,week_span
  from (select snapshot_week,
      verified_active_members>=target_goal and cohort_floor_percent>=20 and median_eligible_candidates>=15
      and qualified_introductions_per_active>=3 and reply_rate_percent>=45
      and meaningful_conversation_rate_percent>=25 and accepted_date_rate_percent>=8
      and eight_week_retention_percent>=35 and safety_incidents_per_100_dates<=1.5 healthy
    from public.city_liquidity_snapshots where city_key=normalized_city order by snapshot_week desc limit 8) recent;
  expansion_ready:=gate_count=6 and recent_count=8 and healthy_count=8 and week_span=49 and latest.snapshot_week>=current_date-10;
  return jsonb_build_object('city_key',normalized_city,'snapshot_week',latest.snapshot_week,'verified_active_members',latest.verified_active_members,
    'cohort_floor_percent',latest.cohort_floor_percent,'safety_incidents_per_100_dates',latest.safety_incidents_per_100_dates,
    'gate_count',gate_count,'healthy_weeks',healthy_count,'consecutive_span_days',week_span,'fresh',latest.snapshot_week>=current_date-10,'expansion_ready',expansion_ready);
end;
$$;

create or replace function public.apply_city_discovery_decision(
  p_city_key text,p_to_state text,p_primary_reviewer_id uuid,p_secondary_reviewer_id uuid,p_reason text,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare normalized_city text:=lower(trim(coalesce(p_city_key,''))); market_row public.city_launch_markets%rowtype;
  primary_row public.city_ops_reviewers%rowtype; secondary_row public.city_ops_reviewers%rowtype; evaluation jsonb;
  from_rank integer; to_rank integer; decision_status text; decision_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_primary_reviewer_id=p_secondary_reviewer_id then raise exception 'Two distinct reviewers are required'; end if;
  select * into primary_row from public.city_ops_reviewers where id=p_primary_reviewer_id and status='active';
  select * into secondary_row from public.city_ops_reviewers where id=p_secondary_reviewer_id and status='active';
  if primary_row.id is null or secondary_row.id is null then raise exception 'Two active reviewers are required'; end if;
  if primary_row.role<>'safety_lead' and secondary_row.role<>'safety_lead' then raise exception 'Safety lead approval is required'; end if;
  if p_to_state not in('waitlist_only','controlled_pilot','healthy_pilot','open') then raise exception 'Unsupported discovery state'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 1000 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Decision audit details are invalid'; end if;
  if exists(select 1 from public.city_expansion_decisions where idempotency_key=trim(p_idempotency_key)) then
    return (select jsonb_build_object('decision_id',id,'city_key',city_key,'state',to_state,'idempotent',true) from public.city_expansion_decisions where idempotency_key=trim(p_idempotency_key));
  end if;
  select * into market_row from public.city_launch_markets where city_key=normalized_city for update;
  if market_row.city_key is null then raise exception 'Unsupported launch market'; end if;
  if market_row.discovery_state=p_to_state then raise exception 'City is already in that state'; end if;
  from_rank:=array_position(array['waitlist_only','controlled_pilot','healthy_pilot','open'],market_row.discovery_state);
  to_rank:=array_position(array['waitlist_only','controlled_pilot','healthy_pilot','open'],p_to_state);
  if to_rank>from_rank+1 then raise exception 'Discovery states cannot be skipped'; end if;
  evaluation:=public.evaluate_city_expansion(normalized_city);
  if to_rank>from_rank and evaluation->>'snapshot_week' is null then raise exception 'Current city evidence is required'; end if;
  if to_rank>from_rank and p_to_state='controlled_pilot' and ((evaluation->>'verified_active_members')::integer<50 or (evaluation->>'cohort_floor_percent')::numeric<20 or (evaluation->>'safety_incidents_per_100_dates')::numeric>1.5) then raise exception 'Controlled pilot evidence is insufficient'; end if;
  if to_rank>from_rank and p_to_state='healthy_pilot' and ((evaluation->>'gate_count')::integer<6 or (evaluation->>'healthy_weeks')::integer<4) then raise exception 'Healthy pilot evidence is insufficient'; end if;
  if to_rank>from_rank and p_to_state='open' and coalesce((evaluation->>'expansion_ready')::boolean,false)=false then raise exception 'Eight consecutive healthy weeks are required'; end if;
  decision_status:=case when to_rank<from_rank then 'rolled_back' else 'applied' end;
  update public.city_launch_markets set discovery_state=p_to_state,updated_at=now() where city_key=normalized_city;
  insert into public.city_expansion_decisions(city_key,from_state,to_state,evidence_snapshot_week,primary_reviewer_id,secondary_reviewer_id,reason,decision_status,idempotency_key,evidence)
  values(normalized_city,market_row.discovery_state,p_to_state,(evaluation->>'snapshot_week')::date,p_primary_reviewer_id,p_secondary_reviewer_id,trim(p_reason),decision_status,trim(p_idempotency_key),evaluation)
  returning id into decision_id;
  return jsonb_build_object('decision_id',decision_id,'city_key',normalized_city,'state',p_to_state,'decision_status',decision_status,'idempotent',false);
end;
$$;

create or replace function public.city_key_for_profile_city(p_city text)
returns text language sql immutable set search_path=public as $$
  select case
    when lower(p_city) similar to '%(new york|jersey city|brooklyn|queens)%' then 'nyc'
    when lower(p_city) similar to '%(san francisco|san jose|oakland|palo alto)%' then 'bay_area'
    when lower(p_city) similar to '%(dallas|plano|frisco|irving)%' then 'dallas'
    when lower(p_city) similar to '%(toronto|brampton|mississauga|markham|vaughan)%' then 'toronto'
    when lower(p_city) similar to '%(chicago|naperville|schaumburg)%' then 'chicago'
    else null end;
$$;

create or replace function public.city_discovery_pair_allowed(p_viewer uuid,p_candidate uuid)
returns boolean language sql stable security definer set search_path=public as $$
  with pair as (
    select public.city_key_for_profile_city(v.city) viewer_city,public.city_key_for_profile_city(c.city) candidate_city
    from public.profiles v join public.profiles c on c.id=p_candidate where v.id=p_viewer
  )
  select pair.viewer_city is not null and pair.viewer_city=pair.candidate_city and exists(
    select 1 from public.city_launch_markets market where market.city_key=pair.viewer_city
      and (market.discovery_state='open' or (
        market.discovery_state in('controlled_pilot','healthy_pilot')
        and exists(select 1 from public.city_waitlist_entries w where w.user_id=p_viewer and w.city_key=pair.viewer_city and w.status='activated')
        and exists(select 1 from public.city_waitlist_entries w where w.user_id=p_candidate and w.city_key=pair.candidate_city and w.status='activated')
      ))
  ) from pair;
$$;

alter function public.matching_candidate_eligible(uuid,uuid) rename to matching_candidate_eligible_without_city_gate;
create function public.matching_candidate_eligible(viewer uuid,candidate uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.city_discovery_pair_allowed(viewer,candidate)
    and public.matching_candidate_eligible_without_city_gate(viewer,candidate);
$$;

revoke all on public.city_metric_runs,public.city_ops_reviewers,public.city_expansion_decisions from public,anon,authenticated;
revoke all on function public.record_city_density_week(text,date,jsonb,jsonb,text,text,text,text) from public,anon,authenticated;
revoke all on function public.evaluate_city_expansion(text) from public,anon,authenticated;
revoke all on function public.apply_city_discovery_decision(text,text,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.city_key_for_profile_city(text) from public,anon,authenticated;
revoke all on function public.city_discovery_pair_allowed(uuid,uuid) from public,anon,authenticated;
revoke all on function public.matching_candidate_eligible_without_city_gate(uuid,uuid) from public,anon,authenticated;
revoke all on function public.matching_candidate_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_city_density_week(text,date,jsonb,jsonb,text,text,text,text) to service_role;
grant execute on function public.evaluate_city_expansion(text) to service_role;
grant execute on function public.apply_city_discovery_decision(text,text,uuid,uuid,text,text) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v26','schema_version',26,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from (
      select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname
      where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity
        and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL')
        and policy.roles && array['public','anon']::name[]
    ) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from (
      select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
    ) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
