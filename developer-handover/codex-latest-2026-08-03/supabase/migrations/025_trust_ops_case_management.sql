-- Staffed Trust Ops case lifecycle: report intake, reviewer ownership, bounded
-- enforcement, immutable events, and member appeals. No staff credential or
-- moderation evidence is exposed to the member app.
create table if not exists public.trust_ops_reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  role text not null check (role in ('reviewer','lead','legal')),
  status text not null default 'active' check (status in ('active','inactive')),
  regions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete restrict,
  subject_id uuid not null references public.profiles(id) on delete restrict,
  category text not null check (category in ('identity','harassment','money_scam','unsafe_meeting','content','support')),
  severity text not null check (severity in ('normal','high','critical')),
  priority integer not null check (priority between 0 and 100),
  status text not null default 'new' check (status in ('new','triage','frozen','escalated','resolved','dismissed')),
  assigned_reviewer_id uuid references public.trust_ops_reviewers(id) on delete set null,
  sla_due_at timestamptz not null,
  evidence_hold_until timestamptz not null,
  member_notice_status text not null default 'pending' check (member_notice_status in ('pending','sent','not_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists moderation_cases_queue_idx
  on public.moderation_cases(status, severity, priority desc, sla_due_at)
  where status not in ('resolved','dismissed');

create table if not exists public.moderation_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('system','reviewer','member')),
  actor_id uuid,
  action text not null check (action in ('case_created','claimed','frozen','escalated','resolved','dismissed','reopened','appeal_submitted','appeal_upheld','appeal_overturned')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 160),
  note text check (note is null or char_length(note) between 8 and 1000),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(case_id,idempotency_key)
);
create index if not exists moderation_case_events_timeline_idx
  on public.moderation_case_events(case_id,created_at);

create table if not exists public.member_enforcement_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  discovery_frozen boolean not null default false,
  chat_frozen boolean not null default false,
  gifts_frozen boolean not null default false,
  payments_frozen boolean not null default false,
  dates_frozen boolean not null default false,
  reason_case_id uuid references public.moderation_cases(id) on delete set null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete restrict,
  appellant_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 20 and 2000),
  client_action_id text not null check (char_length(client_action_id) between 8 and 120),
  status text not null default 'submitted' check (status in ('submitted','reviewing','upheld','overturned')),
  reviewer_id uuid references public.trust_ops_reviewers(id) on delete set null,
  decision_note text check (decision_note is null or char_length(decision_note) between 8 and 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(case_id,appellant_id),
  unique(appellant_id,client_action_id)
);

alter table public.trust_ops_reviewers enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_case_events enable row level security;
alter table public.member_enforcement_states enable row level security;
alter table public.moderation_appeals enable row level security;

create or replace function public.create_moderation_case_from_report()
returns trigger language plpgsql security definer set search_path=public as $$
declare case_row public.moderation_cases%rowtype; case_category text;
begin
  case_category:=case new.reason
    when 'Fake or misleading profile' then 'identity'
    when 'Harassment or disrespect' then 'harassment'
    when 'Asked for money' then 'money_scam'
    when 'Inappropriate content' then 'content'
    when 'Safety concern' then 'unsafe_meeting'
    else 'support' end;
  insert into public.moderation_cases(
    report_id,subject_id,category,severity,priority,sla_due_at,evidence_hold_until
  ) values (
    new.id,new.reported_id,case_category,new.severity,
    case new.severity when 'critical' then 100 when 'high' then 70 else 30 end,
    coalesce(new.triage_due_at,now()+interval '24 hours'),
    now()+case when new.severity in('critical','high') then interval '180 days' else interval '90 days' end
  ) returning * into case_row;
  insert into public.moderation_case_events(case_id,actor_kind,actor_id,action,idempotency_key,metadata)
  values(case_row.id,'system',new.reporter_id,'case_created','report:'||new.id::text,
    jsonb_build_object('report_id',new.id,'severity',new.severity,'category',case_category));
  return new;
end;
$$;

drop trigger if exists reports_create_moderation_case on public.reports;
create trigger reports_create_moderation_case
after insert on public.reports for each row execute function public.create_moderation_case_from_report();

create or replace function public.enforce_member_surface_freeze()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor_id uuid; surface text:=tg_argv[1]; blocked boolean:=false;
begin
  actor_id:=nullif(to_jsonb(new)->>tg_argv[0],'')::uuid;
  if actor_id is null then return new; end if;
  select case surface
    when 'discovery' then discovery_frozen
    when 'chat' then chat_frozen
    when 'gifts' then gifts_frozen
    when 'payments' then payments_frozen
    when 'dates' then dates_frozen
    else false end into blocked
  from public.member_enforcement_states
  where user_id=actor_id and (expires_at is null or expires_at>now());
  if coalesce(blocked,false) then raise exception 'This action is temporarily unavailable while a safety review is in progress'; end if;
  return new;
end;
$$;

