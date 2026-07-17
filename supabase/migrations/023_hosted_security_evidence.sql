-- Make hosted verification reflect database privileges and RLS policy metadata
-- instead of inferring access from PostgREST response shapes.
create or replace function public.get_backend_deployment_manifest()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'contract_id', 'destinyone-backend-v23',
    'schema_version', 23,
    'tables', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
    ), '[]'::jsonb),
    'functions', coalesce((
      select jsonb_agg(names.proname order by names.proname)
      from (
        select distinct p.proname
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
      ) names
    ), '[]'::jsonb),
    'rls_disabled_tables', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not c.relrowsecurity
    ), '[]'::jsonb),
    'anonymous_table_exposures', coalesce((
      select jsonb_agg(exposure.table_name order by exposure.table_name)
      from (
        select distinct c.relname as table_name
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_policies policy
          on policy.schemaname = n.nspname
         and policy.tablename = c.relname
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relrowsecurity
          and pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
          and policy.cmd in ('SELECT', 'ALL')
          and policy.roles && array['public', 'anon']::name[]
      ) exposure
    ), '[]'::jsonb),
    'anonymous_rpc_exposures', coalesce((
      select jsonb_agg(exposure.function_name order by exposure.function_name)
      from (
        select distinct p.proname as function_name
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      ) exposure
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
