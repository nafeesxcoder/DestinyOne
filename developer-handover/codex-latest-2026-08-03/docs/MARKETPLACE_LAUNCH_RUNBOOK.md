# DestinyOne Marketplace Launch Runbook

## What is live in the product

- Secure city, category, and keyword place search through the `search-places` Edge Function.
- USA and Canada city input without a hard-coded launch-city restriction.
- Up to 60 provider search results through paginated Text Search results.
- Saved date ideas, date planning, first-date safety guidance, and directions for returned places.
- Payment intent preparation for a server-owned Marketplace order when an approved partner offering exists.

## What must be true before a real booking button is enabled

1. A signed partner agreement covers availability, pricing, cancellation, refunds, support escalation, and data handling.
2. The venue, offering, and availability slot are active in the Marketplace database.
3. The booking provider can create and cancel holds idempotently and sends signed webhooks.
4. The order flow displays the all-in price, tax, fees, refund deadline, and cancellation terms before payment.
5. Payment confirmation, refund, reconciliation, support escalation, and incident alerts are tested end to end.
6. A staffed owner is on-call for failed bookings, no-shows, safety reports, and provider outages.

## Required production configuration

- Store `GOOGLE_MAPS_API_KEY` only as a Supabase Edge Function secret. Never put it in Expo public environment variables.
- Enable Places API (New), billing, request quotas, and API-key restrictions in the provider console.
- Deploy `search-places` with JWT verification enabled.
- Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the released client.
- Configure Stripe server secrets only for payment-enabled partner inventory.

## Release verification

1. Sign in with a normal member account.
2. Search a city in the USA and a city in Canada using a category and a free-text query.
3. Load another page of results and confirm no duplicate cards appear.
4. Open a result, verify its address, open state, rating, and directions link.
5. Confirm that a non-partner live place says `Plan`, not `Reserve`.
6. Test a seeded approved offering through quote, order, payment, webhook, cancellation, refund, and support escalation.
7. Verify provider errors return a calm fallback and do not reveal credentials or stack details.

## Honest launch standard

Live discovery can cover cities broadly. Marketplace bookings cannot honestly be called nationwide until the partner inventory, provider agreements, payment webhooks, refund operations, and support coverage have been activated for each market.
