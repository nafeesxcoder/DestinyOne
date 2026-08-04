-- Phase 4 backend trust-boundary hardening.
-- Apply after 009. This migration makes blocking authoritative across profile,
-- discovery, messaging and private media reads, and adds a member bootstrap RPC.

create or replace function public.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create or replace function public.is_active_match_participant(p_match_id text, p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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

revoke all on function public.is_blocked_pair(uuid, uuid) from public;
revoke all on function public.is_active_match_participant(text, uuid) from public;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;
grant execute on function public.is_active_match_participant(text, uuid) to authenticated;

drop policy if exists "authenticated members view profiles" on public.profiles;
create policy "members view unblocked profiles" on public.profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or not public.is_blocked_pair((select auth.uid()), id)
  );

drop policy if exists "members view approved photos or own" on public.profile_photos;
create policy "members view approved unblocked photos or own" on public.profile_photos
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (approved and not public.is_blocked_pair((select auth.uid()), user_id))
  );

drop policy if exists "participants view matches" on public.matches;
create policy "participants view unblocked matches" on public.matches
  for select to authenticated
  using (
    (select auth.uid()) in (user_a, user_b)
    and not public.is_blocked_pair(user_a, user_b)
  );

drop policy if exists "members view relevant decisions" on public.likes;
drop policy if exists "members create decisions" on public.likes;
create policy "members view unblocked relevant decisions" on public.likes
  for select to authenticated
  using (
    (select auth.uid()) in (sender_id, recipient_id)
    and not public.is_blocked_pair(sender_id, recipient_id)
  );

drop policy if exists "members manage own blocks" on public.blocks;
create policy "members view own blocks" on public.blocks
  for select to authenticated
  using ((select auth.uid()) = blocker_id);

drop policy if exists "participants view icebreakers" on public.icebreakers;
drop policy if exists "participants update icebreakers" on public.icebreakers;
create policy "active participants view icebreakers" on public.icebreakers
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'mutual'
        and (select auth.uid()) in (m.user_a, m.user_b)
        and not public.is_blocked_pair(m.user_a, m.user_b)
    )
  );

drop policy if exists "participants view date proposals" on public.date_proposals;
drop policy if exists "participants create date proposals" on public.date_proposals;
drop policy if exists "participants update date proposals" on public.date_proposals;
create policy "active participants view date proposals" on public.date_proposals
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'mutual'
        and (select auth.uid()) in (m.user_a, m.user_b)
        and not public.is_blocked_pair(m.user_a, m.user_b)
    )
  );

drop policy if exists "participants view messages" on public.messages;
drop policy if exists "participants send messages" on public.messages;
drop policy if exists "participants view messages after icebreaker" on public.messages;
drop policy if exists "participants send messages after icebreaker" on public.messages;
create policy "active participants view messages" on public.messages
  for select to authenticated
  using (public.is_active_match_participant(match_id::text, (select auth.uid())));
create policy "active participants send messages" on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_active_match_participant(match_id::text, (select auth.uid()))
  );

-- Profile storage remains private. Owners may read their uploads; other
-- authenticated members only receive signed reads for approved photo rows.
drop policy if exists "members manage own profile media" on storage.objects;
create policy "members read approved profile media or own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-media'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.profile_photos pp
        where pp.storage_path = name
          and pp.approved
          and not public.is_blocked_pair((select auth.uid()), pp.user_id)
      )
    )
  );
create policy "members update own profile media" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text);
create policy "members delete own profile media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text);

-- New chat paths are match_id/member_id/kind/file. The match prefix lets RLS
-- authorize the other participant without making the bucket public.
drop policy if exists "members upload own chat media" on storage.objects;
drop policy if exists "members manage own chat media" on storage.objects;
create policy "active participants upload match chat media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_active_match_participant((storage.foldername(name))[1], (select auth.uid()))
  );
create policy "active participants read match chat media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-media'
    and (
      owner_id = (select auth.uid())::text
      or public.is_active_match_participant((storage.foldername(name))[1], (select auth.uid()))
    )
  );
create policy "members update own chat media" on storage.objects
  for update to authenticated
  using (bucket_id = 'chat-media' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'chat-media' and owner_id = (select auth.uid())::text);
create policy "members delete own chat media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-media' and owner_id = (select auth.uid())::text);

create or replace function public.daily_matches(result_limit integer default 5)
returns table(profile_id uuid, match_id uuid, match_label text)
language sql
stable
security invoker
as $$
  select candidate.id, m.id, initcap(m.label::text)
  from public.matches m
  join public.profiles candidate
    on candidate.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  where (m.user_a = (select auth.uid()) or m.user_b = (select auth.uid()))
    and m.status = 'suggested'
    and candidate.onboarding_complete
    and not public.is_blocked_pair(m.user_a, m.user_b)
  order by m.score_internal desc, m.created_at desc
  limit least(greatest(result_limit, 1), 5);
