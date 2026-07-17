# Phase 7: Marketplace Operations

## Honest score

- Source controls: **10/10**
- Live operations: **3/10**

The source implements the complete booking control path. The live score remains
low because real provider inventory, signed partner contracts, payment accounts,
staffed support and reconciled pilot evidence do not yet exist.

## Booking control path

1. Only an active partner with verified contract, insurance, tax, payout,
   cancellation-policy and safety evidence can supply bookable inventory.
2. Every provider sync records source identity, payload hash and sync ID.
3. A fresh slot creates a short-lived, server-priced quote and atomically
   decrements capacity. Expired, declined and failed holds restore capacity.
4. An order can be created only inside an active match. Both distinct members
   must accept before payment preparation.
5. The payment Edge Function obtains the immutable amount and currency from the
   database. The client cannot select or alter the charge.
6. Signed provider webhooks are idempotent, record a raw-payload hash, validate
   amount and currency, and enforce legal state transitions.
7. Cancellation and refund eligibility are calculated server-side from the
   captured amount, cutoff and offering terms.
8. Booking participants retain access to orders, events, cancellation and
   refund rights after a match ends.
9. Reconciliation jobs create private cases for amount, stale-confirmation,
   provider-failure and refund mismatches.

## Source implementation

Migration `016_marketplace_booking_operations.sql` defines the private booking
system. Migration `027_marketplace_operations_control_plane.sql` adds partner
compliance, atomic holds, provider sync provenance, refund cases, strict webhook
transitions and reconciliation cases.

The app service layer exposes idempotent quote, order, response, cancellation
and refund adapters. The Admin Audit keeps source-control readiness separate
from live provider readiness so mock data cannot produce a false launch claim.

## Automated evidence

- 28 ordered migrations
- 5 privileged Edge Functions
- 245 pgTAP security assertions
- 71 test files and 301 passing tests
- TypeScript, source deployment preflight and Expo web export pass

## Remaining live gates

- Contract and onboard real venue/provider supply with current photos, licensing,
  accessibility, pricing, availability, safety and cancellation data.
- Connect live payment, Apple Pay/Google Pay where eligible, provider booking and
  refund accounts in staging and production.
- Execute hold, confirmation, cancellation, partial refund, full refund, no-show,
  dispute and provider-outage drills with reconciled evidence.
- Staff marketplace support and incident escalation to the published SLA.
- Prove booking success, cancellation, refund, fraud, support cost and contribution
  margin targets in a controlled city pilot.

Until these gates pass, DestinyOne must describe marketplace actions as preview
or sandbox behavior and must not claim a live reservation.
