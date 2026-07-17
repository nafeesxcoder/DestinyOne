-- Phase 4 member-profile trust boundary hardening.
-- Apply after 011. Members may edit their own public profile data, but cannot
-- self-approve verification, onboarding, or profile-photo moderation fields.

create or replace function public.save_current_member_profile(
  p_profile jsonb,
  p_preferences jsonb,
  p_photo_paths text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_first_name text;
  normalized_birth_date date;
  normalized_city text;
  normalized_profession text;
  normalized_height smallint;
  normalized_religion text;
  normalized_community text;
  normalized_bio text;
  normalized_voice_path text;
  normalized_intent public.relationship_intent;
  normalized_vibes text[] := '{}';
  normalized_marriage_timeline text;
  normalized_children text;
  normalized_family_involvement text;
  normalized_relocation text;
  normalized_smart_discovery boolean := true;
  normalized_crossed_paths boolean := false;
  profile_existed boolean;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if exists (
    select 1 from public.deletion_requests
    where user_id = viewer and status in ('requested', 'processing')
  ) then raise exception 'Account deletion is pending'; end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Profile payload must be an object';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Preference payload must be an object';
  end if;
  if octet_length(p_profile::text) > 8192 or octet_length(p_preferences::text) > 8192 then
    raise exception 'Profile payload is too large';
  end if;
  if p_profile - array[
    'first_name','birth_date','city','profession','height_cm','religion',
    'community','bio','voice_intro_path'
  ]::text[] <> '{}'::jsonb then
    raise exception 'Unsupported profile field';
  end if;
  if p_preferences - array[
    'intent','vibes','marriage_timeline','children','family_involvement',
    'relocation','smart_discovery','crossed_paths'
  ]::text[] <> '{}'::jsonb then
    raise exception 'Unsupported preference field';
  end if;

  normalized_first_name := trim(coalesce(p_profile->>'first_name', ''));
  normalized_city := trim(coalesce(p_profile->>'city', ''));
  normalized_profession := trim(coalesce(p_profile->>'profession', ''));
  normalized_religion := nullif(trim(coalesce(p_profile->>'religion', '')), '');
  normalized_community := nullif(trim(coalesce(p_profile->>'community', '')), '');
  normalized_bio := nullif(trim(coalesce(p_profile->>'bio', '')), '');
  normalized_voice_path := nullif(trim(coalesce(p_profile->>'voice_intro_path', '')), '');

  if char_length(normalized_first_name) not between 1 and 60 then raise exception 'First name is invalid'; end if;
  if char_length(normalized_city) not between 2 and 120 then raise exception 'City is invalid'; end if;
  if char_length(normalized_profession) not between 2 and 120 then raise exception 'Profession is invalid'; end if;
  if normalized_religion is not null and char_length(normalized_religion) > 80 then raise exception 'Religion is too long'; end if;
  if normalized_community is not null and char_length(normalized_community) > 80 then raise exception 'Community is too long'; end if;
  if normalized_bio is not null and char_length(normalized_bio) > 1000 then raise exception 'Bio is too long'; end if;

  begin
    normalized_birth_date := (p_profile->>'birth_date')::date;
  exception when others then
    raise exception 'Birth date is invalid';
  end;
  if normalized_birth_date is null then raise exception 'Birth date is invalid'; end if;
  if normalized_birth_date > current_date - interval '18 years'
     or normalized_birth_date < current_date - interval '90 years' then
    raise exception 'Member must be between 18 and 90 years old';
  end if;

  if p_profile ? 'height_cm' and p_profile->'height_cm' <> 'null'::jsonb then
    begin
      normalized_height := (p_profile->>'height_cm')::smallint;
    exception when others then
      raise exception 'Height is invalid';
    end;
    if normalized_height not between 120 and 230 then raise exception 'Height is invalid'; end if;
  end if;

  if normalized_voice_path is not null then
    if normalized_voice_path not like viewer::text || '/voice/%' then
      raise exception 'Voice intro path is invalid';
    end if;
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'profile-media' and o.name = normalized_voice_path
        and o.owner_id = viewer::text
    ) then raise exception 'Voice intro upload was not found'; end if;
  end if;

  begin
    normalized_intent := lower(trim(coalesce(p_preferences->>'intent', '')))::public.relationship_intent;
  exception when others then
    raise exception 'Relationship intent is invalid';
  end;
  if normalized_intent is null then raise exception 'Relationship intent is invalid'; end if;
  if jsonb_typeof(coalesce(p_preferences->'vibes', '[]'::jsonb)) <> 'array' then
    raise exception 'Vibes must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_preferences->'vibes', '[]'::jsonb)) value
    where jsonb_typeof(value) <> 'string'
  ) then raise exception 'Vibes must contain text only'; end if;
  select coalesce(array_agg(trim(value)), '{}') into normalized_vibes
  from jsonb_array_elements_text(coalesce(p_preferences->'vibes', '[]'::jsonb)) value;
  if cardinality(normalized_vibes) > 5
     or exists (select 1 from unnest(normalized_vibes) vibe where char_length(vibe) not between 1 and 40) then
    raise exception 'Vibes are invalid';
  end if;

  normalized_marriage_timeline := nullif(trim(coalesce(p_preferences->>'marriage_timeline', '')), '');
  normalized_children := nullif(trim(coalesce(p_preferences->>'children', '')), '');
  normalized_family_involvement := nullif(trim(coalesce(p_preferences->>'family_involvement', '')), '');
  normalized_relocation := nullif(trim(coalesce(p_preferences->>'relocation', '')), '');
  if exists (
    select 1 from unnest(array[
      normalized_marriage_timeline, normalized_children,
      normalized_family_involvement, normalized_relocation
    ]) value where value is not null and char_length(value) > 120
  ) then raise exception 'Alignment preference is too long'; end if;

  if p_preferences ? 'smart_discovery' then
    if jsonb_typeof(p_preferences->'smart_discovery') <> 'boolean' then raise exception 'Smart discovery is invalid'; end if;
    normalized_smart_discovery := (p_preferences->>'smart_discovery')::boolean;
  end if;
  if p_preferences ? 'crossed_paths' then
    if jsonb_typeof(p_preferences->'crossed_paths') <> 'boolean' then raise exception 'Crossed paths is invalid'; end if;
    normalized_crossed_paths := (p_preferences->>'crossed_paths')::boolean;
  end if;

  select exists(select 1 from public.profiles where id = viewer) into profile_existed;
  if not profile_existed and coalesce(cardinality(p_photo_paths), 0) = 0 then
    raise exception 'At least one profile photo is required';
  end if;
  if p_photo_paths is not null then
    if cardinality(p_photo_paths) > 6 then raise exception 'A maximum of six profile photos is allowed'; end if;
    if cardinality(p_photo_paths) <> (select count(distinct path) from unnest(p_photo_paths) path) then
      raise exception 'Profile photo paths must be unique';
    end if;
    if exists (
      select 1 from unnest(p_photo_paths) path
      where path not like viewer::text || '/photo/%'
        or not exists (
          select 1 from storage.objects o
          where o.bucket_id = 'profile-media' and o.name = path and o.owner_id = viewer::text
        )
    ) then raise exception 'Profile photo upload was not found'; end if;
  end if;

  insert into public.profiles(
    id, first_name, birth_date, city, profession, height_cm, religion,
    community, bio, verified, onboarding_complete, voice_intro_path
  ) values (
    viewer, normalized_first_name, normalized_birth_date, normalized_city,
    normalized_profession, normalized_height, normalized_religion,
    normalized_community, normalized_bio, false, true, normalized_voice_path
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    birth_date = excluded.birth_date,
    city = excluded.city,
    profession = excluded.profession,
    height_cm = excluded.height_cm,
    religion = excluded.religion,
    community = excluded.community,
    bio = excluded.bio,
    onboarding_complete = true,
    voice_intro_path = excluded.voice_intro_path,
    updated_at = now();

  insert into public.user_preferences(
    user_id, intent, vibes, marriage_timeline, children, family_involvement,
    relocation, smart_discovery, crossed_paths
  ) values (
    viewer, normalized_intent, normalized_vibes, normalized_marriage_timeline,
    normalized_children, normalized_family_involvement, normalized_relocation,
    normalized_smart_discovery, normalized_crossed_paths
  )
  on conflict (user_id) do update set
    intent = excluded.intent,
    vibes = excluded.vibes,
    marriage_timeline = excluded.marriage_timeline,
    children = excluded.children,
    family_involvement = excluded.family_involvement,
    relocation = excluded.relocation,
    smart_discovery = excluded.smart_discovery,
    crossed_paths = excluded.crossed_paths,
    updated_at = now();

  if p_photo_paths is not null then
    delete from public.profile_photos where user_id = viewer;
    insert into public.profile_photos(user_id, storage_path, position, approved)
    select viewer, path, position - 1, false
    from unnest(p_photo_paths) with ordinality as photos(path, position);
  end if;

  return jsonb_build_object(
    'user_id', viewer,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = viewer),
    'preferences', (select to_jsonb(up) from public.user_preferences up where up.user_id = viewer),
    'photos', coalesce((
      select jsonb_agg(to_jsonb(pp) order by pp.position)
      from public.profile_photos pp where pp.user_id = viewer
    ), '[]'::jsonb)
  );
