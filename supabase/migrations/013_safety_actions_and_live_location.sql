-- Phase 4 safety mutation and live-location hardening.
-- Apply after 012. Safety actions are server-owned, auditable, rate limited,
-- and use the correct member-profile or relationship-match identifier.

alter table public.reports add column if not exists client_action_id text;
alter table public.reports add column if not exists severity text not null default 'normal';
alter table public.reports add column if not exists triage_due_at timestamptz;
alter table public.reports drop constraint if exists reports_client_action_id_length;
alter table public.reports add constraint reports_client_action_id_length
  check (client_action_id is null or char_length(client_action_id) between 8 and 120);
alter table public.reports drop constraint if exists reports_severity_check;
alter table public.reports add constraint reports_severity_check
  check (severity in ('normal', 'high', 'critical'));
create unique index if not exists reports_reporter_client_action_unique
  on public.reports(reporter_id, client_action_id)
  where client_action_id is not null;

alter table public.live_location_shares add column if not exists client_action_id text;
alter table public.live_location_shares drop constraint if exists live_location_client_action_id_length;
alter table public.live_location_shares add constraint live_location_client_action_id_length
  check (client_action_id is null or char_length(client_action_id) between 8 and 120);
create unique index if not exists live_location_sender_client_action_unique
  on public.live_location_shares(sender_id, client_action_id)
  where client_action_id is not null;

