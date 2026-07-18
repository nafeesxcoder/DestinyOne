-- Close the remaining advisor findings after the full hosted migration chain.

revoke all on function public.prevent_billing_ledger_mutation()
  from public, anon, authenticated;

-- The table-level unique constraint already owns an equivalent index.
drop index if exists public.likes_sender_recipient_unique;

-- Split the owner mutation policy by command so SELECT has one permissive
-- policy instead of evaluating two overlapping policies for every row.
drop policy if exists "completed vouches visible to members"
  on public.trusted_vouches;
drop policy if exists "members manage vouch invites"
  on public.trusted_vouches;

create policy "members view visible vouches"
  on public.trusted_vouches
  for select to authenticated
  using (status = 'complete' or (select auth.uid()) = user_id);

create policy "members create own vouch invites"
  on public.trusted_vouches
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "members update own vouch invites"
  on public.trusted_vouches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "members delete own vouch invites"
  on public.trusted_vouches
  for delete to authenticated
  using ((select auth.uid()) = user_id);
