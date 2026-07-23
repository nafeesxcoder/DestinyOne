-- Matching intelligence v2: fully reciprocal hard preferences, verified-only
-- discovery, repeat cooldowns, bounded consented learning, exposure balancing,
-- sparse-pool status, and model rollout/rollback guardrails.

create table if not exists public.matching_model_guardrails (
  model_version text primary key references public.matching_model_versions(version) on delete cascade,
  minimum_recommendations integer not null check (minimum_recommendations >= 100),
  minimum_conversation_rate numeric(6,5) not null check (minimum_conversation_rate between 0 and 1),
  minimum_date_acceptance_rate numeric(6,5) not null check (minimum_date_acceptance_rate between 0 and 1),
  maximum_report_rate numeric(6,5) not null check (maximum_report_rate between 0 and 1),
  maximum_exposure_gap numeric(6,5) not null check (maximum_exposure_gap between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.matching_model_guardrails enable row level security;

insert into public.matching_model_versions(version,status,weights,notes)
values (
  'intentional-v2','retired',
  '{"base":32,"intent":18,"shared_vibe":6,"shared_language":4,"family":10,"children":8,"timeline":8,"relocation":5,"same_city":9,"verified":4,"vouch":2,"positive_outcome_similarity":2,"new_member_boost":4,"exposure_penalty":2}'::jsonb,
  'Reciprocal serious-relationship ranking with positive-only consented learning and exposure balancing.'
)
on conflict(version) do update set weights=excluded.weights,notes=excluded.notes;

insert into public.matching_model_guardrails(
  model_version,minimum_recommendations,minimum_conversation_rate,
  minimum_date_acceptance_rate,maximum_report_rate,maximum_exposure_gap
) values ('intentional-v2',500,0.08,0.03,0.02,0.25)
on conflict(model_version) do update set
  minimum_recommendations=excluded.minimum_recommendations,
  minimum_conversation_rate=excluded.minimum_conversation_rate,
  minimum_date_acceptance_rate=excluded.minimum_date_acceptance_rate,
  maximum_report_rate=excluded.maximum_report_rate,
  maximum_exposure_gap=excluded.maximum_exposure_gap,
  updated_at=now();

update public.matching_model_versions set status='retired' where status='active';
update public.matching_model_versions set status='active',activated_at=now() where version='intentional-v2';
insert into public.matching_model_events(model_version,action,metrics)
values('intentional-v2','activated',jsonb_build_object(
  'reason','v2 reciprocal quality migration',
  'change_ticket','migration-022',
  'approved_by_role','database migration'
));

create or replace function public.matching_location_eligible(
  p_distance text,
  p_cities text[],
  p_actor_city text,
  p_other_city text,
  p_other_relocation text
)
returns boolean
language sql
immutable
set search_path=public
as $$
  select case p_distance
    when 'anywhere' then true
    when 'open_to_relocate' then p_other_relocation='open'
    when 'selected_cities' then cardinality(p_cities)>0 and exists(
      select 1 from unnest(p_cities) city
      where lower(trim(split_part(city,',',1)))=lower(trim(split_part(p_other_city,',',1)))
    )
    when 'same_state' then
      nullif(lower(trim(split_part(p_actor_city,',',2))),'') is not null
      and lower(trim(split_part(p_actor_city,',',2)))=lower(trim(split_part(p_other_city,',',2)))
    else false
  end;
$$;

create or replace function public.matching_candidate_eligible(viewer uuid,candidate uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select viewer is not null and candidate is not null and viewer<>candidate
    and exists(select 1 from public.profiles p where p.id=viewer and p.onboarding_complete and p.verified)
    and exists(select 1 from public.profiles p where p.id=candidate and p.onboarding_complete and p.verified)
    and exists(select 1 from public.profile_photos pp where pp.user_id=candidate and pp.approved)
    and not public.is_blocked_pair(viewer,candidate)
    and not exists(
      select 1 from public.matches m
      where viewer in(m.user_a,m.user_b) and candidate in(m.user_a,m.user_b)
        and m.status in('mutual','passed','blocked')
    )
    and not exists(select 1 from public.likes l where l.sender_id=viewer and l.recipient_id=candidate)
    and not exists(
      select 1 from public.daily_match_recommendations r
      where r.user_id=viewer and r.target_id=candidate
        and r.recommendation_day<current_date
        and r.recommendation_day>=current_date-14
    )
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
        and (cf.family_priority='any' or va.family_priority=cf.family_priority)
        and (vf.children='any' or ca.children_intent=vf.children)
        and (cf.children='any' or va.children_intent=cf.children)
        and (vf.marriage_timeline='any' or ca.marriage_timeline=vf.marriage_timeline)
        and (cf.marriage_timeline='any' or va.marriage_timeline=cf.marriage_timeline)
        and (
          vf.relocation='any'
          or (vf.relocation='open' and ca.relocation='open')
          or (vf.relocation='same_city' and lower(trim(split_part(vp.city,',',1)))=lower(trim(split_part(cp.city,',',1))))
        )
        and (
          cf.relocation='any'
          or (cf.relocation='open' and va.relocation='open')
          or (cf.relocation='same_city' and lower(trim(split_part(vp.city,',',1)))=lower(trim(split_part(cp.city,',',1))))
        )
        and public.matching_location_eligible(vf.distance_preference,vf.cities,vp.city,cp.city,ca.relocation)
        and public.matching_location_eligible(cf.distance_preference,cf.cities,cp.city,vp.city,va.relocation)
    );
$$;

create or replace function public.rank_matching_candidates(p_viewer uuid)
returns table(candidate_id uuid,computed_score numeric,reasons text[],model_version text)
language sql
stable
security definer
set search_path=public
as $$
  with viewer_state as (
    select p.city viewer_city,u.intent viewer_intent,u.vibes viewer_vibes,
      a.family_priority viewer_family,a.children_intent viewer_children,
      a.marriage_timeline viewer_timeline,a.relocation viewer_relocation,
      a.languages viewer_languages
    from public.profiles p
    join public.user_preferences u on u.user_id=p.id
    join public.profile_match_attributes a on a.user_id=p.id
    where p.id=p_viewer
  ), active_model as (
    select version,weights from public.matching_model_versions
    where status='active' order by activated_at desc nulls last limit 1
  ), candidate_base as (
    select cp.id,cp.city,cp.verified,cp.created_at,cu.intent,cu.vibes,
      ca.family_priority,ca.children_intent,ca.marriage_timeline,ca.relocation,ca.languages,
      vs.*,am.version,am.weights,
      coalesce((select count(*) from public.daily_match_recommendations exposure
        where exposure.target_id=cp.id and exposure.created_at>=now()-interval '30 days'),0) exposure_count,
      coalesce((select count(*) from (
        select unnest(cu.vibes) intersect select unnest(vs.viewer_vibes)
      ) shared),0) shared_vibe_count,
      coalesce((select count(*) from (
        select unnest(ca.languages) intersect select unnest(vs.viewer_languages)
      ) shared),0) shared_language_count,
      coalesce((select count(*) from public.trusted_vouches tv where tv.user_id=cp.id and tv.status='complete'),0) vouches,
      least(4,coalesce(learning.positive_similarity,0)) positive_similarity
    from public.profiles cp
    join public.user_preferences cu on cu.user_id=cp.id
    join public.profile_match_attributes ca on ca.user_id=cp.id
    cross join viewer_state vs
    cross join active_model am
    left join lateral (
      select sum(least(3,
        (prior_u.intent=cu.intent)::integer
        +(prior_a.family_priority=ca.family_priority)::integer
        +(prior_a.children_intent=ca.children_intent)::integer
        +(prior_a.marriage_timeline=ca.marriage_timeline)::integer
      ))::integer positive_similarity
      from public.match_feedback mf
      join public.matches prior_match on prior_match.id=mf.match_id
      join public.user_preferences prior_u on prior_u.user_id=case when prior_match.user_a=p_viewer then prior_match.user_b else prior_match.user_a end
      join public.profile_match_attributes prior_a on prior_a.user_id=prior_u.user_id
      where mf.user_id=p_viewer and mf.use_for_matching
        and mf.feedback in('promising','met_in_person')
    ) learning on true
    where public.matching_candidate_eligible(p_viewer,cp.id)
  ), scored as (
    select base.*,
      least(100,greatest(0,
        coalesce((weights->>'base')::numeric,32)
        +case when intent=viewer_intent then coalesce((weights->>'intent')::numeric,18) else 0 end
        +least(3,shared_vibe_count)*coalesce((weights->>'shared_vibe')::numeric,6)
        +least(2,shared_language_count)*coalesce((weights->>'shared_language')::numeric,4)
        +case when family_priority=viewer_family then coalesce((weights->>'family')::numeric,10) else 0 end
        +case when children_intent=viewer_children then coalesce((weights->>'children')::numeric,8) else 0 end
        +case when marriage_timeline=viewer_timeline then coalesce((weights->>'timeline')::numeric,8) else 0 end
        +case when relocation=viewer_relocation then coalesce((weights->>'relocation')::numeric,5) else 0 end
        +case when lower(trim(split_part(city,',',1)))=lower(trim(split_part(viewer_city,',',1))) then coalesce((weights->>'same_city')::numeric,9) else 0 end
        +case when verified then coalesce((weights->>'verified')::numeric,4) else 0 end
        +least(3,vouches)*coalesce((weights->>'vouch')::numeric,2)
        +positive_similarity*coalesce((weights->>'positive_outcome_similarity')::numeric,2)
        +case when created_at>=now()-interval '14 days' then coalesce((weights->>'new_member_boost')::numeric,4) else 0 end
        -least(5,exposure_count)*coalesce((weights->>'exposure_penalty')::numeric,2)
      )) score
    from candidate_base base
  )
  select id,score,
    case when cardinality(candidate_reasons)>0 then candidate_reasons else array['Core preferences align'] end,
    version
  from (
    select scored.*,(array_remove(array[
      case when intent=viewer_intent then 'Same relationship intent' end,
      case when shared_vibe_count>0 then 'Shared values and lifestyle' end,
      case when shared_language_count>0 then 'A language in common' end,
      case when family_priority=viewer_family then 'Family expectations align' end,
      case when children_intent=viewer_children then 'Future plans align' end,
      case when lower(trim(split_part(city,',',1)))=lower(trim(split_part(viewer_city,',',1))) then 'Same-city preference' end,
      case when verified then 'Verified profile' end
    ],null))[1:3] candidate_reasons
    from scored
  ) ranked
  order by score desc,exposure_count asc,md5(p_viewer::text||id::text||current_date::text);
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
set search_path=public
as $$
declare
  viewer uuid:=auth.uid(); candidate_row record; relationship_id uuid; next_rank integer:=0;
  candidate_label public.match_label;
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.matching_preferences where user_id=viewer)
     or not exists(select 1 from public.profile_match_attributes where user_id=viewer) then
    raise exception 'Matching preferences are incomplete';
  end if;
  if not exists(select 1 from public.matching_model_versions where status='active') then raise exception 'Matching model is unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text||':daily-matches:'||current_date::text,0));

  if not exists(select 1 from public.daily_match_recommendations where user_id=viewer and recommendation_day=current_date) then
    for candidate_row in select * from public.rank_matching_candidates(viewer)
    loop
      candidate_label:=case when candidate_row.computed_score>=82 then 'exceptional'::public.match_label when candidate_row.computed_score>=64 then 'great'::public.match_label else 'strong'::public.match_label end;
      relationship_id:=null;
      insert into public.matches(user_a,user_b,label,score_internal,status)
      values(least(viewer,candidate_row.candidate_id),greatest(viewer,candidate_row.candidate_id),candidate_label,candidate_row.computed_score,'suggested')
      on conflict(user_a,user_b) do update set label=excluded.label,score_internal=excluded.score_internal
        where public.matches.status='suggested'
      returning id into relationship_id;
      if relationship_id is null then
        select id into relationship_id from public.matches
        where user_a=least(viewer,candidate_row.candidate_id) and user_b=greatest(viewer,candidate_row.candidate_id) and status='suggested';
      end if;
      if relationship_id is not null then
        next_rank:=next_rank+1;
        insert into public.daily_match_recommendations(user_id,target_id,match_id,recommendation_day,rank,label,reasons,model_version,score_internal)
        values(viewer,candidate_row.candidate_id,relationship_id,current_date,next_rank,candidate_label,candidate_row.reasons,candidate_row.model_version,candidate_row.computed_score)
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

create or replace function public.get_matching_pool_status()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare viewer uuid:=auth.uid(); eligible_count integer:=0; status text; suggestions text[];
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.profiles where id=viewer and onboarding_complete) then
    status:='profile_incomplete';suggestions:=array['Complete your relationship profile'];
  elsif not exists(select 1 from public.profiles where id=viewer and verified) then
    status:='verification_required';suggestions:=array['Complete selfie verification to enter discovery'];
  elsif not exists(select 1 from public.matching_preferences where user_id=viewer)
     or not exists(select 1 from public.profile_match_attributes where user_id=viewer) then
    status:='preferences_incomplete';suggestions:=array['Complete your matching preferences'];
  else
    select count(*) into eligible_count from public.profiles p where public.matching_candidate_eligible(viewer,p.id);
    status:=case when eligible_count>=5 then 'ready' when eligible_count>0 then 'sparse' else 'empty' end;
    suggestions:=case when eligible_count>=5 then array[]::text[] when eligible_count>0 then array['Your hard preferences stay protected while more verified members join'] else array['Widen only the preferences you are comfortable changing','Join the city waitlist for new verified introductions'] end;
  end if;
  return jsonb_build_object('status',status,'eligible_count',eligible_count,'daily_limit',5,'repeat_cooldown_days',14,'suggestions',suggestions);
