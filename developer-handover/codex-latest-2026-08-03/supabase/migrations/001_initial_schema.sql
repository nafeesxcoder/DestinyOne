-- DestinyOne production schema
-- Apply with `supabase db push` after linking a Supabase project.

create extension if not exists pgcrypto;

create type public.relationship_intent as enum ('long_term', 'marriage', 'long_term_to_marriage');
create type public.match_label as enum ('strong', 'great', 'exceptional');
create type public.match_status as enum ('suggested', 'mutual', 'passed', 'blocked');
create type public.message_kind as enum ('text', 'image', 'gif', 'gift', 'date');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  birth_date date not null,
  city text not null,
  profession text not null,
  height_cm smallint check (height_cm between 120 and 230),
  religion text,
  community text,
  bio text check (char_length(bio) <= 1000),
  verified boolean not null default false,
  onboarding_complete boolean not null default false,
  voice_intro_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  intent public.relationship_intent not null default 'long_term_to_marriage',
  vibes text[] not null default '{}',
  marriage_timeline text,
  children text,
  family_involvement text,
  relocation text,
  smart_discovery boolean not null default true,
  crossed_paths boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position smallint not null check (position between 0 and 5),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, position)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  label public.match_label not null,
  score_internal numeric(5,2) not null check (score_internal between 0 and 100),
  status public.match_status not null default 'suggested',
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique(user_a, user_b)
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('interested', 'pass')),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  unique(sender_id, recipient_id)
);

create table public.icebreakers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  question text not null,
  user_a_answer text,
  user_b_answer text,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind public.message_kind not null,
  body text check (char_length(body) <= 5000),
  media_path text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  gift_code text not null,
  coins integer not null check (coins > 0),
  created_at timestamptz not null default now()
);

create table public.date_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  venue_name text not null,
  area_label text not null,
  proposed_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','countered')),
  safety_check_in boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.trusted_vouches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  voucher_hash text not null,
  qualities text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','complete','revoked')),
  created_at timestamptz not null default now(),
  unique(user_id, voucher_hash)
);

create table public.discovery_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  signal text not null check (signal in ('view','interested','skip')),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus')),
  status text not null default 'active',
  provider text,
  provider_customer_id text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);

create index matches_user_a_idx on public.matches(user_a, status);
create index matches_user_b_idx on public.matches(user_b, status);
create index messages_match_created_idx on public.messages(match_id, created_at);
create index discovery_user_created_idx on public.discovery_signals(user_id, created_at desc);
create index reports_reported_idx on public.reports(reported_id, status);

-- Qualitative labels are public; the internal score never needs to reach the UI.
create or replace function public.daily_matches(result_limit integer default 5)
returns table(profile_id uuid, match_id uuid, match_label text)
language sql stable security invoker
as $$
  select case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end,
         m.id,
         initcap(m.label::text)
  from public.matches m
  where (m.user_a = (select auth.uid()) or m.user_b = (select auth.uid()))
    and m.status = 'suggested'
  order by m.score_internal desc, m.created_at desc
  limit least(result_limit, 5);
$$;

create or replace function public.current_coin_balance()
returns integer language sql stable security invoker
as $$ select coalesce(sum(amount), 0)::integer from public.coin_ledger where user_id = (select auth.uid()); $$;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.profile_photos enable row level security;
alter table public.matches enable row level security;
alter table public.likes enable row level security;
alter table public.icebreakers enable row level security;
alter table public.messages enable row level security;
alter table public.gifts enable row level security;
alter table public.date_proposals enable row level security;
alter table public.trusted_vouches enable row level security;
alter table public.discovery_signals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "authenticated members view profiles" on public.profiles for select to authenticated using (true);
create policy "members create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "members update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "members manage own preferences" on public.user_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "members view approved photos or own" on public.profile_photos for select to authenticated using (approved or (select auth.uid()) = user_id);
create policy "members manage own photos" on public.profile_photos for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "participants view matches" on public.matches for select to authenticated using ((select auth.uid()) in (user_a, user_b));
create policy "members create decisions" on public.likes for insert to authenticated with check ((select auth.uid()) = sender_id);
create policy "members view relevant decisions" on public.likes for select to authenticated using ((select auth.uid()) in (sender_id, recipient_id));

create policy "participants view icebreakers" on public.icebreakers for select to authenticated using (exists(select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "participants update icebreakers" on public.icebreakers for update to authenticated using (exists(select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "participants view messages" on public.messages for select to authenticated using (exists(select 1 from public.matches m where m.id = match_id and m.status = 'mutual' and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "participants send messages" on public.messages for insert to authenticated with check ((select auth.uid()) = sender_id and exists(select 1 from public.matches m where m.id = match_id and m.status = 'mutual' and (select auth.uid()) in (m.user_a,m.user_b)));

create policy "participants view gifts" on public.gifts for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy "members send own gifts" on public.gifts for insert to authenticated with check ((select auth.uid()) = sender_id);
create policy "participants view date proposals" on public.date_proposals for select to authenticated using (exists(select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "participants create date proposals" on public.date_proposals for insert to authenticated with check ((select auth.uid()) = proposer_id and exists(select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "participants update date proposals" on public.date_proposals for update to authenticated using (exists(select 1 from public.matches m where m.id = match_id and (select auth.uid()) in (m.user_a,m.user_b)));

create policy "completed vouches visible to members" on public.trusted_vouches for select to authenticated using (status = 'complete' or (select auth.uid()) = user_id);
create policy "members manage vouch invites" on public.trusted_vouches for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "members manage own discovery signals" on public.discovery_signals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "members view own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "members view own coin ledger" on public.coin_ledger for select to authenticated using ((select auth.uid()) = user_id);
create policy "members manage own blocks" on public.blocks for all to authenticated using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);
create policy "members create reports" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "members view own reports" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);

-- Private buckets. Client uploads are restricted to a folder named with auth.uid().
insert into storage.buckets (id, name, public) values ('profile-media','profile-media',false),('chat-media','chat-media',false) on conflict do nothing;
create policy "members upload own profile media" on storage.objects for insert to authenticated with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "members manage own profile media" on storage.objects for all to authenticated using (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text);
create policy "members upload own chat media" on storage.objects for insert to authenticated with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "members manage own chat media" on storage.objects for all to authenticated using (bucket_id = 'chat-media' and owner_id = (select auth.uid())::text);

-- Realtime publication for participant-filtered chat updates.
alter publication supabase_realtime add table public.messages;

