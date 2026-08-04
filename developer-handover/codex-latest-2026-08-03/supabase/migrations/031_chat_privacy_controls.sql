-- Per-conversation retention and supported native screenshot alerts.

alter table public.chat_settings
  add column if not exists retention_mode text not null default 'keep'
    check (retention_mode in ('keep','after_seen','24_hours','7_days')),
  add column if not exists screenshot_alerts boolean not null default true;

alter table public.messages
  add column if not exists expires_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_reason text
    check (deletion_reason in ('after_seen','timer','member_deleted'));

create table if not exists public.chat_privacy_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('screenshot_detected','messages_deleted')),
  detection_source text not null check (detection_source in ('native_capture_api','member_reported','server_retention')),
  client_event_id text not null check (char_length(client_event_id) between 8 and 160),
  created_at timestamptz not null default now(),
  unique(actor_id,client_event_id)
);

alter table public.chat_privacy_events enable row level security;
create policy "match members view chat privacy events" on public.chat_privacy_events
  for select to authenticated using (
    exists(select 1 from public.matches m where m.id=match_id and auth.uid() in(m.user_a,m.user_b))
  );

create or replace function public.mark_match_messages_seen(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); touched integer:=0; removed integer:=0;
begin
  if viewer is null or not exists(
    select 1 from public.matches m where m.id=p_match_id and m.status='mutual' and viewer in(m.user_a,m.user_b)
  ) then raise exception 'This conversation is unavailable'; end if;

  update public.messages set read_at=coalesce(read_at,now())
    where match_id=p_match_id and sender_id<>viewer and deleted_at is null;
  get diagnostics touched=row_count;

  update public.messages msg set
    body=null,media_path=null,metadata=jsonb_build_object('deleted',true),deleted_at=now(),deletion_reason='after_seen'
  from public.chat_settings setting
  where msg.match_id=p_match_id and msg.sender_id<>viewer and msg.sender_id=setting.user_id
    and setting.match_id=p_match_id and setting.retention_mode='after_seen'
    and msg.read_at is not null and msg.deleted_at is null;
  get diagnostics removed=row_count;

  if removed>0 then
    insert into public.chat_privacy_events(match_id,actor_id,event_type,detection_source,client_event_id)
    values(p_match_id,viewer,'messages_deleted','server_retention','seen-'||gen_random_uuid()::text);
  end if;
  return jsonb_build_object('seen',touched,'deleted',removed);
end;
$$;

create or replace function public.record_chat_screenshot(
  p_match_id uuid,p_message_id uuid,p_client_event_id text,p_detection_source text default 'native_capture_api'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); other_member uuid; event_id uuid;
begin
  if actor is null or p_detection_source not in('native_capture_api','member_reported') then raise exception 'Invalid capture event'; end if;
  select case when m.user_a=actor then m.user_b else m.user_a end into other_member
    from public.matches m where m.id=p_match_id and m.status='mutual' and actor in(m.user_a,m.user_b);
  if other_member is null then raise exception 'This conversation is unavailable'; end if;
  if p_message_id is not null and not exists(select 1 from public.messages where id=p_message_id and match_id=p_match_id) then raise exception 'Message is not in this conversation'; end if;
  if (select count(*) from public.chat_privacy_events where actor_id=actor and event_type='screenshot_detected' and created_at>now()-interval '1 hour')>=10 then raise exception 'Capture alert rate limit reached'; end if;

  insert into public.chat_privacy_events(match_id,message_id,actor_id,event_type,detection_source,client_event_id)
  values(p_match_id,p_message_id,actor,'screenshot_detected',p_detection_source,trim(p_client_event_id))
  on conflict(actor_id,client_event_id) do update set client_event_id=excluded.client_event_id returning id into event_id;

  if coalesce((select screenshot_alerts from public.chat_settings where match_id=p_match_id and user_id=other_member),true) then
    insert into public.member_notifications(user_id,type,title,body,metadata)
    values(other_member,'chat_screenshot','Screenshot alert','A screenshot was detected in your private conversation.',jsonb_build_object('matchId',p_match_id,'eventId',event_id,'source',p_detection_source));
  end if;
  return jsonb_build_object('eventId',event_id,'notified',true);
end;
$$;

revoke all on public.chat_privacy_events from public,anon,authenticated;
grant select on public.chat_privacy_events to authenticated;
revoke all on function public.mark_match_messages_seen(uuid) from public,anon,authenticated;
revoke all on function public.record_chat_screenshot(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mark_match_messages_seen(uuid) to authenticated;
grant execute on function public.record_chat_screenshot(uuid,uuid,text,text) to authenticated;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v31','schema_version',31,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb),
    'anonymous_table_exposures',coalesce((select jsonb_agg(exposure.table_name order by exposure.table_name) from(select distinct c.relname table_name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_policies policy on policy.schemaname=n.nspname and policy.tablename=c.relname where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') and policy.cmd in('SELECT','ALL') and policy.roles&&array['public','anon']::name[]) exposure),'[]'::jsonb),
    'anonymous_rpc_exposures',coalesce((select jsonb_agg(exposure.function_name order by exposure.function_name) from(select distinct p.proname function_name from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')) exposure),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public,anon,authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
