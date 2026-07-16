-- City-by-city launch control. Member-facing tables contain only a member's
-- own waitlist/referral state; cohort and liquidity metrics remain service-only.

create table if not exists public.city_launch_markets (
  city_key text primary key check (city_key in ('nyc','bay_area','dallas','toronto','chicago')),
  display_name text not null,
  country_code text not null check (country_code in ('US','CA')),
  discovery_state text not null default 'waitlist_only'
    check (discovery_state in ('waitlist_only','controlled_pilot','healthy_pilot','open')),
  verified_active_goal integer not null check (verified_active_goal between 100 and 10000),
  adjacent_market text,
  updated_at timestamptz not null default now()
);

insert into public.city_launch_markets(city_key,display_name,country_code,verified_active_goal,adjacent_market)
values
  ('nyc','New York / Jersey City','US',250,'Philadelphia'),
  ('bay_area','San Francisco / San Jose','US',250,'Sacramento'),
  ('dallas','Dallas / Plano / Frisco','US',220,'Austin'),
  ('toronto','Toronto / Brampton / Mississauga','CA',250,'Hamilton / Niagara'),
  ('chicago','Chicago / Naperville / Schaumburg','US',180,'Milwaukee')
on conflict (city_key) do update set
  display_name=excluded.display_name,
  country_code=excluded.country_code,
  verified_active_goal=excluded.verified_active_goal,
  adjacent_market=excluded.adjacent_market;

create table if not exists public.city_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_key text not null references public.city_launch_markets(city_key),
  locality text not null check (char_length(locality) between 2 and 100),
  region text not null check (char_length(region) between 2 and 80),
  country_code text not null check (country_code in ('US','CA')),
  source text not null default 'member' check (source in ('member','referral','ambassador','event')),
  status text not null default 'waiting' check (status in ('waiting','invited','activated','paused','declined')),
  consented_at timestamptz not null default now(),
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,city_key)
);
create index if not exists city_waitlist_market_status_idx
  on public.city_waitlist_entries(city_key,status,created_at);

create table if not exists public.city_referral_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  city_key text not null references public.city_launch_markets(city_key),
  invite_code text not null unique check (char_length(invite_code) between 12 and 64),
  status text not null default 'created' check (status in ('created','opened','joined','verified','expired','revoked')),
  reward_status text not null default 'locked' check (reward_status in ('locked','eligible','granted','reversed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  redeemed_by uuid references public.profiles(id) on delete set null,
  check (redeemed_by is null or redeemed_by <> inviter_id)
);
create index if not exists city_referrals_inviter_idx
  on public.city_referral_invites(inviter_id,created_at desc);

create table if not exists public.city_ambassador_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_key text not null references public.city_launch_markets(city_key),
  community_reach text not null check (char_length(community_reach) between 20 and 1000),
  hosting_experience text not null check (char_length(hosting_experience) between 20 and 1000),
  safety_commitment boolean not null,
  status text not null default 'submitted' check (status in ('submitted','interview','approved','declined','paused')),
  reviewer_id uuid,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,city_key)
);

create table if not exists public.city_liquidity_snapshots (
  id bigint generated always as identity primary key,
  city_key text not null references public.city_launch_markets(city_key),
  snapshot_week date not null,
  verified_active_members integer not null check (verified_active_members >= 0),
  cohort_floor_percent numeric(5,2) not null check (cohort_floor_percent between 0 and 100),
  median_eligible_candidates numeric(8,2) not null check (median_eligible_candidates >= 0),
  qualified_introductions_per_active numeric(8,2) not null check (qualified_introductions_per_active >= 0),
  reply_rate_percent numeric(5,2) not null check (reply_rate_percent between 0 and 100),
  meaningful_conversation_rate_percent numeric(5,2) not null check (meaningful_conversation_rate_percent between 0 and 100),
  accepted_date_rate_percent numeric(5,2) not null check (accepted_date_rate_percent between 0 and 100),
  eight_week_retention_percent numeric(5,2) not null check (eight_week_retention_percent between 0 and 100),
  safety_incidents_per_100_dates numeric(8,3) not null check (safety_incidents_per_100_dates >= 0),
  consecutive_healthy_weeks smallint not null default 0 check (consecutive_healthy_weeks between 0 and 520),
  waitlist_members integer not null default 0 check (waitlist_members >= 0),
  active_ambassadors integer not null default 0 check (active_ambassadors >= 0),
  monthly_event_seats integer not null default 0 check (monthly_event_seats >= 0),
  generated_at timestamptz not null default now(),
  unique(city_key,snapshot_week)
);

create table if not exists public.city_cohort_snapshots (
  id bigint generated always as identity primary key,
  city_key text not null references public.city_launch_markets(city_key),
  snapshot_week date not null,
  cohort_key text not null check (char_length(cohort_key) between 3 and 120),
  eligible_active_members integer not null check (eligible_active_members >= 0),
  median_reciprocal_candidates numeric(8,2) not null check (median_reciprocal_candidates >= 0),
  qualified_introductions integer not null check (qualified_introductions >= 0),
  suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(city_key,snapshot_week,cohort_key)
);