end;
$$;

-- Exact birth date is owner-private. Candidate/profile reads receive only the
-- public profile columns, while bootstrap returns the signed-in member's full
-- row for account editing.
create or replace function public.get_current_member_bootstrap()
returns jsonb
language plpgsql
stable
security definer
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

-- Account deletion is also a server-owned mutation. The client can request it
-- but cannot forge workflow status or completion timestamps.
create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  request_id uuid;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  insert into public.deletion_requests(user_id)
  values (viewer)
  on conflict (user_id) do update
    set status = 'requested', requested_at = now(), completed_at = null
  returning id into request_id;

  update public.profiles
  set onboarding_complete = false, updated_at = now()
  where id = viewer;

  return request_id;
end;
$$;

drop policy if exists "members create own profile" on public.profiles;
drop policy if exists "members update own profile" on public.profiles;
drop policy if exists "members manage own preferences" on public.user_preferences;
create policy "members view own preferences" on public.user_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "members manage own photos" on public.profile_photos;
drop policy if exists "members create own deletion request" on public.deletion_requests;

revoke select, insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.user_preferences from authenticated;
revoke insert, update, delete on public.profile_photos from authenticated;
revoke insert, update, delete on public.deletion_requests from authenticated;
grant select (
  id, first_name, city, profession, height_cm, religion, community, bio,
  verified, onboarding_complete, voice_intro_path, created_at, updated_at
) on public.profiles to authenticated;
grant select on public.user_preferences, public.profile_photos, public.deletion_requests to authenticated;

revoke all on function public.save_current_member_profile(jsonb, jsonb, text[]) from public, anon, authenticated;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.get_current_member_bootstrap() from public, anon, authenticated;
grant execute on function public.save_current_member_profile(jsonb, jsonb, text[]) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.get_current_member_bootstrap() to authenticated;
