-- Phase 5 production-shaped matching intelligence.
-- Apply after 013. Candidate eligibility is reciprocal and safety-first;
-- ranking uses only stated preferences and consented first-party outcomes.

create table if not exists public.profile_match_attributes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  gender text not null check (gender in ('woman','man','nonbinary')),
  family_priority text not null default 'balanced' check (family_priority in ('high','balanced','independent')),
  children_intent text not null default 'open' check (children_intent in ('wants','open','does_not_want')),
  marriage_timeline text not null default '2_3_years' check (marriage_timeline in ('1_2_years','2_3_years','later')),
  relocation text not null default 'open' check (relocation in ('open','same_city','not_open')),
  languages text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.matching_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  looking_for text not null default 'everyone' check (looking_for in ('women','men','everyone')),
  min_age smallint not null default 25 check (min_age between 18 and 90),
  max_age smallint not null default 35 check (max_age between 18 and 90),
  cities text[] not null default '{}',
  intents public.relationship_intent[] not null default '{}',
  must_have_vibes text[] not null default '{}',
  family_priority text not null default 'any' check (family_priority in ('any','high','balanced')),
  children text not null default 'any' check (children in ('any','wants','open','does_not_want')),
  marriage_timeline text not null default 'any' check (marriage_timeline in ('any','1_2_years','2_3_years')),
  relocation text not null default 'any' check (relocation in ('any','open','same_city')),
  distance_preference text not null default 'anywhere' check (distance_preference in ('anywhere','selected_cities','same_state','open_to_relocate')),
  smart_discovery boolean not null default true,
  updated_at timestamptz not null default now(),
  check (min_age <= max_age)
);

create table if not exists public.matching_model_versions (
  version text primary key check (char_length(version) between 3 and 40),
  status text not null check (status in ('active','retired')),
  weights jsonb not null,
  notes text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  check (not (weights ?| array['gender','religion','community','ethnicity','caste']))
);
create unique index if not exists one_active_matching_model
  on public.matching_model_versions(status) where status = 'active';

insert into public.matching_model_versions(version,status,weights,notes,activated_at)
values (
  'intentional-v1','active',
  '{"base":35,"intent":18,"shared_vibe":6,"family":10,"children":8,"timeline":8,"relocation":5,"same_city":10,"verified":4,"vouch":2,"positive_outcome":8,"negative_outcome":-15}'::jsonb,
  'Deterministic serious-relationship ranking. Protected traits are never ranking weights.',
  now()
)
on conflict (version) do nothing;

create table if not exists public.daily_match_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  recommendation_day date not null default current_date,
  rank smallint not null check (rank between 1 and 20),
  label public.match_label not null,
  reasons text[] not null check (cardinality(reasons) between 1 and 3),
  model_version text not null references public.matching_model_versions(version),
  score_internal numeric(5,2) not null check (score_internal between 0 and 100),
  created_at timestamptz not null default now(),
  unique(user_id,target_id,recommendation_day),
  unique(user_id,recommendation_day,rank)
);
create index if not exists daily_match_target_exposure_idx
  on public.daily_match_recommendations(target_id,created_at desc);

create table if not exists public.match_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  feedback text not null check (feedback in ('promising','not_aligned','met_in_person')),
  use_for_matching boolean not null default false,
  client_action_id text not null check (char_length(client_action_id) between 8 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,match_id),
  unique(user_id,client_action_id)
);

