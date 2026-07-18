-- Phase 4 server-owned chat mutation and function privilege hardening.
-- Apply after 010. Message creation is idempotent, rate limited, and only
-- available after a mutual match has unlocked its icebreaker.

alter table public.messages
  add column if not exists client_message_id text;

alter table public.messages
  drop constraint if exists messages_client_message_id_length;
alter table public.messages
  add constraint messages_client_message_id_length
  check (client_message_id is null or char_length(client_message_id) between 8 and 120);

create unique index if not exists messages_sender_client_message_id_unique
  on public.messages(sender_id, client_message_id)
  where client_message_id is not null;

-- These helpers are used by RLS. Prevent authenticated callers from using
-- them to inspect block or match state for unrelated members.
create or replace function public.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then true
    when auth.uid() not in (p_user_a, p_user_b) and auth.role() <> 'service_role' then true
    else exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
         or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
    )
  end;
$$;

create or replace function public.is_active_match_participant(p_match_id text, p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    p_member_id = auth.uid() or auth.role() = 'service_role'
  ) and exists (
    select 1 from public.matches m
    where m.id::text = p_match_id
      and m.status = 'mutual'
      and p_member_id in (m.user_a, m.user_b)
      and not public.is_blocked_pair(m.user_a, m.user_b)
      and exists (
        select 1 from public.icebreakers i
        where i.match_id = m.id and i.unlocked_at is not null
      )
  );
$$;

