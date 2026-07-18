-- Server-only cache and spend protection for Google Places Text Search.
-- No client role receives table privileges; the authenticated Edge Function uses
-- the service role after independently verifying the member JWT.
create table if not exists public.google_places_search_cache (
  cache_key text primary key check (char_length(cache_key) between 8 and 300),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.google_places_search_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists google_places_search_requests_user_created_idx
  on public.google_places_search_requests (user_id, created_at desc);

alter table public.google_places_search_cache enable row level security;
alter table public.google_places_search_requests enable row level security;

revoke all on table public.google_places_search_cache, public.google_places_search_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.google_places_search_cache, public.google_places_search_requests to service_role;
grant usage, select on sequence public.google_places_search_requests_id_seq to service_role;
