-- Avoid PL/pgSQL variable/column ambiguity while keeping the RPC contract explicit.
drop function if exists public.submit_match_decision(uuid, text);

create function public.submit_match_decision(p_recipient_id uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  viewer uuid := auth.uid();
  target_member_id uuid := p_recipient_id;
  normalized_decision text := lower(trim(p_decision));
  previous_decision text;
  recent_count integer;
  user_one uuid;
  user_two uuid;
  matched_id uuid;
  did_match boolean := false;
  mutual_already boolean := false;
begin
  if viewer is null then raise exception 'You must be signed in to continue.'; end if;
  if target_member_id is null or target_member_id = viewer then raise exception 'Invalid match decision recipient.'; end if;
  if normalized_decision not in ('interested', 'pass') then raise exception 'Unsupported match decision.'; end if;
  if public.is_blocked_pair(viewer, target_member_id)
     or not exists (select 1 from public.profiles p where p.id = target_member_id and p.onboarding_complete) then
    raise exception 'This member is unavailable.';
  end if;
  if not exists (select 1 from public.daily_match_recommendations r where r.user_id = viewer and r.target_id = target_member_id and r.recommendation_day = current_date)
     and not exists (select 1 from public.likes l where l.sender_id = target_member_id and l.recipient_id = viewer and l.decision = 'interested') then
    raise exception 'This member is not in your current introductions.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(viewer::text || ':decision:' || target_member_id::text, 0));
  select l.decision into previous_decision from public.likes l where l.sender_id = viewer and l.recipient_id = target_member_id;
  if previous_decision is distinct from normalized_decision then
    select count(*) into recent_count from public.discovery_signals ds where ds.user_id = viewer and ds.created_at >= now() - interval '24 hours';
    if recent_count >= 120 then raise exception 'Daily match decision limit reached'; end if;
  end if;
  insert into public.likes(sender_id, recipient_id, decision) values (viewer, target_member_id, normalized_decision)
  on conflict(sender_id, recipient_id) do update set decision = excluded.decision, created_at = now();
  if previous_decision is distinct from normalized_decision then
    insert into public.discovery_signals(user_id, target_id, signal) values (viewer, target_member_id, case when normalized_decision = 'pass' then 'skip' else 'interested' end);
  end if;
  if normalized_decision = 'pass' then
    update public.matches m set status = 'passed' where m.status = 'suggested' and viewer in (m.user_a, m.user_b) and target_member_id in (m.user_a, m.user_b);
    return jsonb_build_object('matched', false, 'decision', normalized_decision, 'match_id', null);
  end if;
  select exists (select 1 from public.likes l where l.sender_id = target_member_id and l.recipient_id = viewer and l.decision = 'interested') into did_match;
  if did_match then
    select exists (select 1 from public.matches m where viewer in (m.user_a, m.user_b) and target_member_id in (m.user_a, m.user_b) and m.status = 'mutual') into mutual_already;
    user_one := least(viewer, target_member_id); user_two := greatest(viewer, target_member_id);
    insert into public.matches(user_a, user_b, label, score_internal, status, matched_at)
    values (user_one, user_two, 'great', 84, 'mutual', now())
    on conflict(user_a, user_b) do update set status = 'mutual', matched_at = coalesce(public.matches.matched_at, now())
    returning id into matched_id;
    if not mutual_already then
      insert into public.member_notifications(user_id, type, title, body, metadata)
      values
        (target_member_id, 'mutual_match', 'It''s a Match', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', viewer)),
        (viewer, 'mutual_match', 'It''s a Match', 'You both chose each other on DestinyOne.', jsonb_build_object('match_id', matched_id, 'member_id', target_member_id));
    end if;
  end if;
  return jsonb_build_object('matched', did_match, 'decision', normalized_decision, 'match_id', matched_id);
end;
$$;

revoke all on function public.submit_match_decision(uuid, text) from public, anon;
grant execute on function public.submit_match_decision(uuid, text) to authenticated;
