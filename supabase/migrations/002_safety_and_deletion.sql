create table public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','safe','needs_help')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, date_proposal_id)
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','processing','complete','rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.safety_checkins enable row level security;
alter table public.deletion_requests enable row level security;

create policy "members manage own safety checkins" on public.safety_checkins
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "members view own deletion request" on public.deletion_requests
for select to authenticated using ((select auth.uid()) = user_id);

create policy "members create own deletion request" on public.deletion_requests
for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security invoker
as $$
declare request_id uuid;
begin
  insert into public.deletion_requests(user_id)
  values ((select auth.uid()))
  on conflict (user_id) do update set status='requested', requested_at=now(), completed_at=null
  returning id into request_id;

  update public.profiles
  set onboarding_complete=false, updated_at=now()
  where id=(select auth.uid());

  return request_id;
end;
$$;

-- A protected Edge Function or server worker must process requests with the
-- service role, delete private storage objects, then delete auth.users.
