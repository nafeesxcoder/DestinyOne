# Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add the project URL and anon/publishable key.
3. Never put the service-role key in the Expo app.
4. Run the pinned CLI with `pnpm supabase`. Link a dedicated development
   project, then apply migrations with `pnpm supabase db push`.
5. Configure an SMS provider in Supabase Auth before enabling production phone OTP.
6. Generate fresh database types after every migration:

```bash
pnpm supabase gen types typescript --linked > src/types/database.generated.ts
```

## Repeatable local checks

The official CLI is pinned in `devDependencies` and `supabase/config.toml`
contains the local Auth, Storage and Edge Function configuration.

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:lint
pnpm supabase:check
pnpm supabase:types > src/types/database.generated.ts
```

`supabase/tests/database/backend_security.test.sql` is a transactional pgTAP
matrix covering bootstrap identity, icebreaker-gated messaging, blocking, and
blocked profile/chat access, including idempotent server-owned message sends.
A Docker-compatible runtime is required for these
local database commands.

To inspect a configured hosted project without secrets or mutations:

```bash
set -a; source .env.local; set +a
pnpm supabase:verify
```

The verifier checks public Auth settings and whether expected REST tables/RPCs
exist. It exits non-zero when the hosted schema is behind the source migrations.

Profile and chat buckets are private. Production media reads should use short-lived signed URLs generated only after membership and block checks.

For the optional Apple Pay date-reservation flow, follow `docs/PAYMENTS.md`. The Stripe secret belongs only in Supabase Edge Function secrets.

Before store submission, run the app's Backend / Supabase Launch Gate checklist in `docs/BACKEND_LAUNCH_GATE.md`. The schema can be ready while production SMS, server secrets, backups and monitoring are still pending.

## Current production backend coverage

The migrations now include the main app foundation:

- Profiles, photos, preferences, matches, likes, icebreakers and messages.
- Reports, blocks, safety check-ins, account deletion requests and privacy settings.
- Support tickets with topic/priority/status for Safety, Billing, Account and bugs.
- Profile-view notifications after the configured time threshold, without notifying on swipe previews.
- Real gift order records, quote metadata, private recipient acceptance, tracking events and provider state.
- Live location shares for mutual matches with expiry.
- Chat settings for nickname/theme per match.
- Push token storage for later notification delivery.
- Relationship Path state with recipient-only date responses, completed-date gating and member-private post-date reflections.
- Explicit per-reflection matching consent, revocable coarse learning signals and private accepted-date reminders.
- Consent-gated Relationship Path metrics with a strict property allowlist and no partner/profile/message identifiers.
- Block-aware profiles, matches, likes, icebreakers, messages, date proposals,
  profile media and match-scoped chat media.
- Explicit client grants for authenticated operations; anonymous database table
  access and direct client writes to likes/blocks are revoked.
- Server-owned chat mutation with idempotent client message IDs, rate limits,
  match-scoped media validation, and an explicit RPC execution allowlist.
- Server-owned profile/onboarding mutation that preserves backend verification
  and photo approval, validates owned media paths, and keeps exact birth date
  out of public profile column grants.
- Reciprocal server-side matching with hard preference/safety filters, versioned
  explainable ranking, hidden scores, consented outcome learning, exposure
  metrics, member reset, and service-role model rollback.

Real provider integrations still belong in Edge Functions/server workers:

- SMS/phone OTP provider in Supabase Auth.
- DoorDash Drive/Uber Direct gift fulfillment.
- Stripe/Apple Pay payment capture.
- Push notification sending.
- Schedule `relationship-reminders` with `RELATIONSHIP_REMINDER_CRON_SECRET`; it creates private in-app reminders and can hand off to the push worker.
- Human moderation/admin dashboard.