alter table public.city_launch_markets enable row level security;
alter table public.city_waitlist_entries enable row level security;
alter table public.city_referral_invites enable row level security;
alter table public.city_ambassador_applications enable row level security;
alter table public.city_liquidity_snapshots enable row level security;
alter table public.city_cohort_snapshots enable row level security;

create policy "members view launch market state" on public.city_launch_markets
  for select to authenticated using (true);
create policy "members view own city waitlist" on public.city_waitlist_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "members view own city referrals" on public.city_referral_invites
  for select to authenticated using ((select auth.uid()) = inviter_id);
create policy "members view own ambassador applications" on public.city_ambassador_applications
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.join_city_waitlist(
  p_city_key text,
  p_locality text,
  p_region text,
  p_country_code text,
  p_source text default 'member'
)
returns public.city_waitlist_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  result public.city_waitlist_entries;
  normalized_city text := lower(trim(coalesce(p_city_key,'')));
  normalized_country text := upper(trim(coalesce(p_country_code,'')));
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.profiles where id=viewer and onboarding_complete) then
    raise exception 'Complete your profile first';
  end if;
  if normalized_city not in ('nyc','bay_area','dallas','toronto','chicago') then raise exception 'Unsupported launch market'; end if;
  if normalized_country not in ('US','CA') then raise exception 'Country must be US or CA'; end if;
  if char_length(trim(coalesce(p_locality,''))) not between 2 and 100
     or char_length(trim(coalesce(p_region,''))) not between 2 and 80 then raise exception 'City and region are required'; end if;
  if lower(trim(coalesce(p_source,''))) not in ('member','referral','ambassador','event') then raise exception 'Invalid waitlist source'; end if;
  if not exists(select 1 from public.city_launch_markets where city_key=normalized_city and country_code=normalized_country) then
    raise exception 'Launch market does not match country';
  end if;

  insert into public.city_waitlist_entries(user_id,city_key,locality,region,country_code,source)
  values(viewer,normalized_city,trim(p_locality),trim(p_region),normalized_country,lower(trim(p_source)))
  on conflict(user_id,city_key) do update set
    locality=excluded.locality,region=excluded.region,country_code=excluded.country_code,
    source=excluded.source,consented_at=now(),updated_at=now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.create_city_referral(p_city_key text)
returns public.city_referral_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_city text := lower(trim(coalesce(p_city_key,'')));
  result public.city_referral_invites;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.profiles where id=viewer and onboarding_complete) then raise exception 'Complete your profile first'; end if;
  if not exists(select 1 from public.city_launch_markets where city_key=normalized_city) then raise exception 'Unsupported launch market'; end if;
  if (select count(*) from public.city_referral_invites where inviter_id=viewer and created_at>now()-interval '30 days') >= 20 then
    raise exception 'Monthly referral limit reached';
  end if;
  insert into public.city_referral_invites(inviter_id,city_key,invite_code,expires_at)
  values(viewer,normalized_city,replace(gen_random_uuid()::text,'-',''),now()+interval '30 days')
  returning * into result;
  return result;
end;
$$;

create or replace function public.apply_city_ambassador(
  p_city_key text,
  p_community_reach text,
  p_hosting_experience text,
  p_safety_commitment boolean
)
returns public.city_ambassador_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_city text := lower(trim(coalesce(p_city_key,'')));
  result public.city_ambassador_applications;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.profiles where id=viewer and onboarding_complete and verified) then
    raise exception 'Verified profile required';
  end if;
  if not exists(select 1 from public.city_launch_markets where city_key=normalized_city) then raise exception 'Unsupported launch market'; end if;
  if char_length(trim(coalesce(p_community_reach,''))) not between 20 and 1000
     or char_length(trim(coalesce(p_hosting_experience,''))) not between 20 and 1000 then
    raise exception 'Please provide complete ambassador details';
  end if;
  if coalesce(p_safety_commitment,false) is not true then raise exception 'Safety commitment is required'; end if;

  insert into public.city_ambassador_applications(user_id,city_key,community_reach,hosting_experience,safety_commitment)
  values(viewer,normalized_city,trim(p_community_reach),trim(p_hosting_experience),true)
  on conflict(user_id,city_key) do update set
    community_reach=excluded.community_reach,hosting_experience=excluded.hosting_experience,
    safety_commitment=true,status='submitted',reviewer_id=null,reviewer_note=null,updated_at=now()
  returning * into result;
  return result;
end;
$$;

revoke all on public.city_launch_markets, public.city_waitlist_entries, public.city_referral_invites,
  public.city_ambassador_applications, public.city_liquidity_snapshots, public.city_cohort_snapshots from anon, authenticated;
grant select on public.city_launch_markets to authenticated;
grant select on public.city_waitlist_entries, public.city_referral_invites, public.city_ambassador_applications to authenticated;

revoke all on function public.join_city_waitlist(text,text,text,text,text) from public, anon;
revoke all on function public.create_city_referral(text) from public, anon;
revoke all on function public.apply_city_ambassador(text,text,text,boolean) from public, anon;
grant execute on function public.join_city_waitlist(text,text,text,text,text) to authenticated;
grant execute on function public.create_city_referral(text) to authenticated;
grant execute on function public.apply_city_ambassador(text,text,text,boolean) to authenticated;

notify pgrst, 'reload schema';
