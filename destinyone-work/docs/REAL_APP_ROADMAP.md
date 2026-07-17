# DestinyOne real app roadmap

The product should not be released as a fake/demo app. This is the step-by-step path from the current polished MVP to a real Play Store app.

## Step 1 — Real backend foundation

Status: in progress.

- Use Supabase for auth, database, realtime chat, and private media storage.
- Production builds must set:
  - `EXPO_PUBLIC_APP_ENV=production`
  - `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Without Supabase keys, production auth is blocked instead of falling back to demo OTP.

## Step 2 — Real OTP

Use Supabase Auth phone OTP with a configured SMS provider.

Recommended for launch:

- Supabase Auth + Twilio SMS.
- Keep OTP rate limits enabled.
- Turn on abuse protections/CAPTCHA where available.
- Do not keep the demo OTP `123456` in production.

## Step 3 — Real user data

Store this in Supabase Postgres:

- Account and auth user ID.
- Profile fields.
- Relationship preferences.
- Photos and voice intro storage paths.
- Verification status.
- Likes, matches, icebreakers, messages, gifts, date proposals, reports, blocks, and subscriptions.

Keep private files in Supabase Storage:

- `profile-media`
- `chat-media`

Use short-lived signed URLs for private media views.

## Step 4 — Real verification

Launch-fast approach:

- Capture selfie.
- Optional government ID upload.
- Store verification files privately.
- Admin manually approves or rejects.
- App shows `Verified Member` only after backend approval.

Upgrade later:

- Persona, Stripe Identity, Onfido, or similar vendor.

## Step 5 — Real matching

Keep match scores internal only. The app should show labels:

- Strong Match
- Great Match
- Exceptional Match

Production matching should run server-side from:

- Intent alignment.
- Values/life goals.
- Lifestyle/vibes.
- Attraction signals inside the app only.

Never read browser searches, contacts, WhatsApp, Google history, or other phone activity.

## Step 6 — Real chat and safety

- Store messages in Supabase.
- Realtime subscriptions for mutual matches only.
- Store reports/blocks server-side.
- Blocked users must disappear from matches and chat.
- Staff must review safety reports before production growth.

## Step 7 — Real payments

- DestinyOne Plus must use Google Play Billing on Android.
- Digital gift coins must use Google Play Billing.
- Real-world gifts/date reservations can use Stripe/Apple Pay/Google Pay server-side where policy-compliant.
- Never trust client coin balances; verify receipts server-side.

### Real-world gift delivery flow

Real gifts should be run through the Supabase `create-gift-order` Edge Function and `gift_orders` / `gift_order_events` tables.

Safe flow:

1. Sender selects a gift and writes a note.
2. Recipient privately accepts and confirms the delivery address.
3. Server authorizes payment for the final quote.
4. Server submits the order to a fulfillment partner such as DoorDash Drive or Uber Direct.
5. Provider webhooks update status: preparing, courier assigned, picked up, delivered.

Required production secrets:

- `GIFT_DELIVERY_PROVIDER=doordash_drive` or `uber_direct`
- Provider API credentials stored only in Supabase Edge Function secrets.
- Payment provider secret keys stored only in Edge Function secrets.

Important privacy rule: the sender must never see the recipient’s exact address.

## Step 8 — Admin operations

Before public launch, create an admin workflow for:

- Verification review.
- Photo moderation.
- Report review.
- Account deletion requests.
- Refund/support cases.
- Gift-order operations.

## Step 9 — Play Store testing

- Internal testing first.
- Closed testing if Google requires it.
- Use 12 testers for 14 continuous days if the Play account is a new personal account.
- Then submit production rollout.