drop trigger if exists messages_enforce_safety_freeze on public.messages;
create trigger messages_enforce_safety_freeze before insert on public.messages
for each row execute function public.enforce_member_surface_freeze('sender_id','chat');
drop trigger if exists likes_enforce_safety_freeze on public.likes;
create trigger likes_enforce_safety_freeze before insert on public.likes
for each row execute function public.enforce_member_surface_freeze('sender_id','discovery');
drop trigger if exists gifts_enforce_safety_freeze on public.gifts;
create trigger gifts_enforce_safety_freeze before insert on public.gifts
for each row execute function public.enforce_member_surface_freeze('sender_id','gifts');
drop trigger if exists gift_orders_enforce_safety_freeze on public.gift_orders;
create trigger gift_orders_enforce_safety_freeze before insert on public.gift_orders
for each row execute function public.enforce_member_surface_freeze('sender_id','gifts');
drop trigger if exists date_proposals_enforce_safety_freeze on public.date_proposals;
create trigger date_proposals_enforce_safety_freeze before insert on public.date_proposals
for each row execute function public.enforce_member_surface_freeze('proposer_id','dates');
drop trigger if exists billing_sessions_enforce_safety_freeze on public.billing_purchase_sessions;
create trigger billing_sessions_enforce_safety_freeze before insert on public.billing_purchase_sessions
for each row execute function public.enforce_member_surface_freeze('user_id','payments');

