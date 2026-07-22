-- Durable, privacy-safe relationship journey state.

alter table public.date_proposals
  drop constraint if exists date_proposals_status_check;

alter table public.date_proposals
  add constraint date_proposals_status_check
  check (status in ('pending','accepted','declined','countered','completed'));

alter table public.date_proposals
  add column if not exists responded_by uuid references public.profiles(id) on delete set null,
  add column if not exists responded_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists public.relationship_reflections (
  id uuid primary key default gen_random_uuid(),
  date_proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check (choice in ('continue','pause','close')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date_proposal_id,user_id)
);

alter table public.relationship_reflections enable row level security;

drop policy if exists "members view own relationship reflections" on public.relationship_reflections;
create policy "members view own relationship reflections"
on public.relationship_reflections for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "members create own relationship reflections" on public.relationship_reflections;
create policy "members create own relationship reflections"
on public.relationship_reflections for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "members update own relationship reflections" on public.relationship_reflections;
create policy "members update own relationship reflections"
on public.relationship_reflections for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.respond_to_date_proposal(
  p_date_proposal_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  proposal_record public.date_proposals%rowtype;
  match_record public.matches%rowtype;
begin
  if viewer is null then raise exception 'You must be signed in to respond.'; end if;
  if p_response not in ('accepted','declined','countered') then raise exception 'Choose a valid response.'; end if;

  select * into proposal_record from public.date_proposals where id = p_date_proposal_id for update;
  if not found then raise exception 'Date proposal not found.'; end if;

  select * into match_record from public.matches
  where id = proposal_record.match_id and status = 'mutual' and viewer in (user_a,user_b);
  if not found then raise exception 'Mutual match not found.'; end if;
  if viewer = proposal_record.proposer_id then raise exception 'The recipient must respond to this proposal.'; end if;
  if proposal_record.status not in ('pending','countered') then raise exception 'This proposal already has a final response.'; end if;

  update public.date_proposals
  set status = p_response, responded_by = viewer, responded_at = now()
  where id = p_date_proposal_id
  returning * into proposal_record;

  insert into public.member_notifications(user_id,type,title,body,metadata)
  values (
    proposal_record.proposer_id,
    'date_response',
    case p_response when 'accepted' then 'Your date plan was accepted' when 'countered' then 'A new time was suggested' else 'Your date plan was declined' end,
    proposal_record.venue_name,
    jsonb_build_object('date_proposal_id',proposal_record.id,'match_id',proposal_record.match_id,'status',proposal_record.status)
  );

  return jsonb_build_object('id',proposal_record.id,'status',proposal_record.status,'responded_at',proposal_record.responded_at);
end;
$$;

create or replace function public.complete_date_proposal(p_date_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  proposal_record public.date_proposals%rowtype;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;

  select dp.* into proposal_record
  from public.date_proposals dp
  join public.matches m on m.id = dp.match_id
  where dp.id = p_date_proposal_id and m.status = 'mutual' and viewer in (m.user_a,m.user_b)
  for update of dp;

  if not found then raise exception 'Date proposal not found.'; end if;
  if proposal_record.status <> 'accepted' then raise exception 'Only an accepted date can be completed.'; end if;
  if proposal_record.proposed_at > now() then raise exception 'Reflection opens after the scheduled date.'; end if;

  update public.date_proposals set status = 'completed', completed_at = now()
  where id = p_date_proposal_id returning * into proposal_record;

  return jsonb_build_object('id',proposal_record.id,'status',proposal_record.status,'completed_at',proposal_record.completed_at);
end;
$$;

create or replace function public.upsert_relationship_reflection(
  p_date_proposal_id uuid,
  p_choice text
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
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if p_choice not in ('continue','pause','close') then raise exception 'Choose a valid reflection.'; end if;

  select dp.* into proposal_record
  from public.date_proposals dp
  join public.matches m on m.id = dp.match_id
  where dp.id = p_date_proposal_id and m.status = 'mutual' and viewer in (m.user_a,m.user_b);

  if not found then raise exception 'Date proposal not found.'; end if;
  if proposal_record.status <> 'completed' then raise exception 'Reflection opens after the date is completed.'; end if;

  insert into public.relationship_reflections(date_proposal_id,user_id,choice)
  values (p_date_proposal_id,viewer,p_choice)
  on conflict (date_proposal_id,user_id)
  do update set choice = excluded.choice, updated_at = now()
  returning * into reflection_record;

  return jsonb_build_object('id',reflection_record.id,'choice',reflection_record.choice,'updated_at',reflection_record.updated_at);
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
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and m.status = 'mutual' and viewer in (m.user_a,m.user_b)
  ) then raise exception 'Mutual match not found.'; end if;

  select * into proposal_record from public.date_proposals
  where match_id = p_match_id order by created_at desc limit 1;

  if proposal_record.id is null then
    return jsonb_build_object('match_id',p_match_id,'proposal',null,'reflection',null);
  end if;

  select * into reflection_record from public.relationship_reflections
  where date_proposal_id = proposal_record.id and user_id = viewer;

  return jsonb_build_object(
    'match_id',p_match_id,
    'proposal',jsonb_build_object('id',proposal_record.id,'status',proposal_record.status,'proposed_at',proposal_record.proposed_at,'responded_at',proposal_record.responded_at,'completed_at',proposal_record.completed_at),
    'reflection',case when reflection_record.id is null then null else jsonb_build_object('choice',reflection_record.choice,'created_at',reflection_record.created_at,'updated_at',reflection_record.updated_at) end
  );
end;
$$;

grant execute on function public.respond_to_date_proposal(uuid,text) to authenticated;
grant execute on function public.complete_date_proposal(uuid) to authenticated;
grant execute on function public.upsert_relationship_reflection(uuid,text) to authenticated;
grant execute on function public.get_relationship_journey(uuid) to authenticated;
