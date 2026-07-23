-- Durable workflows for Blueprint, Community Rooms, and Date Safety Concierge.
-- Private member data remains protected by RLS; capacity changes use server-side RPCs.

create table if not exists public.relationship_blueprints (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  relationship_pace text,
  family_connection text,
  future_home text,
  future_planning text,
  updated_at timestamptz not null default now(),
  constraint relationship_blueprints_pace_check check (relationship_pace is null or char_length(relationship_pace) between 2 and 80),
  constraint relationship_blueprints_family_check check (family_connection is null or char_length(family_connection) between 2 and 80),
  constraint relationship_blueprints_home_check check (future_home is null or char_length(future_home) between 2 and 80),
  constraint relationship_blueprints_future_check check (future_planning is null or char_length(future_planning) between 2 and 80)
);

alter table public.relationship_blueprints enable row level security;
drop policy if exists "members manage own relationship blueprint" on public.relationship_blueprints;
create policy "members manage own relationship blueprint"
on public.relationship_blueprints for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  category text not null check (category in ('For you','Professional','Culture','New here')),
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 10 and 1000),
  public_venue_label text,
  starts_at timestamptz not null,
  capacity integer not null default 16 check (capacity between 2 and 100),
  verified_only boolean not null default true,
  status text not null default 'scheduled' check (status in ('draft','scheduled','cancelled','completed')),
  host_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_rooms_city_starts_idx
  on public.community_rooms(lower(city), starts_at)
  where status = 'scheduled';

create table if not exists public.community_room_memberships (
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('confirmed','waitlisted','cancelled')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists community_room_memberships_room_status_idx
  on public.community_room_memberships(room_id, status);

create table if not exists public.community_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_room_messages_room_created_idx
  on public.community_room_messages(room_id, created_at);

create table if not exists public.date_safety_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  check_in_enabled boolean not null default true,
  check_in_at timestamptz,
  trusted_contact_label text,
  status text not null default 'planned' check (status in ('planned','checked_in','needs_help','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_safety_plans_contact_label_check check (trusted_contact_label is null or char_length(trusted_contact_label) between 2 and 80)
);

create index if not exists date_safety_plans_user_created_idx
  on public.date_safety_plans(user_id, created_at desc);

create table if not exists public.date_safety_plan_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.date_safety_plans(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('plan_created','check_in_confirmed','help_requested','plan_cancelled')),
  created_at timestamptz not null default now()
);

alter table public.community_rooms enable row level security;
alter table public.community_room_memberships enable row level security;
alter table public.community_room_messages enable row level security;
alter table public.date_safety_plans enable row level security;
alter table public.date_safety_plan_events enable row level security;

drop policy if exists "members view scheduled city rooms" on public.community_rooms;
create policy "members view scheduled city rooms"
on public.community_rooms for select to authenticated
using (status = 'scheduled' and starts_at > now() - interval '2 hours');

drop policy if exists "members view own room membership" on public.community_room_memberships;
create policy "members view own room membership"
on public.community_room_memberships for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "confirmed members view room messages" on public.community_room_messages;
create policy "confirmed members view room messages"
on public.community_room_messages for select to authenticated
using (exists (
  select 1 from public.community_room_memberships membership
  where membership.room_id = community_room_messages.room_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'confirmed'
));

drop policy if exists "confirmed members send room messages" on public.community_room_messages;
create policy "confirmed members send room messages"
on public.community_room_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.community_room_memberships membership
    where membership.room_id = community_room_messages.room_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'confirmed'
  )
);

drop policy if exists "members view own date safety plans" on public.date_safety_plans;
create policy "members view own date safety plans"
on public.date_safety_plans for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "members manage own date safety plans" on public.date_safety_plans;
create policy "members manage own date safety plans"
on public.date_safety_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status in ('planned','checked_in','needs_help','cancelled'));

drop policy if exists "members view own safety plan events" on public.date_safety_plan_events;
create policy "members view own safety plan events"
on public.date_safety_plan_events for select to authenticated
using (actor_id = (select auth.uid()));