create table if not exists public.safety_action_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid references public.profiles(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (action in ('report_submitted','member_blocked','match_unmatched','live_location_started')),
  client_action_id text not null check (char_length(client_action_id) between 8 and 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(actor_id, action, client_action_id)
);

create index if not exists safety_action_actor_created_idx
  on public.safety_action_events(actor_id, created_at desc);
create index if not exists safety_action_target_created_idx
  on public.safety_action_events(target_id, created_at desc)
  where target_id is not null;

alter table public.safety_action_events enable row level security;
create policy "members view own safety actions" on public.safety_action_events
  for select to authenticated using ((select auth.uid()) = actor_id);

create or replace function public.submit_member_report(
  p_reported_id uuid,
  p_reason text,
  p_details text,
  p_client_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_reason text := trim(coalesce(p_reason, ''));
  normalized_details text := nullif(trim(coalesce(p_details, '')), '');
  normalized_client_id text := trim(coalesce(p_client_action_id, ''));
  report_row public.reports%rowtype;
  recent_count integer;
  report_severity text;
  due_at timestamptz;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_reported_id is null or p_reported_id = viewer then raise exception 'Invalid reported member'; end if;
  if not exists (select 1 from public.profiles where id = p_reported_id) then
    raise exception 'Reported member was not found';
  end if;
  if normalized_reason not in (
    'Fake or misleading profile','Harassment or disrespect','Asked for money',
    'Inappropriate content','Safety concern','Something else'
  ) then raise exception 'Unsupported report reason'; end if;
  if normalized_details is not null and char_length(normalized_details) > 2000 then
    raise exception 'Report details are too long';
  end if;
  if char_length(normalized_client_id) not between 8 and 120
     or normalized_client_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'Invalid client action id';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(viewer::text || ':report', 0));
  select * into report_row from public.reports
  where reporter_id = viewer and client_action_id = normalized_client_id;
  if found then return to_jsonb(report_row); end if;

  select count(*) into recent_count from public.reports
  where reporter_id = viewer and created_at >= now() - interval '24 hours';
  if recent_count >= 10 then raise exception 'Daily report limit reached'; end if;

  report_severity := case
    when normalized_reason in ('Asked for money', 'Safety concern') then 'critical'
    when normalized_reason in ('Harassment or disrespect', 'Inappropriate content') then 'high'
    else 'normal'
  end;
  due_at := now() + case report_severity
    when 'critical' then interval '15 minutes'
    when 'high' then interval '4 hours'
    else interval '24 hours'
  end;

  insert into public.reports(
    reporter_id, reported_id, reason, details, client_action_id, severity, triage_due_at
  ) values (
    viewer, p_reported_id, normalized_reason, normalized_details,
    normalized_client_id, report_severity, due_at
  ) returning * into report_row;

  insert into public.safety_action_events(
    actor_id, target_id, report_id, action, client_action_id, metadata
  ) values (
    viewer, p_reported_id, report_row.id, 'report_submitted', normalized_client_id,
    jsonb_build_object('severity', report_severity)
  );

  return to_jsonb(report_row);
end;
$$;

create or replace function public.block_member(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  inserted_count integer := 0;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_blocked_id is null or p_blocked_id = viewer then raise exception 'Invalid member'; end if;
  if not exists (select 1 from public.profiles where id = p_blocked_id) then
    raise exception 'Member was not found';
  end if;

  insert into public.blocks(blocker_id, blocked_id)
  values (viewer, p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;
  get diagnostics inserted_count = row_count;

  update public.matches
  set status = 'blocked'
  where viewer in (user_a, user_b) and p_blocked_id in (user_a, user_b);

  update public.live_location_shares
  set live = false, expires_at = least(expires_at, now())
  where live and match_id in (
    select id from public.matches
    where viewer in (user_a, user_b) and p_blocked_id in (user_a, user_b)
  );

  if inserted_count > 0 then
    insert into public.safety_action_events(
      actor_id, target_id, action, client_action_id
    ) values (
      viewer, p_blocked_id, 'member_blocked', 'block:' || p_blocked_id::text
    );
  end if;
end;
$$;

create or replace function public.unmatch_member(
  p_match_id uuid,
  p_client_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_client_id text := trim(coalesce(p_client_action_id, ''));
  relation public.matches%rowtype;
  target_member uuid;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if char_length(normalized_client_id) not between 8 and 120
     or normalized_client_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'Invalid client action id';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text || ':unmatch:' || p_match_id::text, 0));

  if exists (
    select 1 from public.safety_action_events
    where actor_id = viewer and action = 'match_unmatched'
      and client_action_id = normalized_client_id
  ) then
    return jsonb_build_object('match_id', p_match_id, 'status', 'passed', 'idempotent', true);
  end if;

  select * into relation from public.matches
  where id = p_match_id and viewer in (user_a, user_b)
  for update;
  if not found then raise exception 'Match was not found'; end if;
  if relation.status = 'passed' then
    return jsonb_build_object('match_id', relation.id, 'status', relation.status, 'idempotent', true);
  end if;
  if relation.status <> 'mutual' then raise exception 'Only a mutual match can be unmatched'; end if;

  target_member := case when relation.user_a = viewer then relation.user_b else relation.user_a end;
  update public.matches set status = 'passed' where id = relation.id;
  update public.live_location_shares
  set live = false, expires_at = least(expires_at, now())
  where match_id = relation.id and live;

  insert into public.safety_action_events(
    actor_id, target_id, match_id, action, client_action_id
  ) values (
    viewer, target_member, relation.id, 'match_unmatched', normalized_client_id
  );

  return jsonb_build_object('match_id', relation.id, 'status', 'passed', 'idempotent', false);
end;
$$;

create or replace function public.start_live_location_share(
  p_match_id uuid,
  p_client_action_id text,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m integer default null,
  p_duration_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_client_id text := trim(coalesce(p_client_action_id, ''));
  share_row public.live_location_shares%rowtype;
  relation public.matches%rowtype;
  target_member uuid;
  recent_count integer;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if char_length(normalized_client_id) not between 8 and 120
     or normalized_client_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'Invalid client action id';
  end if;
  if p_latitude is null or p_latitude not between -90 and 90
     or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'Location coordinates are invalid';
  end if;
  if p_accuracy_m is not null and p_accuracy_m not between 0 and 10000 then
    raise exception 'Location accuracy is invalid';
  end if;
  if p_duration_minutes not between 5 and 60 then raise exception 'Location duration is invalid'; end if;
  if not public.is_active_match_participant(p_match_id::text, viewer) then
    raise exception 'This conversation is unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(viewer::text || ':location:' || p_match_id::text, 0));
  select * into share_row from public.live_location_shares
  where sender_id = viewer and client_action_id = normalized_client_id;
  if found then return to_jsonb(share_row); end if;

  select count(*) into recent_count from public.live_location_shares
  where sender_id = viewer and created_at >= now() - interval '1 hour';
  if recent_count >= 6 then raise exception 'Live location share limit reached'; end if;

  select * into relation from public.matches where id = p_match_id;
  target_member := case when relation.user_a = viewer then relation.user_b else relation.user_a end;
  update public.live_location_shares
  set live = false, expires_at = least(expires_at, now())
  where sender_id = viewer and match_id = p_match_id and live;

  insert into public.live_location_shares(
    match_id, sender_id, client_action_id, latitude, longitude,
    accuracy_m, live, expires_at
  ) values (
    p_match_id, viewer, normalized_client_id, p_latitude, p_longitude,
    p_accuracy_m, true, now() + make_interval(mins => p_duration_minutes)
  ) returning * into share_row;

  insert into public.safety_action_events(
    actor_id, target_id, match_id, action, client_action_id, metadata
  ) values (
    viewer, target_member, p_match_id, 'live_location_started', normalized_client_id,
    jsonb_build_object('duration_minutes', p_duration_minutes)
  );

  return to_jsonb(share_row);
end;
$$;

drop policy if exists "members create reports" on public.reports;
drop policy if exists "participants view live location shares" on public.live_location_shares;
drop policy if exists "participants create own live location shares" on public.live_location_shares;
create policy "active participants view live location shares" on public.live_location_shares
  for select to authenticated using (
    live and expires_at > now()
    and public.is_active_match_participant(match_id::text, (select auth.uid()))
  );

revoke insert, update, delete on public.reports from authenticated;
revoke insert, update, delete on public.live_location_shares from authenticated;
grant select on public.reports, public.live_location_shares, public.safety_action_events to authenticated;

revoke all on function public.submit_member_report(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.block_member(uuid) from public, anon, authenticated;
revoke all on function public.unmatch_member(uuid, text) from public, anon, authenticated;
revoke all on function public.start_live_location_share(uuid, text, numeric, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.submit_member_report(uuid, text, text, text) to authenticated;
grant execute on function public.block_member(uuid) to authenticated;
grant execute on function public.unmatch_member(uuid, text) to authenticated;
grant execute on function public.start_live_location_share(uuid, text, numeric, numeric, integer, integer) to authenticated;