$$;

create or replace function public.block_member(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_blocked_id is null or p_blocked_id = viewer then raise exception 'Invalid member'; end if;

  insert into public.blocks(blocker_id, blocked_id)
  values (viewer, p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;

  update public.matches
  set status = 'blocked'
  where viewer in (user_a, user_b) and p_blocked_id in (user_a, user_b);

  update public.live_location_shares
  set live = false, expires_at = least(expires_at, now())
  where live and match_id in (
    select id from public.matches
    where viewer in (user_a, user_b) and p_blocked_id in (user_a, user_b)
  );
end;
$$;

revoke all on function public.block_member(uuid) from public;
grant execute on function public.block_member(uuid) to authenticated;

create or replace function public.get_current_member_bootstrap()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  return jsonb_build_object(
    'user_id', viewer,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = viewer),
    'preferences', (select to_jsonb(up) from public.user_preferences up where up.user_id = viewer),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pp.id,
        'storage_path', pp.storage_path,
        'position', pp.position,
        'approved', pp.approved
      ) order by pp.position)
      from public.profile_photos pp where pp.user_id = viewer
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_current_member_bootstrap() from public;
grant execute on function public.get_current_member_bootstrap() to authenticated;

-- submit_match_decision remains the only client write path for likes. Add the
-- block and onboarding checks before preserving the mutual-match transaction.
create or replace function public.submit_match_decision(recipient_id uuid, decision text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_decision text := lower(trim(decision));
  user_one uuid;
  user_two uuid;
  matched_id uuid;
  did_match boolean := false;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if recipient_id is null or recipient_id = viewer then raise exception 'Invalid match decision recipient.'; end if;
  if normalized_decision not in ('interested', 'pass') then raise exception 'Unsupported match decision.'; end if;
  if public.is_blocked_pair(viewer, recipient_id) then raise exception 'This member is unavailable.'; end if;
  if not exists (select 1 from public.profiles where id = recipient_id and onboarding_complete) then
    raise exception 'This member is unavailable.';
  end if;

  insert into public.likes(sender_id, recipient_id, decision)
  values (viewer, recipient_id, normalized_decision)
  on conflict (sender_id, recipient_id)
  do update set decision = excluded.decision, created_at = now();

  insert into public.discovery_signals(user_id, target_id, signal)
  values (viewer, recipient_id, case when normalized_decision = 'pass' then 'skip' else 'interested' end);

  if normalized_decision = 'pass' then
    update public.matches set status = 'passed'
    where status = 'suggested' and viewer in (user_a, user_b) and recipient_id in (user_a, user_b);
    return jsonb_build_object('matched', false, 'decision', normalized_decision, 'match_id', null);
  end if;

  select exists(
    select 1 from public.likes
    where sender_id = recipient_id and recipient_id = viewer and decision = 'interested'
  ) into did_match;

  if did_match then
    user_one := least(viewer, recipient_id);
    user_two := greatest(viewer, recipient_id);
    insert into public.matches(user_a, user_b, label, score_internal, status, matched_at)
    values (user_one, user_two, 'great', 84.00, 'mutual', now())
    on conflict (user_a, user_b) do update
      set status = 'mutual', matched_at = coalesce(public.matches.matched_at, now())
    returning id into matched_id;

    insert into public.member_notifications(user_id, type, title, body, metadata)
    values
      (recipient_id, 'mutual_match', 'It’s a Match', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', viewer)),
      (viewer, 'mutual_match', 'It’s a Match', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', recipient_id));
  end if;

  return jsonb_build_object('matched', did_match, 'decision', normalized_decision, 'match_id', matched_id);
end;
$$;

revoke all on function public.submit_match_decision(uuid, text) from public;
grant execute on function public.submit_match_decision(uuid, text) to authenticated;

-- Supabase's current local/cloud defaults no longer auto-expose new tables.
-- Grant only the client operations the app actually uses; privileged writes
-- continue through security-definer RPCs or Edge Functions.
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select on public.matches, public.likes, public.icebreakers to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.discovery_signals to authenticated;
grant select on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, update on public.privacy_settings to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant select, update on public.member_notifications to authenticated;
grant select, insert, update, delete on public.chat_settings to authenticated;
grant select, insert on public.live_location_shares to authenticated;
grant select on public.date_proposals, public.relationship_reflections,
  public.relationship_learning_signals, public.relationship_reminders,
  public.relationship_journey_events to authenticated;
grant select on public.subscriptions, public.coin_ledger, public.gift_orders,
  public.gift_order_events to authenticated;

alter default privileges in schema public revoke all on tables from anon;
