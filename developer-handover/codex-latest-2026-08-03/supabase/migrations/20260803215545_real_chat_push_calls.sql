-- Real chat receipts, authenticated Realtime presence/signaling and call audit.
-- Client topics are private and scoped to chat:<match_uuid>.

alter table public.messages add column if not exists delivered_at timestamptz;
create index if not exists messages_match_created_desc_idx on public.messages(match_id,created_at desc);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  client_call_id text not null,
  match_id uuid not null references public.matches(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','rejected','ended','missed','failed')),
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  failure_reason text,
  unique(caller_id,client_call_id),
  check (char_length(client_call_id) between 8 and 120)
);
create index if not exists call_sessions_match_started_idx on public.call_sessions(match_id,started_at desc);
alter table public.call_sessions enable row level security;
grant select on public.call_sessions to authenticated;
revoke insert,update,delete on public.call_sessions from authenticated;

create policy "participants view their call sessions" on public.call_sessions
  for select to authenticated using (
    exists(select 1 from public.matches m where m.id=match_id and (select auth.uid()) in (m.user_a,m.user_b))
  );

create or replace function public.mark_match_messages_delivered(p_match_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); changed integer;
begin
  if viewer is null or not public.is_active_match_participant(p_match_id::text,viewer) then raise exception 'Conversation unavailable'; end if;
  update public.messages set delivered_at=coalesce(delivered_at,now())
  where match_id=p_match_id and sender_id<>viewer and delivered_at is null;
  get diagnostics changed=row_count; return changed;
end; $$;

create or replace function public.mark_match_messages_read(p_match_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); changed integer;
begin
  if viewer is null or not public.is_active_match_participant(p_match_id::text,viewer) then raise exception 'Conversation unavailable'; end if;
  update public.messages set delivered_at=coalesce(delivered_at,now()),read_at=coalesce(read_at,now())
  where match_id=p_match_id and sender_id<>viewer and read_at is null;
  get diagnostics changed=row_count; return changed;
end; $$;

create or replace function public.start_match_call(p_match_id uuid,p_client_call_id text,p_call_type text)
returns public.call_sessions language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); recipient uuid; saved public.call_sessions;
begin
  if viewer is null or not public.is_active_match_participant(p_match_id::text,viewer) then raise exception 'Conversation unavailable'; end if;
  if p_client_call_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$' or p_call_type not in ('audio','video') then raise exception 'Invalid call'; end if;
  insert into public.call_sessions(client_call_id,match_id,caller_id,call_type)
  values(p_client_call_id,p_match_id,viewer,p_call_type)
  on conflict(caller_id,client_call_id) do update set status='ringing',started_at=now(),answered_at=null,ended_at=null,failure_reason=null
  returning * into saved;
  select case when m.user_a=viewer then m.user_b else m.user_a end into recipient from public.matches m where m.id=p_match_id;
  if recipient is not null then
    insert into public.member_notifications(user_id,type,title,body,metadata)
    values(recipient,'call','Incoming '||p_call_type||' call','A verified mutual match is calling on DestinyOne.',
      jsonb_build_object('matchId',p_match_id,'clientCallId',p_client_call_id,'mode',p_call_type,'screen','chat'));
  end if;
  return saved;
end; $$;

create or replace function public.update_match_call(p_match_id uuid,p_client_call_id text,p_status text,p_failure_reason text default null)
returns public.call_sessions language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); saved public.call_sessions;
begin
  if viewer is null or not public.is_active_match_participant(p_match_id::text,viewer) then raise exception 'Conversation unavailable'; end if;
  if p_status not in ('accepted','rejected','ended','missed','failed') then raise exception 'Invalid call status'; end if;
  update public.call_sessions set status=p_status,
    answered_at=case when p_status='accepted' then coalesce(answered_at,now()) else answered_at end,
    ended_at=case when p_status in ('rejected','ended','missed','failed') then coalesce(ended_at,now()) else ended_at end,
    failure_reason=case when p_status='failed' then left(coalesce(p_failure_reason,'Connection failed'),500) else failure_reason end
  where match_id=p_match_id and client_call_id=p_client_call_id
  returning * into saved;
  if saved.id is null then raise exception 'Call unavailable'; end if; return saved;
end; $$;

create or replace function public.broadcast_match_message_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform realtime.broadcast_changes(
    'chat:'||coalesce(new.match_id,old.match_id)::text,tg_op,tg_op,tg_table_name,tg_table_schema,new,old
  );
  return null;
end; $$;
drop trigger if exists broadcast_match_message_change_trigger on public.messages;
create trigger broadcast_match_message_change_trigger after insert or update or delete on public.messages
for each row execute function public.broadcast_match_message_change();
revoke all on function public.broadcast_match_message_change() from public,anon,authenticated;

create or replace function public.create_message_push_notification()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
  select case when m.user_a=new.sender_id then m.user_b else m.user_a end into recipient
  from public.matches m where m.id=new.match_id and new.sender_id in (m.user_a,m.user_b) and m.status='mutual';
  if recipient is not null and not public.is_blocked_pair(new.sender_id,recipient) then
    insert into public.member_notifications(user_id,type,title,body,metadata)
    values(recipient,'message','New message','A verified mutual match sent you a private message.',
      jsonb_build_object('matchId',new.match_id,'messageId',new.id,'screen','chat'));
  end if;
  return new;
end; $$;
drop trigger if exists create_message_push_notification_trigger on public.messages;
create trigger create_message_push_notification_trigger after insert on public.messages
for each row execute function public.create_message_push_notification();
revoke all on function public.create_message_push_notification() from public,anon,authenticated;

drop policy if exists "match participants receive private realtime" on realtime.messages;
create policy "match participants receive private realtime" on realtime.messages
for select to authenticated using (
  realtime.messages.extension in ('broadcast','presence') and split_part((select realtime.topic()),':',1)='chat'
  and exists(select 1 from public.matches m where m.id::text=split_part((select realtime.topic()),':',2)
    and m.status='mutual' and (select auth.uid()) in (m.user_a,m.user_b)
    and not public.is_blocked_pair(m.user_a,m.user_b))
);
drop policy if exists "match participants send private realtime" on realtime.messages;
create policy "match participants send private realtime" on realtime.messages
for insert to authenticated with check (
  realtime.messages.extension in ('broadcast','presence') and split_part((select realtime.topic()),':',1)='chat'
  and exists(select 1 from public.matches m where m.id::text=split_part((select realtime.topic()),':',2)
    and m.status='mutual' and (select auth.uid()) in (m.user_a,m.user_b)
    and not public.is_blocked_pair(m.user_a,m.user_b))
);

revoke all on function public.mark_match_messages_delivered(uuid) from public,anon,authenticated;
revoke all on function public.mark_match_messages_read(uuid) from public,anon,authenticated;
revoke all on function public.start_match_call(uuid,text,text) from public,anon,authenticated;
revoke all on function public.update_match_call(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.mark_match_messages_delivered(uuid) to authenticated;
grant execute on function public.mark_match_messages_read(uuid) to authenticated;
grant execute on function public.start_match_call(uuid,text,text) to authenticated;
grant execute on function public.update_match_call(uuid,text,text,text) to authenticated;
