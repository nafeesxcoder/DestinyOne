# Real Gift Fulfillment

DestinyOne gifts are designed as recipient-private delivery requests, not a normal ecommerce checkout.

## Provider approach

Use a provider adapter behind the Supabase Edge Function:

- DoorDash Drive for on-demand / same-day courier fulfillment.
- Uber Direct for courier dispatch and merchant-delivery operations.
- A local florist/dessert partner can be added later behind the same response shape.

The app never calls provider APIs directly and never redirects to a provider checkout. It calls the DestinyOne BFF at `EXPO_PUBLIC_GIFTS_API_URL/create-gift-order`; that server selects the contracted merchant/courier adapter by city and availability.

The client contract includes `senderDisplayName`, `senderDisplayMode: first_name`, `recipientAddressMode: recipient_supplied_private`, `occasion`, `deliveryWindow`, city-level delivery context, and an optional route-distance estimate. Provider credentials, merchant routing keys, raw address data, payment tokens, and webhook secrets remain server-only.

## Quote and fee rules

`estimateGiftOrderQuote` is the production-parity preview calculator. The Edge Function repeats the same shape with catalog prices owned by the server.

- Item subtotal comes from the server catalog in production.
- Delivery includes a product/provider base fee plus distance above the first five miles.
- ASAP orders can add a rush fee; small baskets can add a small-order fee.
- DestinyOne service fee and estimated local tax are itemized separately.
- Scheduled orders move the ETA into a future window.
- The quote includes `pricingVersion`, `quotedAt`, `expiresAt`, city, estimated distance and `exactRoutePending`.
- The UI refreshes the ten-minute estimate. After recipient consent, the server recalculates the exact private route before payment authorization.

The preview formula is testable, but it is not an authority for live charges. Production must return the final server quote and must not accept `priceCents` from the client as truth.

## Confirmation contract

Every order response contains four confirmation channels:

1. Sender in-app receipt.
2. Recipient private in-app acceptance request.
3. Sender transactional email receipt.
4. Recipient transactional email request.

Preview mode marks external channels `preview_only`; it never claims a real email was sent. The developer must connect a transactional provider adapter, templates, idempotency keys, unsubscribe/legal rules where applicable, delivery webhooks and retry/dead-letter handling. Production responses mark accepted jobs `queued`, then webhook/event processing advances them to `sent` or `failed`.

## Five-step order lifecycle

1. `recipient_pending` — sender created the gift request.
2. `recipient_accepted` — recipient privately accepted and confirmed address.
3. `payment_authorized` — server authorized payment after acceptance.
4. `merchant_preparing` / `courier_assigned` — partner is preparing or courier is assigned.
5. `picked_up` / `delivered` — courier pickup and completion.

## Privacy and safety

- Sender sees ETA, total, and a provider-neutral tracking state inside DestinyOne.
- Sender does not see recipient address.
- Recipient sees the sender's approved first name. Anonymous physical orders are not offered.
- Recipient can decline before payment is authorized.
- Vetted merchants and couriers receive only the delivery data required for fulfillment after consent. Their identity remains available to support and appears to the recipient where receipts, labeling, or law require it.
- Support/admin can cancel or refund from backend tooling.

## Current MVP behavior

If `EXPO_PUBLIC_GIFTS_API_URL` is missing, the app runs a deterministic demo flow:

- Same product prices and ETA math.
- Five-step timeline.
- Live, itemized price estimate with delivery window and city context.
- Sender/recipient in-app and email confirmation contract.
- Demo tracking URL.
- No real charge, courier request or external email.

This lets the UI and logic be tested before provider credentials are available.

## Gift Fulfillment Gate

Before live release, pass the in-app **Gift Fulfillment Gate**. It checks:

1. Gift catalog has at least 10 real items with server-owned pricing.
2. Recipient consent and private address collection are complete.
3. Delivery partner coverage exists for launch cities.
4. Payment is authorized only after recipient acceptance and captured only after provider confirmation.
5. Provider webhooks write order status into `gift_order_events`.
6. Gift tracking updates chat and notifications.
7. Block graph, report flow and purchase velocity limits prevent gift abuse.
8. Refund, cancellation, failed-courier and declined-recipient support paths are staffed.
9. Production builds are locked away from demo fulfillment.
10. iOS and Android physical-device QA covers accept, decline, timeout, payment, delivery failure and refund.

Current app status: catalog, ETA math, private-recipient copy, tracking UI and demo flow are ready. Final live release still needs the actual delivery partner, payment webhooks, provider webhooks, partner coverage, and real-device QA.
