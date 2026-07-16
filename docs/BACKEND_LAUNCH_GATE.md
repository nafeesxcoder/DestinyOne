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

- migrations for profiles, preferences, matches, chat, reports, blocks, safety check-ins, support tickets, gifts, date proposals and notifications
- typed client integration
- auth adapter for email/phone OTP
- realtime chat/persistence hooks
- private media upload paths
- Edge Function stubs for real gifts and date reservations

But production launch still needs:

1. Production build lock: `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true`
2. Supabase Auth email template verified on real devices
3. SMS/Twilio-style phone OTP provider enabled
4. Edge Function secrets for Stripe, gift provider, push and service-role operations
5. Supabase backups, log drains, webhook logs, crash monitoring and alert owner
6. Physical-device smoke tests for auth, RLS, realtime, storage and Edge Functions

## Production rule

Do not launch if demo OTP, client-trusted balances, missing server secrets, untested RLS, or no backup/monitoring is still active.