end;
$$;

alter table public.matching_model_events drop constraint if exists matching_model_events_action_check;
alter table public.matching_model_events add constraint matching_model_events_action_check
  check(action in('activated','quality_snapshot','rollback'));

create or replace function public.activate_matching_model(p_version text,p_metrics jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.matching_model_versions where version=p_version) then raise exception 'Matching model was not found'; end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or exists(select 1 from jsonb_object_keys(coalesce(p_metrics,'{}'::jsonb)) key where key not in('reason','rollback_from','approved_by_role','change_ticket'))
     or nullif(trim(p_metrics->>'reason'),'') is null
     or nullif(trim(p_metrics->>'approved_by_role'),'') is null
     or nullif(trim(p_metrics->>'change_ticket'),'') is null then
    raise exception 'Activation audit metrics are invalid';
  end if;
  update public.matching_model_versions set status='retired' where status='active';
  update public.matching_model_versions set status='active',activated_at=now() where version=p_version;
  insert into public.matching_model_events(model_version,action,metrics) values(p_version,'activated',p_metrics);
end;
$$;

drop function if exists public.record_matching_quality_snapshot(jsonb);
create function public.record_matching_quality_snapshot(p_metrics jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare active_version text; guard public.matching_model_guardrails%rowtype; evaluation text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if jsonb_typeof(coalesce(p_metrics,'{}'::jsonb))<>'object'
     or not (p_metrics ?& array['recommendations','conversation_rate','date_acceptance_rate','report_rate','max_group_exposure_gap','evaluation_window_days'])
     or exists(select 1 from jsonb_object_keys(p_metrics) key where key not in(
       'eligible_members','recommendations','mutual_rate','conversation_rate','date_acceptance_rate',
       'report_rate','exposure_p50','exposure_p95','max_group_exposure_gap','evaluation_window_days'
     ))
     or exists(select 1 from jsonb_each(p_metrics) metric where jsonb_typeof(metric.value)<>'number') then
    raise exception 'Quality metrics are invalid';
  end if;
  if (p_metrics->>'recommendations')::numeric<0 or (p_metrics->>'evaluation_window_days')::numeric<=0
     or exists(select 1 from (values
       ((p_metrics->>'conversation_rate')::numeric),((p_metrics->>'date_acceptance_rate')::numeric),
       ((p_metrics->>'report_rate')::numeric),((p_metrics->>'max_group_exposure_gap')::numeric)
     ) rate(value) where value not between 0 and 1) then raise exception 'Quality metrics are out of range'; end if;
  select version into active_version from public.matching_model_versions where status='active';
  select * into guard from public.matching_model_guardrails where model_version=active_version;
  if active_version is null or guard.model_version is null then raise exception 'Matching model guardrails are unavailable'; end if;
  evaluation:=case
    when (p_metrics->>'recommendations')::numeric<guard.minimum_recommendations then 'insufficient_data'
    when (p_metrics->>'conversation_rate')::numeric<guard.minimum_conversation_rate
      or (p_metrics->>'date_acceptance_rate')::numeric<guard.minimum_date_acceptance_rate
      or (p_metrics->>'report_rate')::numeric>guard.maximum_report_rate
      or (p_metrics->>'max_group_exposure_gap')::numeric>guard.maximum_exposure_gap then 'rollback_required'
    else 'healthy' end;
  insert into public.matching_model_events(model_version,action,metrics)
  values(active_version,'quality_snapshot',p_metrics||jsonb_build_object('evaluation_status',evaluation));
  return jsonb_build_object('model_version',active_version,'evaluation_status',evaluation);
end;
$$;

create or replace function public.rollback_matching_model(p_version text,p_reason text,p_change_ticket text)
returns void language plpgsql security definer set search_path=public as $$
declare previous_version text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 8 and 500
     or char_length(trim(coalesce(p_change_ticket,''))) not between 3 and 120 then raise exception 'Rollback audit details are invalid'; end if;
  select version into previous_version from public.matching_model_versions where status='active';
  if not exists(select 1 from public.matching_model_versions where version=p_version and status='retired') then raise exception 'Rollback model was not found'; end if;
  update public.matching_model_versions set status='retired' where status='active';
  update public.matching_model_versions set status='active',activated_at=now() where version=p_version;
  insert into public.matching_model_events(model_version,action,metrics)
  values(p_version,'rollback',jsonb_build_object('reason',trim(p_reason),'change_ticket',trim(p_change_ticket),'rollback_from',previous_version));
end;
$$;

revoke all on public.matching_model_guardrails from public,anon,authenticated;
revoke all on function public.matching_location_eligible(text,text[],text,text,text) from public,anon,authenticated;
revoke all on function public.matching_candidate_eligible(uuid,uuid) from public,anon,authenticated;
revoke all on function public.rank_matching_candidates(uuid) from public,anon,authenticated;
revoke all on function public.daily_matches(integer) from public,anon,authenticated;
revoke all on function public.get_matching_pool_status() from public,anon,authenticated;
revoke all on function public.activate_matching_model(text,jsonb) from public,anon,authenticated;
revoke all on function public.record_matching_quality_snapshot(jsonb) from public,anon,authenticated;
revoke all on function public.rollback_matching_model(text,text,text) from public,anon,authenticated;
grant execute on function public.daily_matches(integer) to authenticated;
grant execute on function public.get_matching_pool_status() to authenticated;
grant execute on function public.activate_matching_model(text,jsonb) to service_role;
grant execute on function public.record_matching_quality_snapshot(jsonb) to service_role;
grant execute on function public.rollback_matching_model(text,text,text) to service_role;

create or replace function public.get_backend_deployment_manifest()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'contract_id','destinyone-backend-v22','schema_version',22,
    'tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),'[]'::jsonb),
    'functions',coalesce((select jsonb_agg(names.proname order by names.proname) from (select distinct p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public') names),'[]'::jsonb),
    'rls_disabled_tables',coalesce((select jsonb_agg(c.relname order by c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'[]'::jsonb)
  );
$$;
revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
