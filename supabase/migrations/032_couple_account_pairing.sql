-- Private two-account pairing for Couple Mode using exact verified phone search.
-- Phone numbers never enter public profile tables and partial search is not supported.

create table public.member_experience_modes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mode text not null default 'seeking' check (mode in ('seeking','couple')),
  updated_at timestamptz not null default now()
);

create table public.couple_connections (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','paused','disconnected')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz
);

create table public.couple_connection_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.couple_connections(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(connection_id,user_id)
);

create table public.couple_connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  client_request_id text not null check (char_length(client_request_id) between 8 and 160),
  expires_at timestamptz not null default (now()+interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (requester_id<>recipient_id),
  unique(requester_id,client_request_id)
);

create unique index couple_connection_requests_pending_pair_idx
  on public.couple_connection_requests(least(requester_id,recipient_id),greatest(requester_id,recipient_id)) where status='pending';
create index couple_connection_requests_recipient_idx on public.couple_connection_requests(recipient_id,status,created_at desc);
create index couple_connection_members_connection_idx on public.couple_connection_members(connection_id);

create table public.couple_phone_search_audit (
  id bigint generated always as identity primary key,
  searcher_id uuid not null references public.profiles(id) on delete cascade,
  target_phone_hash text not null check (char_length(target_phone_hash)=64),
  result_found boolean not null default false,
  client_request_id text not null check (char_length(client_request_id) between 8 and 160),
  created_at timestamptz not null default now(),
  unique(searcher_id,client_request_id)
);

alter table public.member_experience_modes enable row level security;
alter table public.couple_connections enable row level security;
alter table public.couple_connection_members enable row level security;
alter table public.couple_connection_requests enable row level security;
alter table public.couple_phone_search_audit enable row level security;

create policy member_experience_modes_select_self on public.member_experience_modes for select using (user_id=auth.uid());
create policy couple_connections_select_member on public.couple_connections for select using (
  exists(select 1 from public.couple_connection_members cm where cm.connection_id=id and cm.user_id=auth.uid())
);
create policy couple_connection_members_select_pair on public.couple_connection_members for select using (
  exists(select 1 from public.couple_connection_members mine where mine.connection_id=couple_connection_members.connection_id and mine.user_id=auth.uid())
);
create policy couple_connection_requests_select_participant on public.couple_connection_requests for select using (requester_id=auth.uid() or recipient_id=auth.uid());

create or replace function public.couple_partner_summary(p_member_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'member_id',p.id,'display_name',p.first_name,'city',p.city,'profession',p.profession,'verified',p.verified
  ) from public.profiles p where p.id=p_member_id and p.onboarding_complete;
$$;