create or replace function public.save_relationship_blueprint(
  p_relationship_pace text,
  p_family_connection text,
  p_future_home text,
  p_future_planning text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  result public.relationship_blueprints%rowtype;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  insert into public.relationship_blueprints(user_id,relationship_pace,family_connection,future_home,future_planning,updated_at)
  values (viewer,nullif(trim(p_relationship_pace),''),nullif(trim(p_family_connection),''),nullif(trim(p_future_home),''),nullif(trim(p_future_planning),''),now())
  on conflict (user_id) do update set
    relationship_pace=excluded.relationship_pace,
    family_connection=excluded.family_connection,
    future_home=excluded.future_home,
    future_planning=excluded.future_planning,
    updated_at=now()
  returning * into result;
  return to_jsonb(result);
end;
$$;

create or replace function public.join_community_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  room public.community_rooms%rowtype;
  existing public.community_room_memberships%rowtype;
  confirmed_count integer;
  next_status text;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  select * into room from public.community_rooms where id=p_room_id for update;
  if not found or room.status <> 'scheduled' or room.starts_at <= now() then raise exception 'This room is no longer available'; end if;
  if room.verified_only and not exists (select 1 from public.profiles where id=viewer and verified and onboarding_complete) then
    raise exception 'Complete verification before joining this room';
  end if;
  select * into existing from public.community_room_memberships where room_id=p_room_id and user_id=viewer for update;
  if found and existing.status <> 'cancelled' then return jsonb_build_object('room_id',p_room_id,'status',existing.status,'idempotent',true); end if;
  select count(*) into confirmed_count from public.community_room_memberships where room_id=p_room_id and status='confirmed';
  next_status := case when confirmed_count < room.capacity then 'confirmed' else 'waitlisted' end;
  insert into public.community_room_memberships(room_id,user_id,status,joined_at,updated_at)
  values(p_room_id,viewer,next_status,now(),now())
  on conflict(room_id,user_id) do update set status=excluded.status,joined_at=now(),updated_at=now();
  return jsonb_build_object('room_id',p_room_id,'status',next_status,'idempotent',false);
end;
$$;

create or replace function public.leave_community_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  update public.community_room_memberships set status='cancelled',updated_at=now()
  where room_id=p_room_id and user_id=viewer and status <> 'cancelled';
  return jsonb_build_object('room_id',p_room_id,'status','cancelled');
end;
$$;

create or replace function public.create_date_safety_plan(
  p_match_id uuid,
  p_check_in_enabled boolean,
  p_check_in_at timestamptz,
  p_trusted_contact_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  result public.date_safety_plans%rowtype;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_match_id is not null and not exists (select 1 from public.matches where id=p_match_id and status='mutual' and viewer in (user_a,user_b)) then
    raise exception 'A safety plan can only be linked to your mutual match';
  end if;
  if p_check_in_enabled and (p_check_in_at is null or p_check_in_at <= now()) then
    raise exception 'Choose a future check-in time';
  end if;
  insert into public.date_safety_plans(user_id,match_id,check_in_enabled,check_in_at,trusted_contact_label)
  values(viewer,p_match_id,coalesce(p_check_in_enabled,true),p_check_in_at,nullif(trim(p_trusted_contact_label),''))
  returning * into result;
  insert into public.date_safety_plan_events(plan_id,actor_id,event_type) values(result.id,viewer,'plan_created');
  return to_jsonb(result);
end;
$$;

create or replace function public.update_date_safety_plan_status(p_plan_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  result public.date_safety_plans%rowtype;
  event_name text;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_status not in ('checked_in','needs_help','cancelled') then raise exception 'Invalid safety plan status'; end if;
  update public.date_safety_plans set status=p_status,updated_at=now()
  where id=p_plan_id and user_id=viewer returning * into result;
  if not found then raise exception 'Safety plan not found'; end if;
  event_name := case p_status when 'checked_in' then 'check_in_confirmed' when 'needs_help' then 'help_requested' else 'plan_cancelled' end;
  insert into public.date_safety_plan_events(plan_id,actor_id,event_type) values(result.id,viewer,event_name);
  return to_jsonb(result);
end;
$$;

revoke all on function public.save_relationship_blueprint(text,text,text,text) from public;
revoke all on function public.join_community_room(uuid) from public;
revoke all on function public.leave_community_room(uuid) from public;
revoke all on function public.create_date_safety_plan(uuid,boolean,timestamptz,text) from public;
revoke all on function public.update_date_safety_plan_status(uuid,text) from public;
grant execute on function public.save_relationship_blueprint(text,text,text,text) to authenticated;
grant execute on function public.join_community_room(uuid) to authenticated;
grant execute on function public.leave_community_room(uuid) to authenticated;
grant execute on function public.create_date_safety_plan(uuid,boolean,timestamptz,text) to authenticated;
grant execute on function public.update_date_safety_plan_status(uuid,text) to authenticated;

alter publication supabase_realtime add table public.community_room_messages;
