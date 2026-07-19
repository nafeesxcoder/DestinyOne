-- Short-lived abuse protection for registration-free web preview searches.
-- This table stores only a SHA-256 fingerprint, never a raw IP address.
create table if not exists public.google_places_preview_requests (
  id bigint generated always as identity primary key,
  client_fingerprint text not null check (char_length(client_fingerprint) = 64),
  cache_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists google_places_preview_requests_client_created_idx
  on public.google_places_preview_requests (client_fingerprint, created_at desc);

alter table public.google_places_preview_requests enable row level security;
revoke all on table public.google_places_preview_requests from public, anon, authenticated;
grant select, insert, delete on table public.google_places_preview_requests to service_role;
grant usage, select on sequence public.google_places_preview_requests_id_seq to service_role;
