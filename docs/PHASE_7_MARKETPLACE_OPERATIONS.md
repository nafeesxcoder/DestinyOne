# Phase 7: marketplace booking operations

## Outcome

The local product now models the complete control path for a date booking:

1. A recently provider-synced slot produces a short-lived, server-priced quote.
2. The purchaser creates an order only inside an active match.
3. Both distinct match members must accept before payment preparation.
4. The payment Edge Function validates the bearer token and asks the database
   for the immutable order total; the client never supplies price.
5. Signed provider/payment webhooks advance the order idempotently.
6. Cancellation enters an explicit refund path and append-only events support
   customer service and reconciliation.

The marketplace checkout sheet previews this lifecycle end to end, including
acceptance, payment selection, provider confirmation, itinerary management and
cancellation. It continues to state clearly that preview mode does not charge
or reserve live inventory.

## Migration 016

`016_marketplace_booking_operations.sql` adds private partners, venues,
offerings, availability, quotes, orders, order events and webhook receipts. The
member-facing mutation surface is restricted to security-definer RPCs with
active-match, quote-freshness, capacity, ownership and idempotency checks.
Operational inventory and webhook receipts remain service-only.

## Payment boundary

`create-date-reservation-intent` now accepts an order ID, validates the Supabase
session, calls `prepare_marketplace_payment`, and creates Stripe intents with a
stable idempotency key. `marketplace-booking-webhook` verifies an HMAC signature
before calling the service-only webhook processor.

## Evidence

- 16 contiguous migrations
- 4 Edge Functions
- 98 pgTAP security assertions
- 44 test files and 167 tests
- TypeScript and source deployment preflight pass

## Remaining production gates

- No live places, reservation, payment, Apple Pay, Google Pay or refund provider
  is connected.
- Partner contracts, real availability SLAs, customer support staffing,
  webhook alerts, financial reconciliation jobs and refund exception handling
  need staging and production evidence.
- Migration 016 and its RLS tests have not run against the hosted Supabase
  project. Production readiness therefore remains blocked and is not claimed.