create or replace function public.save_couple_mode_profile(p_first_name text,p_birth_date date,p_city text,p_profession text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if char_length(trim(coalesce(p_first_name,''))) not between 2 and 60 then raise exception 'Invalid first name'; end if;
  if p_birth_date is null or p_birth_date>current_date-interval '18 years' or p_birth_date<current_date-interval '90 years' then raise exception 'Couple Mode is for adults 18+'; end if;
  if char_length(trim(coalesce(p_city,''))) not between 2 and 120 then raise exception 'Invalid city'; end if;
  if char_length(trim(coalesce(p_profession,''))) not between 2 and 120 then raise exception 'Invalid profession'; end if;
  insert into public.profiles(id,first_name,birth_date,city,profession,onboarding_complete,updated_at)
    values(actor,trim(p_first_name),p_birth_date,trim(p_city),trim(p_profession),true,now())
    on conflict(id) do update set first_name=excluded.first_name,birth_date=excluded.birth_date,city=excluded.city,profession=excluded.profession,onboarding_complete=true,updated_at=now();
  insert into public.member_experience_modes(user_id,mode,updated_at) values(actor,'couple',now())
    on conflict(user_id) do update set mode='couple',updated_at=now();
  delete from public.daily_match_recommendations where user_id=actor or target_id=actor;
end;
$$;

create or replace function public.set_couple_mode_enabled(p_enabled boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if not p_enabled and exists(select 1 from public.couple_connection_members where user_id=actor) then
    raise exception 'Disconnect the current couple space before leaving Couple Mode';
  end if;
  insert into public.member_experience_modes(user_id,mode,updated_at) values(actor,case when p_enabled then 'couple' else 'seeking' end,now())
    on conflict(user_id) do update set mode=excluded.mode,updated_at=now();
  if not p_enabled then
    update public.couple_connection_requests set status='cancelled',responded_at=now()
      where status='pending' and (requester_id=actor or recipient_id=actor);
  end if;
  delete from public.daily_match_recommendations where user_id=actor or target_id=actor;
end;
$$;

create or replace function public.search_couple_partner_by_phone(p_phone_e164 text,p_client_request_id text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare
  actor uuid:=auth.uid(); normalized_phone text:=regexp_replace(coalesce(p_phone_e164,''),'[^0-9+]','','g');
  target_id uuid; found boolean:=false; phone_digest text;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if normalized_phone!~'^\+[1-9][0-9]{7,14}$' then raise exception 'Enter the complete phone number with country code'; end if;
  if char_length(trim(coalesce(p_client_request_id,''))) not between 8 and 160 then raise exception 'Invalid request id'; end if;
  if not exists(select 1 from public.member_experience_modes where user_id=actor and mode='couple') then raise exception 'Choose Couple Mode before searching'; end if;
  if exists(select 1 from public.couple_connection_members where user_id=actor) then raise exception 'This account is already connected'; end if;
  if (select count(*) from public.couple_phone_search_audit where searcher_id=actor and created_at>now()-interval '1 hour')>=10 then
    raise exception 'Phone search limit reached. Try again later';
  end if;
  phone_digest:=encode(digest(normalized_phone,'sha256'),'hex');
  select u.id into target_id from auth.users u join public.profiles p on p.id=u.id
    join public.member_experience_modes em on em.user_id=u.id and em.mode='couple'
    where u.phone=normalized_phone and u.phone_confirmed_at is not null and p.onboarding_complete and u.id<>actor limit 1;
  if target_id is not null and not public.is_blocked_pair(actor,target_id)
     and not exists(select 1 from public.couple_connection_members where user_id=target_id) then found:=true; end if;
  insert into public.couple_phone_search_audit(searcher_id,target_phone_hash,result_found,client_request_id)
    values(actor,phone_digest,found,trim(p_client_request_id));
  if not found then return jsonb_build_object('found',false); end if;
  return public.couple_partner_summary(target_id);
end;
$$;

create or replace function public.send_couple_connection_request(p_recipient_id uuid,p_client_request_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); created_request public.couple_connection_requests%rowtype;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if p_recipient_id is null or p_recipient_id=actor then raise exception 'You cannot request your own account'; end if;
  if char_length(trim(coalesce(p_client_request_id,''))) not between 8 and 160 then raise exception 'Invalid request id'; end if;
  if not exists(select 1 from public.member_experience_modes where user_id in(actor,p_recipient_id) and mode='couple' group by mode having count(*)=2) then raise exception 'Both accounts must use Couple Mode'; end if;
  if public.is_blocked_pair(actor,p_recipient_id) then raise exception 'This connection is unavailable'; end if;
  if exists(select 1 from public.couple_connection_members where user_id in(actor,p_recipient_id)) then raise exception 'One of these accounts is already connected'; end if;
  if (select count(*) from public.couple_connection_requests where requester_id=actor and created_at>now()-interval '24 hours')>=5 then raise exception 'Request limit reached. Try again tomorrow'; end if;
  update public.couple_connection_requests set status='expired',responded_at=now() where status='pending' and expires_at<=now();
  insert into public.couple_connection_requests(requester_id,recipient_id,client_request_id)
    values(actor,p_recipient_id,trim(p_client_request_id)) returning * into created_request;
  insert into public.member_notifications(user_id,type,title,body,metadata)
    values(p_recipient_id,'couple_connection_request','New Couple Mode request','Someone who knows your exact phone number wants to connect.',jsonb_build_object('request_id',created_request.id));
  return jsonb_build_object('request_id',created_request.id,'member',public.couple_partner_summary(p_recipient_id),'status',created_request.status,'created_at',created_request.created_at,'expires_at',created_request.expires_at);
end;
$$;

create or replace function public.get_couple_connection_hub()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); space_id uuid; space_status text; partner_id uuid; partner_name text;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  select cm.connection_id,c.status into space_id,space_status from public.couple_connection_members cm join public.couple_connections c on c.id=cm.connection_id where cm.user_id=actor;
  if space_id is not null then
    select cm.user_id,p.first_name into partner_id,partner_name from public.couple_connection_members cm join public.profiles p on p.id=cm.user_id where cm.connection_id=space_id and cm.user_id<>actor limit 1;
  end if;
  return jsonb_build_object(
    'experience_mode',coalesce((select mode from public.member_experience_modes where user_id=actor),'seeking'),
    'connection',case when space_id is null then null else jsonb_build_object('connection_id',space_id,'partner_member_id',partner_id,'partner_display_name',partner_name) end,
    'incoming_requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',r.id,'member',public.couple_partner_summary(r.requester_id),'status',r.status,'created_at',r.created_at,'expires_at',r.expires_at) order by r.created_at desc) from public.couple_connection_requests r where r.recipient_id=actor and r.status='pending' and r.expires_at>now()),'[]'::jsonb),
    'outgoing_requests',coalesce((select jsonb_agg(jsonb_build_object('request_id',r.id,'member',public.couple_partner_summary(r.recipient_id),'status',r.status,'created_at',r.created_at,'expires_at',r.expires_at) order by r.created_at desc) from public.couple_connection_requests r where r.requester_id=actor and r.status='pending' and r.expires_at>now()),'[]'::jsonb)
  );
