create or replace function public.get_backend_deployment_manifest()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'contract_id', 'destinyone-backend-v20',
    'schema_version', 20,
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
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated;
grant execute on function public.get_backend_deployment_manifest() to service_role;
