# DestinyOne — Backend / Supabase Launch Gate

This P1 gate separates “the backend structure is ready” from “production backend is safe to launch.”

## What is included now

- Supabase launch readiness engine for:
  - client config and production environment lock
  - email/phone auth providers
  - schema migrations and generated database types
  - RLS/security policy coverage
  - realtime persistence for chat, notifications, gifts, dates, support and safety
  - private profile/chat storage
  - Edge Functions for privileged actions
  - server-only secrets
  - backup, logs and monitoring
- Admin Audit card showing schema coverage, realtime modules, provider modules, blockers and next best step.
- Tests covering missing Supabase config, final provider/secrets work, and fully ready backend launch.

## Current honest status

The app has a strong Supabase-shaped backend foundation:

- twenty-seven ordered migrations for server-owned profile/chat writes, reciprocal matching, preferences, matches,
  audited reports/blocks/unmatch/live-location, safety check-ins, support tickets,
  gifts, date proposals, relationship learning, notifications, and private-media hardening
- typed client integration
- auth adapter for email/phone OTP
- realtime chat/persistence hooks
- private media upload paths
- Edge Function stubs for real gifts and date reservations
- a source preflight that validates migration order, database contracts, pgTAP
  coverage, Edge Function entrypoints, and client secret boundaries
- a manual GitHub production workflow with an environment approval gate, remote
  credential checks, migration dry run, reviewed push, Edge Function deployment,
  linked schema lint, the 219-assertion pgTAP suite, post-deploy verification,
  and a commit-linked evidence artifact

But production launch still needs:

1. Production build lock: `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true`
2. Supabase Auth email template verified on real devices
3. SMS/Twilio-style phone OTP provider enabled
4. Edge Function secrets for Stripe, gift provider, push and service-role operations
5. Supabase backups, log drains, webhook logs, crash monitoring and alert owner
6. Physical-device smoke tests for auth, RLS, realtime, storage and Edge Functions

## Verified hosted-project state (2026-07-16)

- Public Auth settings respond successfully.
- Email, Google, and phone providers are enabled; phone reports
  `twilio_verify` as its configured SMS provider.
- The source migration chain is not deployed: the hosted schema does not expose
  `daily_matches`, `get_current_member_bootstrap`, `member_notifications`,
  relationship journey/learning tables, `gift_orders`, or
  `live_location_shares`, `safety_action_events`, or the safety mutation RPCs.
- Do not run migration 001 blindly against this existing project: it already
  contains tables named `profiles` and `messages`, so a clean development
  project or reviewed baseline migration is required.
- `pnpm backend:preflight` verifies source readiness without remote credentials.
- `pnpm supabase:verify` reproduces the non-destructive deployment check and
  fails for missing objects, disabled RLS, anonymous policy/grant exposure, or
  unhealthy endpoints.
- The legacy audit found only `profiles` and `messages` from an older 27-object
  inventory. It does not satisfy the current v27 contract of 83 tables and 63
  RPCs; the protected workflow must produce fresh service-role evidence.

## Safe hosted deployment sequence

1. Create a staging Supabase project and run `pnpm supabase:check` there first.
2. Inspect the existing hosted `profiles` and `messages` definitions and data.
3. Decide whether to migrate that legacy data or use a clean production project.
4. Align `supabase_migrations.schema_migrations`; never mark 001 applied without
   proving its full schema contract exists.
5. Configure the GitHub `production` environment with required reviewers and:
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
   `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
6. Run **Supabase production gate** manually, type `DEPLOY`, and confirm that the
   legacy baseline was reviewed. The job performs a dry run before any push.
7. Require linked lint and all 219 pgTAP assertions to pass, then require the
   final hosted verifier to report every object present, zero anonymous
   exposures, and zero unhealthy endpoints. Retain the commit-linked evidence
   artifact from the workflow.

The Admin Audit now keeps the schema gate incomplete until hosted verification,
migration-history alignment, and target database tests are all proven.

## Production rule

Do not launch if demo OTP, client-trusted balances, missing server secrets, untested RLS, or no backup/monitoring is still active.
