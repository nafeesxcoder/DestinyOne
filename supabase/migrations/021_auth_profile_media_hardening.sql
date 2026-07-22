-- Production identity/profile media hardening. Storage stays private, enforces
-- bounded media types, and accepts profile uploads only inside the member's
-- explicit photo, voice, or verification folder.

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/heic','image/heif',
      'audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg','audio/wav','audio/x-wav','audio/aac'
    ]::text[]
where id = 'profile-media';

update storage.buckets
set public = false,
    file_size_limit = 15728640,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
      'audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg','audio/wav','audio/x-wav','audio/aac'
    ]::text[]
where id = 'chat-media';

drop policy if exists "members upload own profile media" on storage.objects;
create policy "members upload own profile media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] in ('photo', 'voice', 'verification')
    and case
      when (storage.foldername(name))[2] in ('photo', 'verification') then
        lower(coalesce(metadata->>'mimetype', '')) in (
          'image/jpeg','image/png','image/webp','image/heic','image/heif'
        )
      when (storage.foldername(name))[2] = 'voice' then
        lower(coalesce(metadata->>'mimetype', '')) in (
          'audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg','audio/wav','audio/x-wav','audio/aac'
        )
      else false
    end
  );

-- Keep the hosted verifier tied to the exact schema revision that introduced
-- the Auth/profile media launch boundary.
create or replace function public.get_backend_deployment_manifest()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'contract_id', 'destinyone-backend-v21',
    'schema_version', 21,
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