end;
$$;

create or replace function public.respond_couple_connection_request(p_request_id uuid,p_accept boolean,p_client_request_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); selected_request public.couple_connection_requests%rowtype; space_id uuid;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if char_length(trim(coalesce(p_client_request_id,''))) not between 8 and 160 then raise exception 'Invalid request id'; end if;
  select * into selected_request from public.couple_connection_requests where id=p_request_id and recipient_id=actor for update;
  if selected_request.id is null or selected_request.status<>'pending' then raise exception 'This request is no longer available'; end if;
  if selected_request.expires_at<=now() then update public.couple_connection_requests set status='expired',responded_at=now() where id=p_request_id; raise exception 'This request expired'; end if;
  if not p_accept then
    update public.couple_connection_requests set status='declined',responded_at=now() where id=p_request_id;
    return public.get_couple_connection_hub();
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(actor,selected_request.requester_id)::text||greatest(actor,selected_request.requester_id)::text||':couple-pairing',0));
  if exists(select 1 from public.couple_connection_members where user_id in(actor,selected_request.requester_id)) then raise exception 'One of these accounts is already connected'; end if;
  insert into public.couple_connections(created_by) values(selected_request.requester_id) returning id into space_id;
  insert into public.couple_connection_members(user_id,connection_id) values(selected_request.requester_id,space_id),(actor,space_id);
  update public.couple_connection_requests set status=case when id=p_request_id then 'accepted' else 'cancelled' end,responded_at=now()
    where status='pending' and (requester_id in(actor,selected_request.requester_id) or recipient_id in(actor,selected_request.requester_id));
  insert into public.member_experience_modes(user_id,mode,updated_at) values(selected_request.requester_id,'couple',now()),(actor,'couple',now())
    on conflict(user_id) do update set mode='couple',updated_at=now();
  delete from public.daily_match_recommendations where user_id in(actor,selected_request.requester_id) or target_id in(actor,selected_request.requester_id);
  insert into public.member_notifications(user_id,type,title,body,metadata)
    values(selected_request.requester_id,'couple_connection_accepted','Couple space connected','Your partner accepted. Your private couple tools are now ready.',jsonb_build_object('connection_id',space_id));
  return public.get_couple_connection_hub();
end;
$$;

