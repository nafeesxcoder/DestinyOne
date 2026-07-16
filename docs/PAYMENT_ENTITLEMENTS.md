# DestinyOne — Payments & Entitlements Gate

This gate keeps paid features honest before DestinyOne is submitted to the stores.

The app can preview pricing, Spark packs, Executive Circle and restore-purchase copy, but production must not unlock paid benefits from local state alone.

## What the gate checks

1. Paid product catalog: Base, Plus, Elite, Spark packs and Executive Circle
2. Checkout surfaces: price, period, renewal, cancellation and restore copy
3. Apple / Google product IDs mapped to exact entitlements
4. Server-side receipt verification before unlock
5. Entitlement ledger for daily matches, likes access, filters, Spark wallet and limits
6. Restore purchase and cancellation disclosures
7. Stripe / Apple Pay path for date holds and physical gifts
8. Refund support, anti-spam limits and Trust Ops handoff
9. Production billing lock so preview unlocks cannot ship by mistake

## Current app status

The app-side catalog, pricing UI, restore preview, feature-limit model, Spark wallet preview and billing support copy are represented.

Final live release still needs:

- App Store / Google Play product IDs
- Server receipt verification
- Store purchase / restore testing on physical iOS and Android builds
- Stripe webhook reconciliation for date holds and physical gifts
- Refund, cancellation and chargeback workflows
- Production lock that blocks all client-only paid unlocks

## Production rule

For digital features such as memberships and Spark packs:

- Use Apple in-app purchase on iOS.
- Use Google Play Billing on Android.
- Verify receipts server-side before unlocking.
- Store the entitlement in the backend with plan, expiry, source, transaction ID and restore status.

For real-world services such as date reservations or physical gifts:

- Use server-owned pricing.
- Require recipient or venue consent before capture.
- Use payment webhooks for confirmation, refund and cancellation.
- Never expose the recipient address to the sender.
