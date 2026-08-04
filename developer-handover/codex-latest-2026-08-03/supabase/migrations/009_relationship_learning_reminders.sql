-- Consent-bound relationship learning, private reminders and minimal journey metrics.

alter table public.relationship_reflections
  add column if not exists use_for_matching boolean not null default false;

alter table public.privacy_settings
  add column if not exists analytics_consent boolean not null default false;

create table if not exists public.relationship_learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_reflection_id uuid not null unique references public.relationship_reflections(id) on delete cascade,
  signal text not null check (signal in ('positive','neutral','negative')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_reminders (
  id uuid primary key default gen_random_uuid(),
  date_proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  reminder_at timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date_proposal_id,user_id)
);

create table if not exists public.relationship_journey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null check (event_name in ('relationship_path_opened','date_plan_status_changed','private_reflection_saved','relationship_learning_consent_changed','date_reminder_changed')),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.relationship_learning_signals enable row level security;
alter table public.relationship_reminders enable row level security;
alter table public.relationship_journey_events enable row level security;

drop policy if exists "members view own relationship learning" on public.relationship_learning_signals;
create policy "members view own relationship learning" on public.relationship_learning_signals
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "members view own relationship reminders" on public.relationship_reminders;
create policy "members view own relationship reminders" on public.relationship_reminders
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "members view own journey events" on public.relationship_journey_events;
create policy "members view own journey events" on public.relationship_journey_events
for select to authenticated using ((select auth.uid()) = user_id);