create or replace function public.matching_candidate_eligible(viewer uuid,candidate uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select viewer is not null and candidate is not null and viewer<>candidate
    and not exists(select 1 from public.member_experience_modes em where em.user_id in(viewer,candidate) and em.mode='couple')
    and exists(select 1 from public.profiles p where p.id=viewer and p.onboarding_complete and p.verified)
    and exists(select 1 from public.profiles p where p.id=candidate and p.onboarding_complete and p.verified)
    and exists(select 1 from public.profile_photos pp where pp.user_id=candidate and pp.approved)
    and not public.is_blocked_pair(viewer,candidate)
    and not exists(select 1 from public.matches m where viewer in(m.user_a,m.user_b) and candidate in(m.user_a,m.user_b) and m.status in('mutual','passed','blocked'))
    and not exists(select 1 from public.likes l where l.sender_id=viewer and l.recipient_id=candidate)
    and not exists(select 1 from public.daily_match_recommendations r where r.user_id=viewer and r.target_id=candidate and r.recommendation_day<current_date and r.recommendation_day>=current_date-14)
    and exists(
      select 1 from public.profiles vp join public.profiles cp on cp.id=candidate
      join public.profile_match_attributes va on va.user_id=viewer join public.profile_match_attributes ca on ca.user_id=candidate
      join public.matching_preferences vf on vf.user_id=viewer join public.matching_preferences cf on cf.user_id=candidate
      join public.user_preferences vu on vu.user_id=viewer join public.user_preferences cu on cu.user_id=candidate
      where vp.id=viewer
        and extract(year from age(cp.birth_date))::integer between vf.min_age and vf.max_age and extract(year from age(vp.birth_date))::integer between cf.min_age and cf.max_age
        and (vf.looking_for='everyone' or (vf.looking_for='women' and ca.gender='woman') or (vf.looking_for='men' and ca.gender='man'))
        and (cf.looking_for='everyone' or (cf.looking_for='women' and va.gender='woman') or (cf.looking_for='men' and va.gender='man'))
        and (cardinality(vf.intents)=0 or cu.intent=any(vf.intents)) and (cardinality(cf.intents)=0 or vu.intent=any(cf.intents))
        and cu.vibes@>vf.must_have_vibes and vu.vibes@>cf.must_have_vibes
        and (vf.family_priority='any' or ca.family_priority=vf.family_priority) and (cf.family_priority='any' or va.family_priority=cf.family_priority)
        and (vf.children='any' or ca.children_intent=vf.children) and (cf.children='any' or va.children_intent=cf.children)
        and (vf.marriage_timeline='any' or ca.marriage_timeline=vf.marriage_timeline) and (cf.marriage_timeline='any' or va.marriage_timeline=cf.marriage_timeline)
        and (vf.relocation='any' or (vf.relocation='open' and ca.relocation='open') or (vf.relocation='same_city' and lower(trim(split_part(vp.city,',',1)))=lower(trim(split_part(cp.city,',',1)))))
        and (cf.relocation='any' or (cf.relocation='open' and va.relocation='open') or (cf.relocation='same_city' and lower(trim(split_part(vp.city,',',1)))=lower(trim(split_part(cp.city,',',1)))))
        and public.matching_location_eligible(vf.distance_preference,vf.cities,vp.city,cp.city,ca.relocation)
        and public.matching_location_eligible(cf.distance_preference,cf.cities,cp.city,vp.city,va.relocation)
    );
$$;

revoke all on public.member_experience_modes,public.couple_connections,public.couple_connection_members,public.couple_connection_requests,public.couple_phone_search_audit from public,anon,authenticated;
revoke all on function public.couple_partner_summary(uuid),public.save_couple_mode_profile(text,date,text,text),public.set_couple_mode_enabled(boolean),public.search_couple_partner_by_phone(text,text),public.send_couple_connection_request(uuid,text),public.get_couple_connection_hub(),public.respond_couple_connection_request(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.save_couple_mode_profile(text,date,text,text),public.set_couple_mode_enabled(boolean),public.search_couple_partner_by_phone(text,text),public.send_couple_connection_request(uuid,text),public.get_couple_connection_hub(),public.respond_couple_connection_request(uuid,boolean,text) to authenticated;
