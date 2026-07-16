# Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add the project URL and anon/publishable key.
3. Never put the service-role key in the Expo app.
4. Install the Supabase CLI and run `supabase link`, then `supabase db push`.
5. Configure an SMS provider in Supabase Auth before enabling production phone OTP.
6. Generate fresh database types after every migration:

```bash
supabase gen types typescript --linked > src/types/database.generated.ts
```

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

Real provider integrations still belong in Edge Functions/server workers:

- SMS/phone OTP provider in Supabase Auth.
- DoorDash Drive/Uber Direct gift fulfillment.
- Stripe/Apple Pay payment capture.
- Push notification sending.
- Human moderation/admin dashboard.
