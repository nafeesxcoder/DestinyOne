-- Resolve deterministic advisor findings without changing member-visible
-- behavior. Empty-database unused-index notices are intentionally not acted on.

alter function public.current_coin_balance()
  set search_path = public, pg_temp;
alter function public.mark_notification_read(uuid)
  set search_path = public, pg_temp;

drop policy if exists "match members view chat privacy events"
  on public.chat_privacy_events;
create policy "match members view chat privacy events"
  on public.chat_privacy_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (select auth.uid()) in (m.user_a, m.user_b)
    )
  );

drop policy if exists member_experience_modes_select_self
  on public.member_experience_modes;
create policy member_experience_modes_select_self
  on public.member_experience_modes
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists couple_connections_select_member
  on public.couple_connections;
create policy couple_connections_select_member
  on public.couple_connections
  for select to authenticated
  using (
    exists (
      select 1
      from public.couple_connection_members cm
      where cm.connection_id = id
        and cm.user_id = (select auth.uid())
    )
  );

drop policy if exists couple_connection_members_select_pair
  on public.couple_connection_members;
create policy couple_connection_members_select_pair
  on public.couple_connection_members
  for select to authenticated
  using (
    exists (
      select 1
      from public.couple_connection_members mine
      where mine.connection_id = couple_connection_members.connection_id
        and mine.user_id = (select auth.uid())
    )
  );

drop policy if exists couple_connection_requests_select_participant
  on public.couple_connection_requests;
create policy couple_connection_requests_select_participant
  on public.couple_connection_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

-- Add a covering index for every public foreign key that does not already
-- have one. The catalog check respects composite key column order.
do $$
declare
  foreign_key record;
  index_name text;
begin
  for foreign_key in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      constraint_row.conname as constraint_name,
      array_agg(attribute.attname order by key_column.ordinality) as column_names
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class relation
      on relation.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    join unnest(constraint_row.conkey) with ordinality
      as key_column(attribute_number, ordinality) on true
    join pg_catalog.pg_attribute attribute
      on attribute.attrelid = relation.oid
      and attribute.attnum = key_column.attribute_number
    where constraint_row.contype = 'f'
      and namespace.nspname = 'public'
      and not exists (
        select 1
        from pg_catalog.pg_index index_row
        where index_row.indrelid = constraint_row.conrelid
          and index_row.indisvalid
          and (index_row.indkey::smallint[])[
            0:cardinality(constraint_row.conkey) - 1
          ] = constraint_row.conkey
      )
    group by
      namespace.nspname,
      relation.relname,
      constraint_row.conname
  loop
    index_name := left(foreign_key.constraint_name, 55) || '_fk_idx';
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      index_name,
      foreign_key.schema_name,
      foreign_key.table_name,
      (
        select string_agg(format('%I', column_name), ', ')
        from unnest(foreign_key.column_names) as column_name
      )
    );
  end loop;
end;
$$;
