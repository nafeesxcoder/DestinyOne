-- Real date-plan backend action.
-- The client calls this RPC when a member suggests a place/time from Date
-- Concierge. It validates the mutual match, stores the proposal, schedules
-- safety check-ins for both people, and notifies the recipient.

create or replace function public.create_date_proposal(
  p_match_id uuid,
  p_venue_name text,
  p_area_label text,
  p_proposed_at timestamptz,
  p_safety_check_in boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  match_record public.matches%rowtype;
  proposal_record public.date_proposals%rowtype;
  recipient uuid;
  clean_venue text := nullif(trim(p_venue_name), '');
  clean_area text := nullif(trim(p_area_label), '');
begin
  if viewer is null then
    raise exception 'You must be signed in to suggest a date.';
  end if;

  if clean_venue is null or char_length(clean_venue) > 140 then
    raise exception 'Choose a valid venue.';
  end if;

  if clean_area is null or char_length(clean_area) > 160 then
    raise exception 'Choose a valid area.';
  end if;

  if p_proposed_at is null
    or p_proposed_at < now() - interval '1 hour'
    or p_proposed_at > now() + interval '180 days' then
    raise exception 'Choose a valid date time.';
  end if;

  select *
  into match_record
  from public.matches
  where id = p_match_id
    and status = 'mutual'
    and viewer in (user_a, user_b);

  if not found then
    raise exception 'Mutual match not found.';
  end if;

  recipient := case when viewer = match_record.user_a then match_record.user_b else match_record.user_a end;

  insert into public.date_proposals(
    match_id,
    proposer_id,
    venue_name,
    area_label,
    proposed_at,
    safety_check_in
  )
  values (
    p_match_id,
    viewer,
    clean_venue,
    clean_area,
    p_proposed_at,
    coalesce(p_safety_check_in, true)
  )
  returning * into proposal_record;

  if proposal_record.safety_check_in then
    insert into public.safety_checkins(user_id, date_proposal_id, status)
    values
      (viewer, proposal_record.id, 'scheduled'),
      (recipient, proposal_record.id, 'scheduled')
    on conflict (user_id, date_proposal_id) do nothing;
  end if;

  insert into public.member_notifications(user_id, type, title, body, metadata)
  values (
    recipient,
    'date_proposal',
    'New date idea ✨',
    clean_venue || ' · ' || clean_area,
    jsonb_build_object(
      'match_id', p_match_id,
      'date_proposal_id', proposal_record.id,
      'proposer_id', viewer,
      'venue_name', proposal_record.venue_name,
      'area_label', proposal_record.area_label,
      'proposed_at', proposal_record.proposed_at,
      'safety_check_in', proposal_record.safety_check_in
    )
  );

  return jsonb_build_object(
    'id', proposal_record.id,
    'match_id', proposal_record.match_id,
    'recipient_id', recipient,
    'venue_name', proposal_record.venue_name,
    'area_label', proposal_record.area_label,
    'proposed_at', proposal_record.proposed_at,
    'status', proposal_record.status,
    'safety_check_in', proposal_record.safety_check_in
  );
end;
$$;

grant execute on function public.create_date_proposal(uuid, text, text, timestamptz, boolean) to authenticated;