create or replace function public.send_match_message(
  p_match_id uuid,
  p_client_message_id text,
  p_kind public.message_kind,
  p_body text default null,
  p_media_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_client_id text := trim(coalesce(p_client_message_id, ''));
  normalized_body text := nullif(trim(coalesce(p_body, '')), '');
  normalized_media_path text := nullif(trim(coalesce(p_media_path, '')), '');
  saved_message public.messages%rowtype;
  minute_count integer;
  day_count integer;
  required_path_prefix text;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if char_length(normalized_client_id) not between 8 and 120
     or normalized_client_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'Invalid client message id';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Message metadata must be an object';
  end if;
  if octet_length(p_metadata::text) > 16384 then raise exception 'Message metadata is too large'; end if;
  if p_metadata - array['gift','date','snap','sticker','voice','location']::text[] <> '{}'::jsonb then
    raise exception 'Unsupported message metadata';
  end if;
  if p_body is not null and char_length(p_body) > 4000 then raise exception 'Message body is too long'; end if;
  if p_media_path is not null and char_length(p_media_path) > 1000 then raise exception 'Media path is too long'; end if;
  if not public.is_active_match_participant(p_match_id::text, viewer) then
    raise exception 'This conversation is unavailable';
  end if;

  -- Serialize sends per member so concurrent requests cannot bypass limits or
  -- create two rows for the same client-generated message id.
  perform pg_advisory_xact_lock(hashtextextended(viewer::text, 0));

  select * into saved_message
  from public.messages
  where sender_id = viewer and client_message_id = normalized_client_id;
  if found then return to_jsonb(saved_message); end if;

  select count(*) into minute_count from public.messages
  where sender_id = viewer and created_at >= now() - interval '1 minute';
  select count(*) into day_count from public.messages
  where sender_id = viewer and created_at >= now() - interval '24 hours';
  if minute_count >= 15 then raise exception 'Please wait before sending more messages'; end if;
  if day_count >= 500 then raise exception 'Daily message limit reached'; end if;

  required_path_prefix := p_match_id::text || '/' || viewer::text || '/';
  case
    when p_kind = 'text' then
      if normalized_body is null or normalized_media_path is not null then
        raise exception 'Text messages require text only';
      end if;
    when p_kind in ('image', 'snap', 'voice', 'sticker') then
      if normalized_media_path is null or normalized_media_path not like required_path_prefix || '%' then
        raise exception 'Media must belong to this member and match';
      end if;
    when p_kind = 'gif' then
      if normalized_media_path is null or not (
        normalized_media_path like required_path_prefix || '%'
        or normalized_media_path ~ '^https://'
      ) then raise exception 'GIF source is invalid'; end if;
    when p_kind = 'gift' then
      if jsonb_typeof(p_metadata->'gift') is distinct from 'object' or normalized_media_path is not null then
        raise exception 'Gift metadata is required';
      end if;
    when p_kind = 'date' then
      if jsonb_typeof(p_metadata->'date') is distinct from 'object' or normalized_media_path is not null then
        raise exception 'Date metadata is required';
      end if;
    when p_kind = 'location' then
      if jsonb_typeof(p_metadata->'location') is distinct from 'object' or normalized_media_path is not null then
        raise exception 'Location metadata is required';
      end if;
    else
      raise exception 'Unsupported message type';
  end case;

  insert into public.messages(
    match_id, sender_id, client_message_id, kind, body, media_path, metadata
  ) values (
    p_match_id, viewer, normalized_client_id, p_kind, normalized_body,
    normalized_media_path, p_metadata
  ) returning * into saved_message;

  return to_jsonb(saved_message);
end;
$$;

drop policy if exists "active participants send messages" on public.messages;
revoke insert on public.messages from authenticated;
grant select on public.messages to authenticated;

-- request_account_deletion is security-invoker and needs these RLS-protected
-- privileges after migration 010's blanket table revoke.
grant select, insert, update on public.deletion_requests to authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Replace that
-- default with an explicit client RPC allowlist.
revoke all on function public.daily_matches(integer) from public, anon, authenticated;
revoke all on function public.current_coin_balance() from public, anon, authenticated;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.record_profile_view(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.mark_notification_read(uuid) from public, anon, authenticated;
revoke all on function public.submit_match_decision(uuid, text) from public, anon, authenticated;
revoke all on function public.submit_icebreaker_answer(uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_date_proposal(uuid, text, text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.respond_to_date_proposal(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_date_proposal(uuid) from public, anon, authenticated;
revoke all on function public.upsert_relationship_reflection(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.set_relationship_reminder(uuid, boolean) from public, anon, authenticated;
revoke all on function public.record_relationship_journey_event(text, jsonb) from public, anon, authenticated;
revoke all on function public.get_relationship_journey(uuid) from public, anon, authenticated;
revoke all on function public.get_current_member_bootstrap() from public, anon, authenticated;
revoke all on function public.block_member(uuid) from public, anon, authenticated;
revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_active_match_participant(text, uuid) from public, anon, authenticated;
revoke all on function public.send_match_message(uuid, text, public.message_kind, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.process_relationship_reminders(integer) from public, anon, authenticated, service_role;

grant execute on function public.daily_matches(integer) to authenticated;
grant execute on function public.current_coin_balance() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.record_profile_view(uuid, integer, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.submit_match_decision(uuid, text) to authenticated;
grant execute on function public.submit_icebreaker_answer(uuid, text, text) to authenticated;
grant execute on function public.create_date_proposal(uuid, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.respond_to_date_proposal(uuid, text) to authenticated;
grant execute on function public.complete_date_proposal(uuid) to authenticated;
grant execute on function public.upsert_relationship_reflection(uuid, text, boolean) to authenticated;
grant execute on function public.set_relationship_reminder(uuid, boolean) to authenticated;
grant execute on function public.record_relationship_journey_event(text, jsonb) to authenticated;
grant execute on function public.get_relationship_journey(uuid) to authenticated;
grant execute on function public.get_current_member_bootstrap() to authenticated;
grant execute on function public.block_member(uuid) to authenticated;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;
grant execute on function public.is_active_match_participant(text, uuid) to authenticated;
grant execute on function public.send_match_message(uuid, text, public.message_kind, text, text, jsonb) to authenticated;
grant execute on function public.process_relationship_reminders(integer) to service_role;

alter default privileges in schema public revoke execute on functions from public;
