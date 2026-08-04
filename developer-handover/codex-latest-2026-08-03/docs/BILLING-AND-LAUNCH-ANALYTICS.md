# Billing and launch analytics handoff

This layer adds production-safe purchase and launch-measurement contracts without changing the approved DestinyOne UI. It deliberately fails closed until owner-controlled Apple/Google products and secrets are configured.

## Store billing flow

1. The authenticated app asks the server to prepare a purchase for one active product/platform mapping.
2. `expo-iap` opens the native App Store or Google Play sheet. Web checkout cannot charge for a digital product.
3. The native receipt/token is sent to `verify-store-purchase`; it is never persisted raw.
4. The Edge Function checks session ownership, hashes receipt identifiers and HMAC-signs a request to the private verifier adapter.
5. The adapter must validate with App Store Server API or Google Play Developer API and return the normalized response below.
6. The existing idempotent billing processor records the provider event and entitlement ledger.
7. Only a response containing `finishedTransactionAllowed: true` allows the client to finish the native transaction.

Required Edge Function secrets:

```text
STORE_PURCHASE_VERIFIER_URL=https://private-verifier.example.com/verify
STORE_PURCHASE_VERIFIER_SECRET=<32+ random bytes>
```

Expected verifier response:

```json
{
  "verified": true,
  "platform": "apple_iap",
  "eventId": "provider-idempotency-id",
  "eventType": "purchase",
  "productId": "com.destinyone.app.membership.plus.annual",
  "transactionId": "provider-transaction-id",
  "originalTransactionId": "provider-original-id",
  "status": "active",
  "amountCents": 75000,
  "currency": "USD",
  "environment": "sandbox",
  "verificationSource": "apple_server_api",
  "providerSignedAt": "2026-08-03T00:00:00Z",
  "purchasedAt": "2026-08-03T00:00:00Z",
  "expiresAt": "2027-08-03T00:00:00Z",
  "units": 1
}
```

The verifier must independently validate bundle/package ID, product, signed data, transaction ownership, environment, purchase state and provider time. Never echo a client claim as a verified field.

Catalog mappings in migration `20260803225305_billing_launch_analytics.sql` start inactive. Create matching products in App Store Connect and Play Console, record approved catalog evidence, then activate only reviewed mappings. Executive billing remains approval-gated.

## Launch analytics

- Consent defaults off and is checked again by the database on every session/event RPC.
- Events use a strict taxonomy and at most 12 allowlisted scalar properties.
- Names, email, phone, message content, profile/match IDs, address/GPS, photos, auth tokens and transaction IDs are rejected or removed.
- The client keeps up to 100 safe events offline and retries idempotently.
- Each cold app launch gets a new session ID; duplicate delivery does not increase event counts.
- Consent withdrawal deletes the local queue plus the member's server analytics sessions/events.
- Raw analytics tables have no authenticated table privileges. Only service-role aggregate snapshots are available for launch dashboards.

Initial launch funnel: session → onboarding → discovery → membership view → checkout start → store open → verification → completion/failure → restore outcome. Use aggregate counts, not private member-level dashboards.

## Manual launch evidence still required

- App Store Connect and Play Console product approval.
- Apple/Google server credentials stored only in the verifier service.
- Provider notification/webhook configuration.
- Physical iOS and Android sandbox tests for purchase, pending, restore, renewal, grace, refund, chargeback and account switching.
- Production analytics consent/withdrawal QA and retention review.
- Dashboard owner, payment support owner and alert SLA.

Source completeness does not mean live billing is enabled. No production charge or provider validation is claimed until this evidence exists.