create or replace function public.apply_moderation_action(
  p_case_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_note text,
  p_idempotency_key text,
  p_action_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare case_row public.moderation_cases%rowtype; reviewer_row public.trust_ops_reviewers%rowtype;
  normalized_note text:=trim(coalesce(p_note,'')); normalized_key text:=trim(coalesce(p_idempotency_key,''));
  scopes text[]; expiry_hours integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into reviewer_row from public.trust_ops_reviewers where id=p_reviewer_id and status='active';
  if reviewer_row.id is null then raise exception 'Active reviewer is required'; end if;
  if p_action not in('claim','freeze','escalate','resolve','dismiss','reopen') then raise exception 'Unsupported moderation action'; end if;
  if char_length(normalized_note) not between 8 and 1000 or char_length(normalized_key) not between 8 and 160 then raise exception 'Moderation audit details are invalid'; end if;
  if jsonb_typeof(coalesce(p_action_payload,'{}'::jsonb))<>'object'
     or exists(select 1 from jsonb_object_keys(coalesce(p_action_payload,'{}'::jsonb)) key where key not in('scopes','expiry_hours','member_notice_status')) then
    raise exception 'Moderation action payload is invalid';
  end if;
  select * into case_row from public.moderation_cases where id=p_case_id for update;
  if case_row.id is null then raise exception 'Moderation case was not found'; end if;
  if exists(select 1 from public.moderation_case_events where case_id=p_case_id and idempotency_key=normalized_key) then
    return jsonb_build_object('case_id',p_case_id,'status',case_row.status,'idempotent',true);
  end if;
  if case_row.severity='critical' and p_action in('resolve','dismiss') and reviewer_row.role not in('lead','legal') then
    raise exception 'Lead review is required for a critical case';
  end if;
  if p_action='freeze' then
    if jsonb_typeof(p_action_payload->'scopes')<>'array' then raise exception 'Freeze scopes are required'; end if;
    select coalesce(array_agg(value),array[]::text[]) into scopes from jsonb_array_elements_text(p_action_payload->'scopes');
    if cardinality(scopes)=0 or exists(select 1 from unnest(scopes) scope where scope not in('discovery','chat','gifts','payments','dates')) then raise exception 'Freeze scopes are invalid'; end if;
    expiry_hours:=coalesce((p_action_payload->>'expiry_hours')::integer,24);
    if expiry_hours not between 1 and 72 then raise exception 'Freeze expiry is invalid'; end if;
    insert into public.member_enforcement_states(user_id,reason_case_id,expires_at,discovery_frozen,chat_frozen,gifts_frozen,payments_frozen,dates_frozen)
    values(case_row.subject_id,case_row.id,now()+make_interval(hours=>expiry_hours),'discovery'=any(scopes),'chat'=any(scopes),'gifts'=any(scopes),'payments'=any(scopes),'dates'=any(scopes))
    on conflict(user_id) do update set
      reason_case_id=excluded.reason_case_id,expires_at=excluded.expires_at,
      discovery_frozen=public.member_enforcement_states.discovery_frozen or excluded.discovery_frozen,
      chat_frozen=public.member_enforcement_states.chat_frozen or excluded.chat_frozen,
      gifts_frozen=public.member_enforcement_states.gifts_frozen or excluded.gifts_frozen,
      payments_frozen=public.member_enforcement_states.payments_frozen or excluded.payments_frozen,
      dates_frozen=public.member_enforcement_states.dates_frozen or excluded.dates_frozen,updated_at=now();
  elsif p_action in('resolve','dismiss') then
    update public.member_enforcement_states set discovery_frozen=false,chat_frozen=false,gifts_frozen=false,payments_frozen=false,dates_frozen=false,expires_at=null,updated_at=now()
    where user_id=case_row.subject_id and reason_case_id=case_row.id;
  end if;
  update public.moderation_cases set
    status=case p_action when 'claim' then 'triage' when 'freeze' then 'frozen' when 'escalate' then 'escalated' when 'resolve' then 'resolved' when 'dismiss' then 'dismissed' else 'triage' end,
    assigned_reviewer_id=p_reviewer_id,
    member_notice_status=case when p_action_payload->>'member_notice_status' in('pending','sent','not_required') then p_action_payload->>'member_notice_status' else member_notice_status end,
    resolved_at=case when p_action in('resolve','dismiss') then now() else null end,updated_at=now()
  where id=p_case_id returning * into case_row;
  insert into public.moderation_case_events(case_id,actor_kind,actor_id,action,idempotency_key,note,metadata)
  values(p_case_id,'reviewer',p_reviewer_id,case p_action when 'claim' then 'claimed' when 'freeze' then 'frozen' when 'escalate' then 'escalated' when 'resolve' then 'resolved' when 'dismiss' then 'dismissed' else 'reopened' end,normalized_key,normalized_note,
    jsonb_build_object('scopes',coalesce(to_jsonb(scopes),'[]'::jsonb),'expiry_hours',expiry_hours));
  return jsonb_build_object('case_id',case_row.id,'status',case_row.status,'idempotent',false);
end;
$$;

create or replace function public.submit_moderation_appeal(p_case_id uuid,p_reason text,p_client_action_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); case_row public.moderation_cases%rowtype; appeal_row public.moderation_appeals%rowtype;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  select * into case_row from public.moderation_cases where id=p_case_id and subject_id=viewer;
  if case_row.id is null or case_row.status not in('frozen','resolved','dismissed') then raise exception 'This case is not eligible for appeal'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 2000 or char_length(trim(coalesce(p_client_action_id,''))) not between 8 and 120 then raise exception 'Appeal details are invalid'; end if;
  insert into public.moderation_appeals(case_id,appellant_id,reason,client_action_id)
  values(p_case_id,viewer,trim(p_reason),trim(p_client_action_id)) returning * into appeal_row;
  insert into public.moderation_case_events(case_id,actor_kind,actor_id,action,idempotency_key,metadata)
  values(p_case_id,'member',viewer,'appeal_submitted','appeal:'||appeal_row.id::text,jsonb_build_object('appeal_id',appeal_row.id));
  return jsonb_build_object('appeal_id',appeal_row.id,'status',appeal_row.status);
end;
$$;

create or replace function public.resolve_moderation_appeal(p_appeal_id uuid,p_decision text,p_reviewer_id uuid,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare appeal_row public.moderation_appeals%rowtype; reviewer_row public.trust_ops_reviewers%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into reviewer_row from public.trust_ops_reviewers where id=p_reviewer_id and status='active' and role in('lead','legal');
  if reviewer_row.id is null then raise exception 'Lead or legal reviewer is required'; end if;
  if p_decision not in('upheld','overturned') or char_length(trim(coalesce(p_note,''))) not between 8 and 1000 or char_length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Appeal decision is invalid'; end if;
  select * into appeal_row from public.moderation_appeals where id=p_appeal_id for update;
  if appeal_row.id is null then raise exception 'Appeal was not found'; end if;
  if appeal_row.status in('upheld','overturned') then return jsonb_build_object('appeal_id',appeal_row.id,'status',appeal_row.status,'idempotent',true); end if;
  update public.moderation_appeals set status=p_decision,reviewer_id=p_reviewer_id,decision_note=trim(p_note),resolved_at=now() where id=p_appeal_id returning * into appeal_row;
  if p_decision='overturned' then
    update public.moderation_cases set status='dismissed',assigned_reviewer_id=p_reviewer_id,resolved_at=now(),updated_at=now() where id=appeal_row.case_id;
    update public.member_enforcement_states set discovery_frozen=false,chat_frozen=false,gifts_frozen=false,payments_frozen=false,dates_frozen=false,expires_at=null,updated_at=now() where reason_case_id=appeal_row.case_id;
  end if;
  insert into public.moderation_case_events(case_id,actor_kind,actor_id,action,idempotency_key,note,metadata)
  values(appeal_row.case_id,'reviewer',p_reviewer_id,case when p_decision='upheld' then 'appeal_upheld' else 'appeal_overturned' end,trim(p_idempotency_key),trim(p_note),jsonb_build_object('appeal_id',appeal_row.id));
  return jsonb_build_object('appeal_id',appeal_row.id,'status',appeal_row.status,'idempotent',false);
end;
$$;

revoke all on public.trust_ops_reviewers,public.moderation_cases,public.moderation_case_events,public.member_enforcement_states,public.moderation_appeals from public,anon,authenticated;
revoke all on function public.create_moderation_case_from_report() from public,anon,authenticated;
revoke all on function public.enforce_member_surface_freeze() from public,anon,authenticated;
revoke all on function public.apply_moderation_action(uuid,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.submit_moderation_appeal(uuid,text,text) from public,anon,authenticated;
revoke all on function public.resolve_moderation_appeal(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.apply_moderation_action(uuid,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.submit_moderation_appeal(uuid,text,text) to authenticated;
grant execute on function public.resolve_moderation_appeal(uuid,text,uuid,text,text) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v25','schema_version',25,
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
