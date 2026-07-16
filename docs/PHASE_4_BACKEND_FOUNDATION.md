# Phase 4: real backend foundation

Last verified locally: 2026-07-16

## Implemented in source

- Production runtime policy now fails closed unless the build explicitly sets
  `EXPO_PUBLIC_APP_ENV=production`, `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true`,
  and both Supabase client values through the release environment.
- Development remains usable in demo mode, while production can never use the
  preview OTP fallback.
- Source-level Supabase project defaults are empty, preventing accidental reuse
  of a development project in a release build.
- A signed-in member bootstrap RPC returns the server-owned profile,
  preferences, and ordered photo metadata. Production startup no longer trusts
  local onboarding completion when deciding whether to open Matches.
- Chat media upload paths now include match ID and member ID so private storage
  policies can authorize both mutual-match participants.
- Blocking is server-authoritative across profiles, daily matches, messages,
  chat media, and active live-location sharing.
- Match decisions reject blocked or incomplete recipients on the server.
- Chat sends now use a server-owned RPC with client-message idempotency,
  per-member rate limits, message/media validation, and match/icebreaker checks.
- Database function execution now follows an explicit authenticated allowlist;
  privileged reminder processing remains service-role only.
- Profile, preference, photo metadata, and account-deletion writes now use
  validated server-owned RPCs. Members cannot self-verify, self-approve photos,
  or forge deletion workflow status.
- Exact birth date is excluded from public profile column grants and is returned
  only to its owner through the authenticated bootstrap RPC.
- Reports, unmatch, and live-location sharing now use audited server-owned RPCs
  with idempotency, abuse limits, and active-relationship validation.
- Critical safety reports receive a 15-minute triage target, high-severity
  reports a four-hour target, and normal reports a 24-hour target in the data model.

## Migration 010

`010_backend_security_hardening.sql` adds:

- blocked-pair and active-match security helpers
- blocked-aware profile/photo/message policies
- approved-or-owner profile media reads
- mutual-match chat media reads and member-scoped uploads
- atomic `block_member` behavior
- hardened daily matches and match decisions
- authenticated `get_current_member_bootstrap`

## Migration 011

`011_chat_mutation_and_rpc_privileges.sql` adds:

- idempotent `client_message_id` storage and uniqueness
- server-owned `send_match_message` validation and rate limiting
- removal of direct authenticated message inserts
- privacy guards on block/match helper calls
- an explicit RPC execution allowlist and service-role reminder grant
- restored RLS-protected account-deletion table privileges

## Migration 012

`012_member_profile_mutation_security.sql` adds:

- transactional `save_current_member_profile` validation
- backend-controlled verification, onboarding, and photo approval fields
- member-owned storage path and profile-photo count validation
- removal of direct profile, preference, photo, and deletion workflow writes
- owner-private exact birth date through server-owned bootstrap
- server-owned account deletion request mutation

## Migration 013

`013_safety_actions_and_live_location.sql` adds:

- append-only `safety_action_events` for report, block, unmatch, and location actions
- idempotent, rate-limited `submit_member_report` with severity-based triage targets
- server-owned `unmatch_member` that persists the relationship ending and stops sharing
- active-match-only `start_live_location_share` with duration and hourly limits
- block-aware live-location reads and immediate share termination on block
- removal of direct authenticated report and live-location writes

## Required deployment sequence

1. Create separate Supabase development, staging, and production projects.
2. Link development first and apply migrations 001-017 in order.
3. Regenerate `src/types/database.ts` from the linked schema and review the diff.
4. Run positive and negative RLS tests with two members plus one unrelated and
   one blocked account.
5. Deploy the four Edge Functions and set secrets only in Supabase.
6. Configure email OTP, an SMS provider, rate limits, redirect/deep links, and
   abuse controls.
7. Repeat migration and security validation in staging, then run physical iOS
   and Android smoke tests.
8. Enable backups, logs, alerts, and an incident owner before production.
9. Only then set the production environment lock and deploy production.

Suggested CLI flow after authenticating Supabase CLI:

```bash
supabase link --project-ref <development-project-ref>
supabase db push --include-all
supabase gen types typescript --linked > src/types/database.generated.ts
supabase functions deploy create-gift-order
supabase functions deploy create-date-reservation
supabase functions deploy relationship-reminders
```

Do not overwrite the reviewed hand-maintained types blindly. Compare generated
types, then adopt them once migrations and RPC signatures match.

## RLS smoke matrix

Verify each row in staging using real authenticated sessions:

| Actor | Expected result |
|---|---|
| Profile owner | Read full private bootstrap; update validated fields through the profile RPC |
| Approved, unblocked member | Read public profile and approved photo only |
| Unrelated member | Cannot read messages, chat media, preferences, reports, or private photos |
| Mutual-match participant | Read messages and send through the RPC; use signed chat media for that match only |
| Blocker and blocked member | Cannot discover, message, or read new media from each other |
| Signed-out client | Cannot call bootstrap, block, match-decision, or private storage paths |
| Expo client with service-role key | Must never exist; fail the release review |

## Evidence and limits

- Runtime, bootstrap parser, and SQL security contracts have automated tests.
- Supabase CLI 2.109.1 is pinned, local config is initialized, and a 75-assertion
  transactional pgTAP RLS suite is present.
- A read-only hosted-project probe confirmed email, Google, and phone Auth are
  enabled and `twilio_verify` is configured.
- The expanded verifier currently finds 2 of 25 expected schema objects: only
  legacy `profiles` and `messages` are present; both correctly reject anonymous
  reads.
- The same probe found `get_current_member_bootstrap`, `daily_matches`, and the
  migrations 003-013 tables and newer RPCs absent from the hosted PostgREST schema cache. The
  configured project is therefore not a valid migration target without a
  deliberate baseline/migration decision.
- TypeScript and the complete local test suite pass.
- Migrations 010-014 are source-ready but have not been applied to a linked Supabase
  project in this workspace.
- The pgTAP suite cannot run on this machine until Docker, OrbStack, Podman, or
  another Docker-compatible runtime is installed.
- Real OTP delivery, generated linked types, deployed functions, executed RLS
  integration tests, backups, monitoring, and physical-device tests remain
  external gates.

This raises backend implementation maturity, but it is not a claim that the
production backend is live.
