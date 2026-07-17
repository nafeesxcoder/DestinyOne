-- DestinyOne backend foundation for production app behavior.
-- Adds support tickets, privacy settings, profile-view notifications, live
-- location sharing, richer chat message kinds, push tokens and safer gift quote
-- metadata. Apply after 001-003.

alter type public.message_kind add value if not exists 'snap';
alter type public.message_kind add value if not exists 'sticker';
alter type public.message_kind add value if not exists 'voice';
alter type public.message_kind add value if not exists 'location';

do $$
begin
  create type public.support_ticket_status as enum ('open','triaged','waiting_on_member','resolved','closed');
exception when duplicate_object then null;
end $$;

create table if not exists public.privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_visible boolean not null default true,
  online_status_visible boolean not null default true,
  profile_view_notifications boolean not null default true,
  private_mode boolean not null default false,
  profile_view_threshold_seconds integer not null default 5 check (profile_view_threshold_seconds between 3 and 60),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  source text not null default 'profile_detail',
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  check (viewer_id <> viewed_id)
);

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (topic in ('Safety','Billing','Account','Report a bug','Trust','Gift order','Other')),
  message text not null check (char_length(message) between 1 and 4000),
  status public.support_ticket_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source_screen text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  support_ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'note',
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_settings (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text check (char_length(nickname) <= 60),
  theme text not null default 'Ruby Velvet',
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table if not exists public.live_location_shares (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m integer check (accuracy_m is null or accuracy_m between 0 and 10000),
  live boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  token text not null,
  device_label text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.gift_orders add column if not exists service_level text;
alter table public.gift_orders add column if not exists provider_recommendation text;
alter table public.gift_orders add column if not exists payment_policy text;
alter table public.gift_orders add column if not exists recipient_privacy text;
alter table public.gift_orders add column if not exists acceptance_window_minutes integer not null default 30 check (acceptance_window_minutes between 5 and 240);
alter table public.gift_orders add column if not exists acceptance_expires_at timestamptz;

create index if not exists profile_views_viewed_created_idx on public.profile_views(viewed_id, created_at desc);
create index if not exists notifications_user_created_idx on public.member_notifications(user_id, created_at desc);
create index if not exists support_tickets_user_created_idx on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_status_created_idx on public.support_tickets(status, created_at desc);
create index if not exists live_location_match_expires_idx on public.live_location_shares(match_id, expires_at desc);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id, revoked_at);

alter table public.privacy_settings enable row level security;
alter table public.profile_views enable row level security;
alter table public.member_notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;
alter table public.chat_settings enable row level security;
alter table public.live_location_shares enable row level security;
alter table public.push_tokens enable row level security;

create policy "members manage own privacy settings" on public.privacy_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "members create own profile views" on public.profile_views
  for insert to authenticated
  with check ((select auth.uid()) = viewer_id);

create policy "members view relevant profile views" on public.profile_views
  for select to authenticated
  using ((select auth.uid()) in (viewer_id, viewed_id));

create policy "members view own notifications" on public.member_notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "members update own notifications" on public.member_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "members create own support tickets" on public.support_tickets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "members view own support tickets" on public.support_tickets
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "members view own support ticket events" on public.support_ticket_events
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets st
      where st.id = support_ticket_id and st.user_id = (select auth.uid())
    )
  );

create policy "participants manage own chat settings" on public.chat_settings
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b))
  )
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b))
  );

create policy "participants view live location shares" on public.live_location_shares
  for select to authenticated
  using (
    expires_at > now()
    and exists (select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b))
  );

create policy "participants create own live location shares" on public.live_location_shares
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (select 1 from public.matches m where m.id = match_id and m.status = 'mutual' and (select auth.uid()) in (m.user_a,m.user_b))
  );

create policy "members manage own push tokens" on public.push_tokens
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.record_profile_view(viewed_user_id uuid, duration_seconds integer default 5, source text default 'profile_detail')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  view_id uuid;
  should_notify boolean;
  threshold_seconds integer;
begin
  if viewer is null then
    raise exception 'Sign in required';
  end if;

  if viewer = viewed_user_id then
    return null;
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = viewer and blocked_id = viewed_user_id)
       or (blocker_id = viewed_user_id and blocked_id = viewer)
  ) then
    return null;
  end if;

  select coalesce(ps.profile_view_notifications, true),
         coalesce(ps.profile_view_threshold_seconds, 5)
  into should_notify, threshold_seconds
  from public.privacy_settings ps
  where ps.user_id = viewed_user_id;

  should_notify := coalesce(should_notify, true);
  threshold_seconds := coalesce(threshold_seconds, 5);

  insert into public.profile_views(viewer_id, viewed_id, duration_seconds, source, notified)
  values (viewer, viewed_user_id, greatest(duration_seconds, 0), coalesce(source, 'profile_detail'), should_notify and duration_seconds >= threshold_seconds)
  returning id into view_id;

  if should_notify and duration_seconds >= threshold_seconds then
    insert into public.member_notifications(user_id, type, title, body, metadata)
    values (
      viewed_user_id,
      'profile_view',
      'Someone viewed your profile',
      'A member spent time on your full profile.',
      jsonb_build_object('viewer_id', viewer, 'profile_view_id', view_id, 'duration_seconds', duration_seconds)
    );
  end if;

  return view_id;
end;
$$;

create or replace function public.mark_notification_read(notification_id uuid)
returns void
language sql
security invoker
as $$
  update public.member_notifications
  set read_at = now()
  where id = notification_id and user_id = (select auth.uid());
$$;

alter publication supabase_realtime add table public.member_notifications;
alter publication supabase_realtime add table public.live_location_shares;
