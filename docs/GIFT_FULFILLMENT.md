# Real Gift Fulfillment

DestinyOne gifts are designed as recipient-private delivery requests, not a normal ecommerce checkout.

## Provider approach

Use a provider adapter behind the Supabase Edge Function:

- DoorDash Drive for on-demand / same-day courier fulfillment.
- Uber Direct for courier dispatch and merchant-delivery operations.
- A local florist/dessert partner can be added later behind the same response shape.

The app never calls provider APIs directly. It calls `EXPO_PUBLIC_GIFTS_API_URL/create-gift-order`.

## Five-step order lifecycle

1. `recipient_pending` — sender created the gift request.
2. `recipient_accepted` — recipient privately accepted and confirmed address.
3. `payment_authorized` — server authorized payment after acceptance.
4. `merchant_preparing` / `courier_assigned` — partner is preparing or courier is assigned.
5. `picked_up` / `delivered` — courier pickup and completion.

## Privacy and safety

- Sender sees ETA, provider, total, and tracking state.
- Sender does not see recipient address.
- Recipient can decline before payment is authorized.
- Support/admin can cancel or refund from backend tooling.

## Current MVP behavior

If `EXPO_PUBLIC_GIFTS_API_URL` is missing, the app runs a deterministic demo flow:

- Same product prices and ETA math.
- Five-step timeline.
- Demo tracking URL.
- No real charge or courier request.

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
