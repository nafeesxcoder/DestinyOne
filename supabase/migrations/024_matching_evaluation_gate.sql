-- Require measurable offline and shadow evidence before a matching model can be
-- promoted. Evaluation payloads are aggregate-only and service-role owned.
alter table public.matching_model_guardrails
  add column if not exists minimum_precision_at_5 numeric(6,5) not null default 0.65
    check (minimum_precision_at_5 between 0 and 1),
  add column if not exists minimum_eligible_coverage_rate numeric(6,5) not null default 0.50
    check (minimum_eligible_coverage_rate between 0 and 1),
  add column if not exists minimum_safety_exclusion_recall numeric(6,5) not null default 1.00
    check (minimum_safety_exclusion_recall between 0 and 1);

create table if not exists public.matching_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  model_version text not null references public.matching_model_versions(version) on delete cascade,
  dataset_version text not null check (char_length(dataset_version) between 8 and 120),
  evaluation_kind text not null check (evaluation_kind in ('offline', 'shadow')),
  sample_size integer not null check (sample_size >= 100),
  metrics jsonb not null,
  status text not null check (status in ('passed', 'failed')),
  approved_by_role text not null check (char_length(approved_by_role) between 3 and 80),
  change_ticket text not null check (char_length(change_ticket) between 3 and 120),
  created_at timestamptz not null default now(),
  unique (model_version, dataset_version, evaluation_kind, change_ticket)
);
alter table public.matching_evaluation_runs enable row level security;

alter table public.matching_model_events drop constraint if exists matching_model_events_action_check;
alter table public.matching_model_events add constraint matching_model_events_action_check
  check(action in('activated','quality_snapshot','rollback','evaluation'));

create or replace function public.record_matching_evaluation(
  p_model_version text,
  p_dataset_version text,
  p_evaluation_kind text,
  p_sample_size integer,
  p_metrics jsonb,
  p_approved_by_role text,
  p_change_ticket text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare guard public.matching_model_guardrails%rowtype; evaluation_status text; run_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into guard from public.matching_model_guardrails where model_version=trim(coalesce(p_model_version,''));
  if guard.model_version is null then raise exception 'Matching model guardrails are unavailable'; end if;
  if p_evaluation_kind not in('offline','shadow')
     or p_sample_size<100
     or char_length(trim(coalesce(p_dataset_version,''))) not between 8 and 120
     or char_length(trim(coalesce(p_approved_by_role,''))) not between 3 and 80
     or char_length(trim(coalesce(p_change_ticket,''))) not between 3 and 120 then
    raise exception 'Matching evaluation metadata is invalid';
  end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or not (p_metrics ?& array['precision_at_5','eligible_coverage_rate','safety_exclusion_recall','max_group_exposure_gap'])
     or exists(select 1 from jsonb_object_keys(p_metrics) key where key not in(
       'precision_at_5','eligible_coverage_rate','safety_exclusion_recall','max_group_exposure_gap','score_drift'
     ))
     or exists(select 1 from jsonb_each(p_metrics) metric where jsonb_typeof(metric.value)<>'number')
     or exists(select 1 from jsonb_each(p_metrics) metric where (metric.value#>>'{}')::numeric not between 0 and 1) then
    raise exception 'Matching evaluation metrics are invalid';
  end if;

  evaluation_status:=case when
    p_sample_size>=guard.minimum_recommendations
    and (p_metrics->>'precision_at_5')::numeric>=guard.minimum_precision_at_5
    and (p_metrics->>'eligible_coverage_rate')::numeric>=guard.minimum_eligible_coverage_rate
    and (p_metrics->>'safety_exclusion_recall')::numeric>=guard.minimum_safety_exclusion_recall
    and (p_metrics->>'max_group_exposure_gap')::numeric<=guard.maximum_exposure_gap
    then 'passed' else 'failed' end;

  insert into public.matching_evaluation_runs(
    model_version,dataset_version,evaluation_kind,sample_size,metrics,status,approved_by_role,change_ticket
  ) values (
    guard.model_version,trim(p_dataset_version),p_evaluation_kind,p_sample_size,p_metrics,evaluation_status,
    trim(p_approved_by_role),trim(p_change_ticket)
  ) returning id into run_id;
  insert into public.matching_model_events(model_version,action,metrics)
  values(guard.model_version,'evaluation',jsonb_build_object(
    'evaluation_id',run_id,'dataset_version',trim(p_dataset_version),'evaluation_kind',p_evaluation_kind,
    'sample_size',p_sample_size,'status',evaluation_status,'change_ticket',trim(p_change_ticket)
  ));
  return jsonb_build_object('evaluation_id',run_id,'model_version',guard.model_version,'status',evaluation_status);
end;
$$;

create or replace function public.activate_matching_model(p_version text,p_metrics jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare passed_evaluation_kinds integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.matching_model_versions where version=p_version) then raise exception 'Matching model was not found'; end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or exists(select 1 from jsonb_object_keys(coalesce(p_metrics,'{}'::jsonb)) key where key not in('reason','rollback_from','approved_by_role','change_ticket'))
     or nullif(trim(p_metrics->>'reason'),'') is null
     or nullif(trim(p_metrics->>'approved_by_role'),'') is null
     or nullif(trim(p_metrics->>'change_ticket'),'') is null then
    raise exception 'Activation audit metrics are invalid';
  end if;
  select count(distinct evaluation_kind) into passed_evaluation_kinds
  from public.matching_evaluation_runs
  where model_version=p_version
    and status='passed'
    and evaluation_kind in('offline','shadow')
    and change_ticket=trim(p_metrics->>'change_ticket')
    and created_at>=now()-interval '14 days';
  if passed_evaluation_kinds<>2 then raise exception 'Recent passing offline and shadow evaluations are required'; end if;
  update public.matching_model_versions set status='retired' where status='active';
  update public.matching_model_versions set status='active',activated_at=now() where version=p_version;
  insert into public.matching_model_events(model_version,action,metrics) values(p_version,'activated',p_metrics);
end;
$$;

revoke all on public.matching_evaluation_runs from public,anon,authenticated;
revoke all on function public.record_matching_evaluation(text,text,text,integer,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.activate_matching_model(text,jsonb) from public,anon,authenticated;
grant execute on function public.record_matching_evaluation(text,text,text,integer,jsonb,text,text) to service_role;
grant execute on function public.activate_matching_model(text,jsonb) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'contract_id', 'destinyone-backend-v24',
    'schema_version', 24,
    'tables', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
    ), '[]'::jsonb),
    'functions', coalesce((
      select jsonb_agg(names.proname order by names.proname) from (
        select distinct p.proname from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      ) names
    ), '[]'::jsonb),
    'rls_disabled_tables', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    ), '[]'::jsonb),
    'anonymous_table_exposures', coalesce((
      select jsonb_agg(exposure.table_name order by exposure.table_name) from (
        select distinct c.relname as table_name
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_policies policy on policy.schemaname = n.nspname and policy.tablename = c.relname
        where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
          and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
          and policy.cmd in ('SELECT', 'ALL') and policy.roles && array['public', 'anon']::name[]
      ) exposure
    ), '[]'::jsonb),
    'anonymous_rpc_exposures', coalesce((
      select jsonb_agg(exposure.function_name order by exposure.function_name) from (
        select distinct p.proname as function_name from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      ) exposure
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
