# DestinyOne - External Services Setup

The development backend is live. These are the only external inputs still needed before a public production launch. Do not paste any secret into the Expo app or a chat; add server-only values in Supabase Edge Function secrets or the relevant vendor dashboard.

## Can run now at no extra cost

| Capability | Current state | What it needs |
| --- | --- | --- |
| Email sign-up and profile setup | Working in development | Supabase email provider; the free provider is rate-limited |
| Profiles, matching, Couple Mode, chat, safety tools | Working in development | No additional vendor |
| Development web preview | Working after deployment | Hosted site deployment |
| Date and gift screens | Demo mode | No charge is ever created without server credentials |

## Required for a real public pilot

### 1. Production Supabase project

Create a new, clean production Supabase project. Do not point production at the current legacy project because its schema is incompatible with the current DestinyOne migration history.

Provide through the release environment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` or a publishable key
- Supabase project reference and database password only for the deployment operator
- `SUPABASE_SERVICE_ROLE_KEY` only as a Supabase/CI secret

Set `EXPO_PUBLIC_APP_ENV=production` and `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true` for every production build.

### 2. Login delivery

| User experience | Recommended provider | Required setup |
| --- | --- | --- |
| Branded sign-in emails | Resend, Postmark, or SendGrid SMTP | Configure SMTP in Supabase Auth and add a verified DestinyOne sender domain |
| SMS OTP | Twilio Verify | Create a Twilio account, verify the sending configuration, then add the Twilio credentials in Supabase Auth |
| Apple / Google sign-in | Apple Developer and Google Cloud | Create OAuth credentials and configure callback URLs in Supabase Auth |

Email-only sign-in can be used for the first small pilot. Phone OTP and Couple Mode phone lookup should only be publicly enabled after SMS delivery is configured and tested on real devices.

### 3. Payments and subscriptions

- Stripe account: `STRIPE_SECRET_KEY` in Supabase Edge Function secrets and `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the release environment.
- Apple Developer account: App ID, in-app purchase products, Apple Pay merchant ID, and App Store Server Notifications credentials.
- Google Play Console account: subscription products and Google Play Developer API credentials.
- `STORE_BILLING_WEBHOOK_SECRET` in Edge Function secrets.

Use Apple/Google in-app purchases for digital subscriptions and coins. Use Stripe only for eligible physical goods or real-world venue reservation holds.

### 4. Marketplace operations

The app database and webhook endpoints are ready, but live bookings need a real operations partner.

- Venue/event inventory source or partner API for each launch city.
- Gift fulfillment partner, catalogue, delivery coverage, refunds, and support owner.
- `MARKETPLACE_WEBHOOK_SECRET` in Edge Function secrets.
- `GIFT_PROVIDER_API_KEY` and provider-specific endpoint secrets when a fulfillment partner is chosen.

Start with Toronto only for the first operational pilot. Expand city by city after fulfilment, refund, and support response times are proven.

### 5. Notifications, reminders, and monitoring

- Expo push credentials / Apple APNs key / Firebase Cloud Messaging configuration.
- `RELATIONSHIP_REMINDER_CRON_SECRET` in Edge Function secrets and a scheduled daily request to the reminder function.
- Crash monitoring account (Sentry recommended), uptime monitor, database backup policy, and an on-call/support owner.

## Exact secrets by location

| Value | Where it belongs | Never put it in |
| --- | --- | --- |
| Supabase publishable/anon key | Expo/EAS release environment | Source code committed to git |
| Stripe publishable key | Expo/EAS release environment | Backend-only secret storage |
| `STRIPE_SECRET_KEY` | Supabase Edge Function secret | Expo app or web bundle |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret / CI secret | Expo app, browser, or git |
| Webhook and cron secrets | Supabase Edge Function secrets | Expo app or git |
| Twilio / SMTP credentials | Supabase Auth provider settings | Expo app or git |

## Recommended order

1. Create the clean production Supabase project.
2. Set branded SMTP, then test email sign-in on iPhone, Android, and web.
3. Configure Twilio Verify and test SMS OTP before enabling public phone login.
4. Deploy the approved database migrations and Edge Functions to production.
5. Run a private Toronto pilot with real profiles, matching, chat, reports, and Couple Mode.
6. Add Stripe and store billing only after the pilot trust/safety workflow is operating well.
7. Add one venue and one gift partner, then run real booking/fulfilment tests before expanding cities.

## What I need from you next

The safest next action is a clean production Supabase project. Once it is created and connected, I can deploy the already-tested schema and functions there. After that, send only confirmation that the vendor accounts are connected; keep all secret values inside their provider dashboards or the app's secret manager.
