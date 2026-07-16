-- Icebreaker gate: both matched members answer before chat opens.

create or replace function public.submit_icebreaker_answer(p_match_id uuid, p_question text, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  match_record public.matches%rowtype;
  icebreaker_record public.icebreakers%rowtype;
  clean_question text := nullif(trim(p_question), '');
  clean_answer text := nullif(trim(p_answer), '');
  is_unlocked boolean := false;
begin
  if viewer is null then
    raise exception 'You must be signed in to continue.';
  end if;

  if clean_answer is null or char_length(clean_answer) > 500 then
    raise exception 'Icebreaker answer must be 1-500 characters.';
  end if;

  select *
  into match_record
  from public.matches
  where id = p_match_id
    and viewer in (user_a, user_b)
    and status = 'mutual';

  if not found then
    raise exception 'Mutual match not found.';
  end if;

  insert into public.icebreakers(match_id, question)
  values (p_match_id, coalesce(clean_question, 'Coffee date ☕ or road trip 🚗?'))
  on conflict (match_id) do nothing;

  if viewer = match_record.user_a then
    update public.icebreakers
    set user_a_answer = clean_answer
    where icebreakers.match_id = p_match_id
    returning * into icebreaker_record;
  else
    update public.icebreakers
    set user_b_answer = clean_answer
    where icebreakers.match_id = p_match_id
    returning * into icebreaker_record;
  end if;

  if icebreaker_record.user_a_answer is not null and icebreaker_record.user_b_answer is not null then
    update public.icebreakers
    set unlocked_at = coalesce(unlocked_at, now())
    where id = icebreaker_record.id
    returning * into icebreaker_record;

    is_unlocked := true;

    insert into public.member_notifications(user_id, type, title, body, metadata)
    values
      (match_record.user_a, 'chat_unlocked', 'Chat unlocked ✨', 'You both answered the icebreaker. Keep it thoughtful.', jsonb_build_object('match_id', p_match_id, 'icebreaker_id', icebreaker_record.id)),
      (match_record.user_b, 'chat_unlocked', 'Chat unlocked ✨', 'You both answered the icebreaker. Keep it thoughtful.', jsonb_build_object('match_id', p_match_id, 'icebreaker_id', icebreaker_record.id));
  end if;

  return jsonb_build_object(
    'id', icebreaker_record.id,
    'match_id', icebreaker_record.match_id,
    'question', icebreaker_record.question,
    'your_answer', case when viewer = match_record.user_a then icebreaker_record.user_a_answer else icebreaker_record.user_b_answer end,
    'other_answer', case
      when icebreaker_record.unlocked_at is not null and viewer = match_record.user_a then icebreaker_record.user_b_answer
      when icebreaker_record.unlocked_at is not null and viewer = match_record.user_b then icebreaker_record.user_a_answer
      else null
    end,
    'unlocked', is_unlocked or icebreaker_record.unlocked_at is not null,
    'unlocked_at', icebreaker_record.unlocked_at
  );
end;
$$;

grant execute on function public.submit_icebreaker_answer(uuid, text, text) to authenticated;

drop policy if exists "participants view messages" on public.messages;
drop policy if exists "participants send messages" on public.messages;

create policy "participants view messages after icebreaker" on public.messages
for select to authenticated
using (
  exists(
    select 1
    from public.matches m
    join public.icebreakers i on i.match_id = m.id
    where m.id = messages.match_id
      and m.status = 'mutual'
      and i.unlocked_at is not null
      and (select auth.uid()) in (m.user_a, m.user_b)
  )
);

create policy "participants send messages after icebreaker" on public.messages
for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists(
    select 1
    from public.matches m
    join public.icebreakers i on i.match_id = m.id
    where m.id = messages.match_id
      and m.status = 'mutual'
      and i.unlocked_at is not null
      and (select auth.uid()) in (m.user_a, m.user_b)
  )
);
