-- Missing product-state contracts: exact onboarding resume, completion reminders,
-- and respectful date cancellation/no-show/unresponsive handling.

alter table public.profiles
  add column if not exists onboarding_step text not null default 'welcome'
    check (onboarding_step in ('welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup','vibes','intent','alignment','complete')),
  add column if not exists profile_reminder_shown_at timestamptz;

alter table public.date_proposals
  drop constraint if exists date_proposals_status_check;

alter table public.date_proposals
  add constraint date_proposals_status_check
  check (status in ('pending','accepted','declined','countered','completed','cancelled','no_show','unresponsive'));

create table if not exists public.date_plan_events (
  id uuid primary key default gen_random_uuid(),
  date_proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

alter table public.date_plan_events enable row level security;

drop policy if exists "participants view date plan events" on public.date_plan_events;
create policy "participants view date plan events"
on public.date_plan_events for select to authenticated
using (exists(
  select 1 from public.date_proposals dp
  join public.matches m on m.id=dp.match_id
  where dp.id=date_proposal_id and (select auth.uid()) in (m.user_a,m.user_b)
));

create or replace function public.update_date_proposal_lifecycle(
  p_date_proposal_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  viewer uuid:=auth.uid();
  proposal_record public.date_proposals%rowtype;
  previous_status text;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if p_status not in ('cancelled','no_show','unresponsive') then raise exception 'Invalid date status.'; end if;

  select dp.* into proposal_record
  from public.date_proposals dp
  join public.matches m on m.id=dp.match_id
  where dp.id=p_date_proposal_id and m.status='mutual' and viewer in (m.user_a,m.user_b)
  for update of dp;
  if not found then raise exception 'Date proposal not found.'; end if;

  previous_status:=proposal_record.status;
  if p_status='no_show' and proposal_record.status<>'accepted' then raise exception 'Only an accepted date can be marked no-show.'; end if;
  if p_status='unresponsive' and proposal_record.status not in ('pending','countered','accepted') then raise exception 'This plan cannot be marked unresponsive.'; end if;
  if p_status='cancelled' and proposal_record.status in ('completed','declined','cancelled') then raise exception 'This plan cannot be cancelled.'; end if;

  update public.date_proposals set status=p_status,responded_by=viewer,responded_at=now()
  where id=p_date_proposal_id returning * into proposal_record;
  insert into public.date_plan_events(date_proposal_id,actor_id,from_status,to_status)
  values(p_date_proposal_id,viewer,previous_status,p_status);
  return jsonb_build_object('id',proposal_record.id,'status',proposal_record.status,'responded_at',proposal_record.responded_at);
end;
$$;

revoke all on table public.date_plan_events from public,anon;
grant select on table public.date_plan_events to authenticated;
revoke all on function public.update_date_proposal_lifecycle(uuid,text) from public,anon;
grant execute on function public.update_date_proposal_lifecycle(uuid,text) to authenticated;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v33','schema_version',33,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from(select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from(select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;

revoke all on function public.get_backend_deployment_manifest() from public,anon,authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