create table if not exists public.matching_model_events (
  id uuid primary key default gen_random_uuid(),
  model_version text not null references public.matching_model_versions(version),
  action text not null check (action in ('activated','quality_snapshot')),
  actor_id uuid,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.discovery_signals add column if not exists client_action_id text;
alter table public.discovery_signals drop constraint if exists discovery_signal_client_action_length;
alter table public.discovery_signals add constraint discovery_signal_client_action_length
  check (client_action_id is null or char_length(client_action_id) between 8 and 120);
create unique index if not exists discovery_signal_client_action_unique
  on public.discovery_signals(user_id,client_action_id) where client_action_id is not null;

alter table public.profile_match_attributes enable row level security;
alter table public.matching_preferences enable row level security;
alter table public.matching_model_versions enable row level security;
alter table public.daily_match_recommendations enable row level security;
alter table public.match_feedback enable row level security;
alter table public.matching_model_events enable row level security;

create policy "members view own match attributes" on public.profile_match_attributes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "members view own matching preferences" on public.matching_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "members view own recommendations" on public.daily_match_recommendations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "members view own match feedback" on public.match_feedback
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_matching_preferences(
  p_preferences jsonb,
  p_attributes jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_gender text;
  normalized_looking_for text;
  normalized_min_age smallint;
  normalized_max_age smallint;
  normalized_cities text[] := '{}';
  normalized_intents public.relationship_intent[] := '{}';
  normalized_vibes text[] := '{}';
  normalized_languages text[] := '{}';
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles where id=viewer and onboarding_complete) then
    raise exception 'Complete your profile first';
  end if;
  if jsonb_typeof(coalesce(p_preferences,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_attributes,'{}'::jsonb)) <> 'object' then
    raise exception 'Matching settings must be objects';
  end if;
  if octet_length(p_preferences::text) > 8192 or octet_length(p_attributes::text) > 4096 then
    raise exception 'Matching settings are too large';
  end if;
  if p_preferences - array[
    'looking_for','min_age','max_age','cities','intents','must_have_vibes',
    'family_priority','children','marriage_timeline','relocation',
    'distance_preference','smart_discovery'
  ]::text[] <> '{}'::jsonb then raise exception 'Unsupported matching preference'; end if;
  if p_attributes - array[
    'gender','family_priority','children_intent','marriage_timeline','relocation','languages'
  ]::text[] <> '{}'::jsonb then raise exception 'Unsupported matching attribute'; end if;

  normalized_gender := lower(trim(coalesce(p_attributes->>'gender','')));
  normalized_looking_for := lower(trim(coalesce(p_preferences->>'looking_for','everyone')));
  if normalized_gender not in ('woman','man','nonbinary') then raise exception 'Gender is required for reciprocal matching'; end if;
  if normalized_looking_for not in ('women','men','everyone') then raise exception 'Looking-for preference is invalid'; end if;
  begin
    normalized_min_age := coalesce((p_preferences->>'min_age')::smallint,25);
    normalized_max_age := coalesce((p_preferences->>'max_age')::smallint,35);
  exception when others then raise exception 'Age range is invalid'; end;
  if normalized_min_age not between 18 and 90 or normalized_max_age not between 18 and 90
     or normalized_min_age > normalized_max_age then raise exception 'Age range is invalid'; end if;

  if jsonb_typeof(coalesce(p_preferences->'cities','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_preferences->'intents','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_preferences->'must_have_vibes','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_attributes->'languages','[]'::jsonb)) <> 'array' then
    raise exception 'Matching lists are invalid';
  end if;
  select coalesce(array_agg(trim(value)), '{}') into normalized_cities
    from jsonb_array_elements_text(coalesce(p_preferences->'cities','[]'::jsonb)) value;
  begin
    select coalesce(array_agg(lower(trim(value))::public.relationship_intent), '{}') into normalized_intents
      from jsonb_array_elements_text(coalesce(p_preferences->'intents','[]'::jsonb)) value;
  exception when others then raise exception 'Relationship intent filter is invalid'; end;
  select coalesce(array_agg(trim(value)), '{}') into normalized_vibes
    from jsonb_array_elements_text(coalesce(p_preferences->'must_have_vibes','[]'::jsonb)) value;
  select coalesce(array_agg(trim(value)), '{}') into normalized_languages
    from jsonb_array_elements_text(coalesce(p_attributes->'languages','[]'::jsonb)) value;
  if cardinality(normalized_cities)>10 or cardinality(normalized_intents)>3
     or cardinality(normalized_vibes)>10 or cardinality(normalized_languages)>10 then
    raise exception 'Too many matching filters';
  end if;
  if exists(select 1 from unnest(normalized_cities||normalized_vibes||normalized_languages) value
            where char_length(value) not between 1 and 120) then raise exception 'Matching list value is invalid'; end if;

  insert into public.profile_match_attributes(
    user_id,gender,family_priority,children_intent,marriage_timeline,relocation,languages
  ) values (
    viewer,normalized_gender,
    coalesce(nullif(p_attributes->>'family_priority',''),'balanced'),
    coalesce(nullif(p_attributes->>'children_intent',''),'open'),
    coalesce(nullif(p_attributes->>'marriage_timeline',''),'2_3_years'),
    coalesce(nullif(p_attributes->>'relocation',''),'open'),normalized_languages
  ) on conflict(user_id) do update set
    gender=excluded.gender,family_priority=excluded.family_priority,
    children_intent=excluded.children_intent,marriage_timeline=excluded.marriage_timeline,
    relocation=excluded.relocation,languages=excluded.languages,updated_at=now();

  insert into public.matching_preferences(
    user_id,looking_for,min_age,max_age,cities,intents,must_have_vibes,
    family_priority,children,marriage_timeline,relocation,distance_preference,smart_discovery
  ) values (
    viewer,normalized_looking_for,normalized_min_age,normalized_max_age,normalized_cities,
    normalized_intents,normalized_vibes,
    coalesce(nullif(p_preferences->>'family_priority',''),'any'),
    coalesce(nullif(p_preferences->>'children',''),'any'),
    coalesce(nullif(p_preferences->>'marriage_timeline',''),'any'),
    coalesce(nullif(p_preferences->>'relocation',''),'any'),
    coalesce(nullif(p_preferences->>'distance_preference',''),'anywhere'),
    coalesce((p_preferences->>'smart_discovery')::boolean,true)
  ) on conflict(user_id) do update set
    looking_for=excluded.looking_for,min_age=excluded.min_age,max_age=excluded.max_age,
    cities=excluded.cities,intents=excluded.intents,must_have_vibes=excluded.must_have_vibes,
    family_priority=excluded.family_priority,children=excluded.children,
    marriage_timeline=excluded.marriage_timeline,relocation=excluded.relocation,
    distance_preference=excluded.distance_preference,smart_discovery=excluded.smart_discovery,
    updated_at=now();

  update public.user_preferences set smart_discovery=coalesce((p_preferences->>'smart_discovery')::boolean,true),updated_at=now()
    where user_id=viewer;
  delete from public.daily_match_recommendations where user_id=viewer and recommendation_day=current_date;
  return jsonb_build_object('saved',true,'updated_at',now());
end;
$$;

create or replace function public.matching_candidate_eligible(viewer uuid,candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select viewer is not null and candidate is not null and viewer<>candidate
    and exists(select 1 from public.profiles p where p.id=candidate and p.onboarding_complete)
    and exists(select 1 from public.profile_photos pp where pp.user_id=candidate and pp.approved)
    and not public.is_blocked_pair(viewer,candidate)
    and not exists(
      select 1 from public.matches m
      where viewer in(m.user_a,m.user_b) and candidate in(m.user_a,m.user_b)
        and m.status in('mutual','passed','blocked')
    )
    and not exists(select 1 from public.likes l where l.sender_id=viewer and l.recipient_id=candidate and l.decision='pass')
    and exists(
      select 1
      from public.profiles vp
      join public.profiles cp on cp.id=candidate
      join public.profile_match_attributes va on va.user_id=viewer
      join public.profile_match_attributes ca on ca.user_id=candidate
      join public.matching_preferences vf on vf.user_id=viewer
      join public.matching_preferences cf on cf.user_id=candidate
      join public.user_preferences vu on vu.user_id=viewer
      join public.user_preferences cu on cu.user_id=candidate
      where vp.id=viewer
        and extract(year from age(cp.birth_date))::integer between vf.min_age and vf.max_age
        and extract(year from age(vp.birth_date))::integer between cf.min_age and cf.max_age
        and (vf.looking_for='everyone' or (vf.looking_for='women' and ca.gender='woman') or (vf.looking_for='men' and ca.gender='man'))
        and (cf.looking_for='everyone' or (cf.looking_for='women' and va.gender='woman') or (cf.looking_for='men' and va.gender='man'))
        and (cardinality(vf.intents)=0 or cu.intent=any(vf.intents))
        and (cardinality(cf.intents)=0 or vu.intent=any(cf.intents))
        and cu.vibes @> vf.must_have_vibes and vu.vibes @> cf.must_have_vibes
        and (vf.family_priority='any' or ca.family_priority=vf.family_priority)
        and (vf.children='any' or ca.children_intent=vf.children)
        and (vf.marriage_timeline='any' or ca.marriage_timeline=vf.marriage_timeline)
        and (vf.relocation='any' or ca.relocation=vf.relocation)
        and (
          vf.distance_preference='anywhere'
          or (vf.distance_preference='open_to_relocate' and ca.relocation='open')
          or (vf.distance_preference='selected_cities' and exists(select 1 from unnest(vf.cities) city where lower(split_part(city,',',1))=lower(split_part(cp.city,',',1))))
          or (vf.distance_preference='same_state' and exists(select 1 from unnest(vf.cities) city where lower(trim(split_part(city,',',2)))=lower(trim(split_part(cp.city,',',2)))))
        )
    );
$$;

create or replace function public.get_current_member_bootstrap()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare viewer uuid:=auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  return jsonb_build_object(
    'user_id',viewer,
    'profile',(select to_jsonb(p) from public.profiles p where p.id=viewer),
    'preferences',(select to_jsonb(up) from public.user_preferences up where up.user_id=viewer),
    'matching_preferences',(select to_jsonb(mp) from public.matching_preferences mp where mp.user_id=viewer),
    'match_attributes',(select to_jsonb(ma) from public.profile_match_attributes ma where ma.user_id=viewer),
    'photos',coalesce((select jsonb_agg(jsonb_build_object('id',pp.id,'storage_path',pp.storage_path,'position',pp.position,'approved',pp.approved) order by pp.position) from public.profile_photos pp where pp.user_id=viewer),'[]'::jsonb)
  );
end;
$$;

drop function if exists public.daily_matches(integer);
create function public.daily_matches(result_limit integer default 5)
returns table(
  profile_id uuid,match_id uuid,first_name text,age integer,city text,profession text,
  bio text,verified boolean,gender text,intent text,vibes text[],family_priority text,
  children_intent text,marriage_timeline text,relocation text,languages text[],
  vouch_count integer,photo_paths text[],match_label text,reasons text[],model_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid:=auth.uid();
  active_version text;
  active_weights jsonb;
  candidate_row record;
  relationship_id uuid;
  next_rank integer:=0;
  candidate_score numeric;
  candidate_label public.match_label;
  candidate_reasons text[];
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.matching_preferences where user_id=viewer)
     or not exists(select 1 from public.profile_match_attributes where user_id=viewer) then
    raise exception 'Matching preferences are incomplete';
  end if;
  select version,weights into active_version,active_weights
    from public.matching_model_versions where status='active' order by activated_at desc nulls last limit 1;
  if active_version is null then raise exception 'Matching model is unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text||':daily-matches:'||current_date::text,0));

  if not exists(select 1 from public.daily_match_recommendations where user_id=viewer and recommendation_day=current_date) then
    for candidate_row in
      select base.*,
        least(100,greatest(0,
          coalesce((active_weights->>'base')::numeric,35)
          +case when base.intent=base.viewer_intent then coalesce((active_weights->>'intent')::numeric,18) else 0 end
          +least(3,base.shared_vibe_count)*coalesce((active_weights->>'shared_vibe')::numeric,6)
          +case when base.family_priority=base.viewer_family then coalesce((active_weights->>'family')::numeric,10) else 0 end
          +case when base.children_intent=base.viewer_children then coalesce((active_weights->>'children')::numeric,8) else 0 end
          +case when base.marriage_timeline=base.viewer_timeline then coalesce((active_weights->>'timeline')::numeric,8) else 0 end
          +case when base.relocation=base.viewer_relocation then coalesce((active_weights->>'relocation')::numeric,5) else 0 end
          +case when lower(split_part(base.city,',',1))=lower(split_part(base.viewer_city,',',1)) then coalesce((active_weights->>'same_city')::numeric,10) else 0 end
          +case when base.verified then coalesce((active_weights->>'verified')::numeric,4) else 0 end
          +least(3,base.vouches)*coalesce((active_weights->>'vouch')::numeric,2)
          +case base.learned_outcome when 'positive' then coalesce((active_weights->>'positive_outcome')::numeric,8) when 'negative' then coalesce((active_weights->>'negative_outcome')::numeric,-15) else 0 end
        )) computed_score
      from (
        select cp.id,cp.city,cp.verified,cu.intent,cu.vibes,ca.family_priority,
          ca.children_intent,ca.marriage_timeline,ca.relocation,
          coalesce((select count(*) from public.daily_match_recommendations exposure where exposure.target_id=cp.id and exposure.created_at>=now()-interval '30 days'),0) exposure_count,
          coalesce(
            (select case mf.feedback when 'not_aligned' then 'negative' else 'positive' end
             from public.match_feedback mf join public.matches fm on fm.id=mf.match_id
             where mf.user_id=viewer and mf.use_for_matching and cp.id in(fm.user_a,fm.user_b)
             order by mf.updated_at desc limit 1),
            (select rls.signal from public.relationship_learning_signals rls
             join public.relationship_reflections rr on rr.id=rls.source_reflection_id
             join public.date_proposals dp on dp.id=rr.date_proposal_id
             join public.matches rm on rm.id=dp.match_id
             where rls.user_id=viewer and rls.active and cp.id in(rm.user_a,rm.user_b)
             order by rls.updated_at desc limit 1),''
          ) learned_outcome,
          (select count(*)::integer from unnest(cu.vibes) candidate_vibe,public.user_preferences viewer_preferences
            where viewer_preferences.user_id=viewer and candidate_vibe=any(viewer_preferences.vibes)) shared_vibe_count,
          coalesce((select count(*) from public.trusted_vouches tv where tv.user_id=cp.id and tv.status='complete'),0) vouches,
          (select vp.city from public.profiles vp where vp.id=viewer) viewer_city,
          (select vu.intent from public.user_preferences vu where vu.user_id=viewer) viewer_intent,
          (select vu.vibes from public.user_preferences vu where vu.user_id=viewer) viewer_vibes,
          (select va.family_priority from public.profile_match_attributes va where va.user_id=viewer) viewer_family,
          (select va.children_intent from public.profile_match_attributes va where va.user_id=viewer) viewer_children,
          (select va.marriage_timeline from public.profile_match_attributes va where va.user_id=viewer) viewer_timeline,
          (select va.relocation from public.profile_match_attributes va where va.user_id=viewer) viewer_relocation
        from public.profiles cp
        join public.user_preferences cu on cu.user_id=cp.id
        join public.profile_match_attributes ca on ca.user_id=cp.id
        where public.matching_candidate_eligible(viewer,cp.id)
      ) base
      order by computed_score desc,base.exposure_count asc,md5(viewer::text||base.id::text||current_date::text)
    loop
      candidate_score:=candidate_row.computed_score;
      candidate_label:=case when candidate_score>=82 then 'exceptional'::public.match_label when candidate_score>=64 then 'great'::public.match_label else 'strong'::public.match_label end;
      candidate_reasons:=(array_remove(array[
        case when candidate_row.intent=candidate_row.viewer_intent then 'Same relationship intent' end,
        case when candidate_row.shared_vibe_count>0 then 'Shared values and lifestyle' end,
        case when candidate_row.family_priority=candidate_row.viewer_family then 'Family expectations align' end,
        case when candidate_row.children_intent=candidate_row.viewer_children then 'Future plans align' end,
        case when lower(split_part(candidate_row.city,',',1))=lower(split_part(candidate_row.viewer_city,',',1)) then 'Same-city preference' end,
        case when candidate_row.verified then 'Verified profile' end
      ],null))[1:3];
      if cardinality(candidate_reasons)=0 then candidate_reasons:=array['Core preferences align']; end if;

      relationship_id:=null;
      insert into public.matches(user_a,user_b,label,score_internal,status)
      values(least(viewer,candidate_row.id),greatest(viewer,candidate_row.id),candidate_label,candidate_score,'suggested')
      on conflict(user_a,user_b) do update set label=excluded.label,score_internal=excluded.score_internal
        where public.matches.status='suggested'
      returning id into relationship_id;
      if relationship_id is null then
        select id into relationship_id from public.matches where user_a=least(viewer,candidate_row.id) and user_b=greatest(viewer,candidate_row.id) and status='suggested';
      end if;
      if relationship_id is not null then
        next_rank:=next_rank+1;
        insert into public.daily_match_recommendations(user_id,target_id,match_id,recommendation_day,rank,label,reasons,model_version,score_internal)
        values(viewer,candidate_row.id,relationship_id,current_date,next_rank,candidate_label,candidate_reasons,active_version,candidate_score)
        on conflict(user_id,target_id,recommendation_day) do nothing;
      end if;
      exit when next_rank>=least(greatest(result_limit,1),5);
    end loop;
  end if;

  return query
  select p.id,r.match_id,p.first_name,extract(year from age(p.birth_date))::integer,p.city,p.profession,
    p.bio,p.verified,a.gender,u.intent::text,u.vibes,a.family_priority,a.children_intent,
    a.marriage_timeline,a.relocation,a.languages,
    (select count(*)::integer from public.trusted_vouches tv where tv.user_id=p.id and tv.status='complete'),
    array(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.approved order by pp.position),
    initcap(r.label::text),r.reasons,r.model_version
  from public.daily_match_recommendations r
  join public.profiles p on p.id=r.target_id
  join public.user_preferences u on u.user_id=p.id
  join public.profile_match_attributes a on a.user_id=p.id
  where r.user_id=viewer and r.recommendation_day=current_date
    and public.matching_candidate_eligible(viewer,p.id)
  order by r.rank
  limit least(greatest(result_limit,1),5);
end;
$$;

create or replace function public.submit_match_decision(recipient_id uuid,decision text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  viewer uuid:=auth.uid(); normalized_decision text:=lower(trim(decision));
  previous_decision text; recent_count integer; user_one uuid; user_two uuid;
  matched_id uuid; did_match boolean:=false; mutual_already boolean:=false;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if recipient_id is null or recipient_id=viewer then raise exception 'Invalid match decision recipient.'; end if;
  if normalized_decision not in('interested','pass') then raise exception 'Unsupported match decision.'; end if;
  if public.is_blocked_pair(viewer,recipient_id)
     or not exists(select 1 from public.profiles where id=recipient_id and onboarding_complete) then
    raise exception 'This member is unavailable.';
  end if;
  if not exists(select 1 from public.daily_match_recommendations where user_id=viewer and target_id=recipient_id and recommendation_day=current_date)
     and not exists(select 1 from public.likes where sender_id=recipient_id and recipient_id=viewer and decision='interested') then
    raise exception 'This member is not in your current introductions.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text||':decision:'||recipient_id::text,0));
  select l.decision into previous_decision from public.likes l where l.sender_id=viewer and l.recipient_id=recipient_id;
  if previous_decision is distinct from normalized_decision then
    select count(*) into recent_count from public.discovery_signals where user_id=viewer and created_at>=now()-interval '24 hours';
    if recent_count>=120 then raise exception 'Daily match decision limit reached'; end if;
  end if;
  insert into public.likes(sender_id,recipient_id,decision)
  values(viewer,recipient_id,normalized_decision)
  on conflict(sender_id,recipient_id) do update set decision=excluded.decision,created_at=now();
  if previous_decision is distinct from normalized_decision then
    insert into public.discovery_signals(user_id,target_id,signal)
    values(viewer,recipient_id,case when normalized_decision='pass' then 'skip' else 'interested' end);
  end if;
  if normalized_decision='pass' then
    update public.matches set status='passed' where status='suggested' and viewer in(user_a,user_b) and recipient_id in(user_a,user_b);
    return jsonb_build_object('matched',false,'decision',normalized_decision,'match_id',null);
  end if;
  select exists(select 1 from public.likes where sender_id=recipient_id and recipient_id=viewer and decision='interested') into did_match;
  if did_match then
    select exists(select 1 from public.matches where viewer in(user_a,user_b) and recipient_id in(user_a,user_b) and status='mutual') into mutual_already;
    user_one:=least(viewer,recipient_id);user_two:=greatest(viewer,recipient_id);
    insert into public.matches(user_a,user_b,label,score_internal,status,matched_at)
    values(user_one,user_two,'great',84,'mutual',now())
    on conflict(user_a,user_b) do update set status='mutual',matched_at=coalesce(public.matches.matched_at,now())
    returning id into matched_id;
    if not mutual_already then
      insert into public.member_notifications(user_id,type,title,body,metadata)
      values
        (recipient_id,'mutual_match','It’s a Match','You both chose each other on DestinyOne.',jsonb_build_object('match_id',matched_id,'member_id',viewer)),
        (viewer,'mutual_match','It’s a Match','You both chose each other on DestinyOne.',jsonb_build_object('match_id',matched_id,'member_id',recipient_id));
    end if;
  end if;
  return jsonb_build_object('matched',did_match,'decision',normalized_decision,'match_id',matched_id);
end;
$$;

create or replace function public.submit_match_feedback(
  p_match_id uuid,p_feedback text,p_use_for_matching boolean,p_client_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare viewer uuid:=auth.uid(); normalized_id text:=trim(coalesce(p_client_action_id,'')); feedback_row public.match_feedback%rowtype;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_feedback not in('promising','not_aligned','met_in_person') then raise exception 'Feedback choice is invalid'; end if;
  if char_length(normalized_id) not between 8 and 120 or normalized_id!~'^[A-Za-z0-9][A-Za-z0-9._:-]+$' then raise exception 'Invalid client action id'; end if;
  if not exists(select 1 from public.matches where id=p_match_id and viewer in(user_a,user_b) and status in('mutual','passed')) then raise exception 'Relationship was not found'; end if;
  insert into public.match_feedback(user_id,match_id,feedback,use_for_matching,client_action_id)
  values(viewer,p_match_id,p_feedback,p_use_for_matching,normalized_id)
  on conflict(user_id,match_id) do update set feedback=excluded.feedback,use_for_matching=excluded.use_for_matching,client_action_id=excluded.client_action_id,updated_at=now()
  returning * into feedback_row;
  return jsonb_build_object('feedback',feedback_row.feedback,'use_for_matching',feedback_row.use_for_matching,'updated_at',feedback_row.updated_at);
end;
$$;

create or replace function public.record_discovery_signal(
  p_target_id uuid,p_signal text,p_client_action_id text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); normalized_id text:=trim(coalesce(p_client_action_id,'')); signal_row public.discovery_signals%rowtype; recent_count integer;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if p_target_id is null or p_target_id=viewer or public.is_blocked_pair(viewer,p_target_id) then raise exception 'Member is unavailable'; end if;
  if p_signal not in('view','interested','skip') then raise exception 'Discovery signal is invalid'; end if;
  if char_length(normalized_id) not between 8 and 120 or normalized_id!~'^[A-Za-z0-9][A-Za-z0-9._:-]+$' then raise exception 'Invalid client action id'; end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text||':discovery',0));
  select * into signal_row from public.discovery_signals where user_id=viewer and client_action_id=normalized_id;
  if found then return to_jsonb(signal_row); end if;
  select count(*) into recent_count from public.discovery_signals where user_id=viewer and created_at>=now()-interval '24 hours';
  if recent_count>=120 then raise exception 'Daily discovery signal limit reached'; end if;
  insert into public.discovery_signals(user_id,target_id,signal,client_action_id)
  values(viewer,p_target_id,p_signal,normalized_id) returning * into signal_row;
  return to_jsonb(signal_row);
end;
$$;

create or replace function public.clear_matching_learning()
returns void language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  delete from public.discovery_signals where user_id=viewer;
  update public.relationship_learning_signals set active=false,updated_at=now() where user_id=viewer;
  update public.match_feedback set use_for_matching=false,updated_at=now() where user_id=viewer;
  delete from public.daily_match_recommendations where user_id=viewer and recommendation_day=current_date;
end;
$$;

create or replace function public.activate_matching_model(p_version text,p_metrics jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.matching_model_versions where version=p_version) then raise exception 'Matching model was not found'; end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or exists(select 1 from jsonb_object_keys(coalesce(p_metrics,'{}'::jsonb)) key where key not in('reason','rollback_from','approved_by_role')) then
    raise exception 'Activation audit metrics are invalid';
  end if;
  update public.matching_model_versions set status='retired' where status='active';
  update public.matching_model_versions set status='active',activated_at=now() where version=p_version;
  insert into public.matching_model_events(model_version,action,metrics) values(p_version,'activated',coalesce(p_metrics,'{}'::jsonb));
end;
$$;

create or replace function public.record_matching_quality_snapshot(p_metrics jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare active_version text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or exists(select 1 from jsonb_object_keys(coalesce(p_metrics,'{}'::jsonb)) key where key not in(
       'eligible_members','recommendations','mutual_rate','conversation_rate','date_acceptance_rate',
       'report_rate','exposure_p50','exposure_p95','max_group_exposure_gap','evaluation_window_days'
     )) then raise exception 'Quality metrics are invalid'; end if;
  if exists(select 1 from jsonb_each(coalesce(p_metrics,'{}'::jsonb)) metric where jsonb_typeof(metric.value)<>'number') then
    raise exception 'Quality metrics must be numeric';
  end if;
  select version into active_version from public.matching_model_versions where status='active';
  if active_version is null then raise exception 'Matching model is unavailable'; end if;
  insert into public.matching_model_events(model_version,action,metrics)
  values(active_version,'quality_snapshot',coalesce(p_metrics,'{}'::jsonb));
end;
$$;

revoke all on public.profile_match_attributes,public.matching_preferences,public.matching_model_versions,
  public.daily_match_recommendations,public.match_feedback,public.matching_model_events from anon,authenticated;
revoke insert,update,delete on public.discovery_signals from authenticated;
grant select on public.profile_match_attributes,public.matching_preferences,public.match_feedback to authenticated;
grant select(id,user_id,target_id,match_id,recommendation_day,rank,label,reasons,model_version,created_at)
  on public.daily_match_recommendations to authenticated;
grant select(version,status,notes,activated_at,created_at) on public.matching_model_versions to authenticated;

revoke all on function public.save_matching_preferences(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.matching_candidate_eligible(uuid,uuid) from public,anon,authenticated;
revoke all on function public.daily_matches(integer) from public,anon,authenticated;
revoke all on function public.submit_match_feedback(uuid,text,boolean,text) from public,anon,authenticated;
revoke all on function public.record_discovery_signal(uuid,text,text) from public,anon,authenticated;
revoke all on function public.clear_matching_learning() from public,anon,authenticated;
revoke all on function public.activate_matching_model(text,jsonb) from public,anon,authenticated;
revoke all on function public.record_matching_quality_snapshot(jsonb) from public,anon,authenticated;
grant execute on function public.save_matching_preferences(jsonb,jsonb) to authenticated;
grant execute on function public.daily_matches(integer) to authenticated;
grant execute on function public.submit_match_feedback(uuid,text,boolean,text) to authenticated;
grant execute on function public.record_discovery_signal(uuid,text,text) to authenticated;
grant execute on function public.clear_matching_learning() to authenticated;
grant execute on function public.activate_matching_model(text,jsonb) to service_role;
grant execute on function public.record_matching_quality_snapshot(jsonb) to service_role;