drop function if exists public.upsert_relationship_reflection(uuid,text);
create or replace function public.upsert_relationship_reflection(
  p_date_proposal_id uuid,
  p_choice text,
  p_use_for_matching boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  proposal_record public.date_proposals%rowtype;
  reflection_record public.relationship_reflections%rowtype;
  learning_signal text;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if p_choice not in ('continue','pause','close') then raise exception 'Choose a valid reflection.'; end if;

  select dp.* into proposal_record
  from public.date_proposals dp
  join public.matches m on m.id = dp.match_id
  where dp.id = p_date_proposal_id and m.status = 'mutual' and viewer in (m.user_a,m.user_b);
  if not found then raise exception 'Date proposal not found.'; end if;
  if proposal_record.status <> 'completed' then raise exception 'Reflection opens after the date is completed.'; end if;

  insert into public.relationship_reflections(date_proposal_id,user_id,choice,use_for_matching)
  values (p_date_proposal_id,viewer,p_choice,p_use_for_matching)
  on conflict (date_proposal_id,user_id)
  do update set choice=excluded.choice,use_for_matching=excluded.use_for_matching,updated_at=now()
  returning * into reflection_record;

  learning_signal := case p_choice when 'continue' then 'positive' when 'pause' then 'neutral' else 'negative' end;
  insert into public.relationship_learning_signals(user_id,source_reflection_id,signal,active)
  values (viewer,reflection_record.id,learning_signal,p_use_for_matching)
  on conflict (source_reflection_id)
  do update set signal=excluded.signal,active=excluded.active,updated_at=now();

  return jsonb_build_object('id',reflection_record.id,'choice',reflection_record.choice,'use_for_matching',reflection_record.use_for_matching,'updated_at',reflection_record.updated_at);
end;
$$;

create or replace function public.set_relationship_reminder(p_date_proposal_id uuid,p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  proposal_record public.date_proposals%rowtype;
  reminder_record public.relationship_reminders%rowtype;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  select dp.* into proposal_record
  from public.date_proposals dp join public.matches m on m.id=dp.match_id
  where dp.id=p_date_proposal_id and m.status='mutual' and viewer in (m.user_a,m.user_b);
  if not found then raise exception 'Date proposal not found.'; end if;
  if p_enabled and proposal_record.status <> 'accepted' then raise exception 'Reminders are available for accepted dates.'; end if;

  insert into public.relationship_reminders(date_proposal_id,user_id,enabled,reminder_at,delivered_at)
  values (p_date_proposal_id,viewer,p_enabled,greatest(now(),proposal_record.proposed_at-interval '2 hours'),null)
  on conflict (date_proposal_id,user_id)
  do update set enabled=excluded.enabled,reminder_at=excluded.reminder_at,delivered_at=null,updated_at=now()
  returning * into reminder_record;

  return jsonb_build_object('enabled',reminder_record.enabled,'reminder_at',reminder_record.reminder_at);
end;
$$;

create or replace function public.record_relationship_journey_event(p_event_name text,p_properties jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  event_id uuid;
begin
  if viewer is null then return null; end if;
  if not coalesce((select analytics_consent from public.privacy_settings where user_id=viewer),false) then return null; end if;
  if p_event_name not in ('relationship_path_opened','date_plan_status_changed','private_reflection_saved','relationship_learning_consent_changed','date_reminder_changed') then raise exception 'Event is not allowed.'; end if;
  if exists (select 1 from jsonb_object_keys(coalesce(p_properties,'{}'::jsonb)) key where key not in ('stage','from_status','to_status','choice','enabled')) then raise exception 'Event properties are not allowed.'; end if;
  insert into public.relationship_journey_events(user_id,event_name,properties)
  values (viewer,p_event_name,coalesce(p_properties,'{}'::jsonb)) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.process_relationship_reminders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  processed integer := 0;
  reminder record;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'Service role required.'; end if;
  for reminder in
    select rr.id,rr.user_id,rr.date_proposal_id,dp.match_id
    from public.relationship_reminders rr join public.date_proposals dp on dp.id=rr.date_proposal_id
    where rr.enabled and rr.delivered_at is null and rr.reminder_at<=now() and dp.status='accepted'
    order by rr.reminder_at for update of rr skip locked limit greatest(1,least(p_limit,500))
  loop
    insert into public.member_notifications(user_id,type,title,body,metadata)
    values (reminder.user_id,'date_reminder','Your private date reminder','Review the plan, public-place details and safety check-in.',jsonb_build_object('date_proposal_id',reminder.date_proposal_id,'match_id',reminder.match_id));
    update public.relationship_reminders set delivered_at=now(),updated_at=now() where id=reminder.id;
    processed := processed+1;
  end loop;
  return processed;
end;
$$;

create or replace function public.get_relationship_journey(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  proposal_record public.date_proposals%rowtype;
  reflection_record public.relationship_reflections%rowtype;
  reminder_record public.relationship_reminders%rowtype;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if not exists (select 1 from public.matches m where m.id=p_match_id and m.status='mutual' and viewer in (m.user_a,m.user_b)) then raise exception 'Mutual match not found.'; end if;
  select * into proposal_record from public.date_proposals where match_id=p_match_id order by created_at desc limit 1;
  if proposal_record.id is null then return jsonb_build_object('match_id',p_match_id,'proposal',null,'reflection',null,'reminder',null); end if;
  select * into reflection_record from public.relationship_reflections where date_proposal_id=proposal_record.id and user_id=viewer;
  select * into reminder_record from public.relationship_reminders where date_proposal_id=proposal_record.id and user_id=viewer;
  return jsonb_build_object(
    'match_id',p_match_id,
    'proposal',jsonb_build_object('id',proposal_record.id,'status',proposal_record.status,'proposed_at',proposal_record.proposed_at,'responded_at',proposal_record.responded_at,'completed_at',proposal_record.completed_at),
    'reflection',case when reflection_record.id is null then null else jsonb_build_object('choice',reflection_record.choice,'use_for_matching',reflection_record.use_for_matching,'created_at',reflection_record.created_at,'updated_at',reflection_record.updated_at) end,
    'reminder',case when reminder_record.id is null then null else jsonb_build_object('enabled',reminder_record.enabled,'reminder_at',reminder_record.reminder_at,'delivered_at',reminder_record.delivered_at) end
  );
end;
$$;

grant execute on function public.upsert_relationship_reflection(uuid,text,boolean) to authenticated;
grant execute on function public.set_relationship_reminder(uuid,boolean) to authenticated;
grant execute on function public.record_relationship_journey_event(text,jsonb) to authenticated;
revoke all on function public.process_relationship_reminders(integer) from public,anon,authenticated;
grant execute on function public.process_relationship_reminders(integer) to service_role;
