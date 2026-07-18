-- Reconcile security and indexing for the hosted schema that predates the
-- repository migration history. Every statement is conditional so this also
-- remains safe on a clean DestinyOne database built from migrations 001-032.

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke all on function public.handle_new_user() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.update_match_last_message()') is not null then
    revoke all on function public.update_match_last_message() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.record_swipe(uuid,text)') is not null then
    revoke all on function public.record_swipe(uuid, text) from public, anon, authenticated;
    grant execute on function public.record_swipe(uuid, text) to authenticated;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.blocks') is not null then
    create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);
  end if;

  if to_regclass('public.device_tokens') is not null then
    create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);
  end if;

  if to_regclass('public.profile_interests') is not null then
    create index if not exists profile_interests_interest_id_idx
      on public.profile_interests(interest_id);
  end if;

  if to_regclass('public.subscriptions') is not null then
    create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports'
      and column_name = 'reporter_id'
  ) then
    create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports'
      and column_name = 'reported_user_id'
  ) then
    create index if not exists reports_reported_user_id_idx
      on public.reports(reported_user_id);
  end if;
end;
$$;
