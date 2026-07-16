-- Backend action for Interested / Not for me. The client calls this RPC so
-- mutual-match creation stays server-side and RLS-safe.

create unique index if not exists likes_sender_recipient_unique
  on public.likes(sender_id, recipient_id);

create or replace function public.submit_match_decision(recipient_id uuid, decision text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  normalized_decision text := lower(trim(decision));
  user_one uuid;
  user_two uuid;
  matched_id uuid;
  did_match boolean := false;
begin
  if viewer is null then
    raise exception 'You must be signed in to continue.';
  end if;

  if recipient_id is null or recipient_id = viewer then
    raise exception 'Invalid match decision recipient.';
  end if;

  if normalized_decision not in ('interested', 'pass') then
    raise exception 'Unsupported match decision.';
  end if;

  insert into public.likes(sender_id, recipient_id, decision)
  values (viewer, recipient_id, normalized_decision)
  on conflict (sender_id, recipient_id)
  do update set decision = excluded.decision, created_at = now();

  insert into public.discovery_signals(user_id, target_id, signal)
  values (viewer, recipient_id, case when normalized_decision = 'pass' then 'skip' else 'interested' end);

  if normalized_decision = 'pass' then
    update public.matches
    set status = 'passed'
    where status = 'suggested'
      and viewer in (user_a, user_b)
      and recipient_id in (user_a, user_b);

    return jsonb_build_object(
      'matched', false,
      'decision', normalized_decision,
      'match_id', null
    );
  end if;

  select exists(
    select 1
    from public.likes
    where sender_id = recipient_id
      and recipient_id = viewer
      and decision = 'interested'
  ) into did_match;

  if did_match then
    user_one := least(viewer, recipient_id);
    user_two := greatest(viewer, recipient_id);

    insert into public.matches(user_a, user_b, label, score_internal, status, matched_at)
    values (user_one, user_two, 'great', 84.00, 'mutual', now())
    on conflict (user_a, user_b)
    do update set
      status = 'mutual',
      matched_at = coalesce(public.matches.matched_at, now())
    returning id into matched_id;

    insert into public.member_notifications(user_id, type, title, body, metadata)
    values
      (recipient_id, 'mutual_match', 'It’s a Match ❤️', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', viewer)),
      (viewer, 'mutual_match', 'It’s a Match ❤️', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', recipient_id));
  end if;

  return jsonb_build_object(
    'matched', did_match,
    'decision', normalized_decision,
    'match_id', matched_id
  );
end;
$$;

grant execute on function public.submit_match_decision(uuid, text) to authenticated;
