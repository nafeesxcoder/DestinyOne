-- pgcrypto is installed in the extensions schema, not the public RPC search path.
create or replace function public.search_couple_partner_by_phone(p_phone_e164 text, p_client_request_id text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare
  actor uuid := auth.uid();
  normalized_phone text := regexp_replace(coalesce(p_phone_e164, ''), '[^0-9+]', '', 'g');
  target_id uuid;
  found boolean := false;
  phone_digest text;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if normalized_phone !~ '^\\+[1-9][0-9]{7,14}$' then raise exception 'Enter the complete phone number with country code'; end if;
  if char_length(trim(coalesce(p_client_request_id, ''))) not between 8 and 160 then raise exception 'Invalid request id'; end if;
  if not exists (select 1 from public.member_experience_modes where user_id = actor and mode = 'couple') then raise exception 'Choose Couple Mode before searching'; end if;
  if exists (select 1 from public.couple_connection_members where user_id = actor) then raise exception 'This account is already connected'; end if;
  if (select count(*) from public.couple_phone_search_audit where searcher_id = actor and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Phone search limit reached. Try again later';
  end if;
  phone_digest := encode(extensions.digest(normalized_phone, 'sha256'), 'hex');
  select u.id into target_id
  from auth.users u
  join public.profiles p on p.id = u.id
  join public.member_experience_modes em on em.user_id = u.id and em.mode = 'couple'
  where u.phone = normalized_phone and u.phone_confirmed_at is not null and p.onboarding_complete and u.id <> actor
  limit 1;
  if target_id is not null and not public.is_blocked_pair(actor, target_id)
     and not exists (select 1 from public.couple_connection_members where user_id = target_id) then
    found := true;
  end if;
  insert into public.couple_phone_search_audit(searcher_id, target_phone_hash, result_found, client_request_id)
  values (actor, phone_digest, found, trim(p_client_request_id));
  if not found then return jsonb_build_object('found', false); end if;
  return public.couple_partner_summary(target_id);
end;
$$;

revoke all on function public.search_couple_partner_by_phone(text, text) from public, anon;
grant execute on function public.search_couple_partner_by_phone(text, text) to authenticated;
