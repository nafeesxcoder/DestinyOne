# DestinyOne payments

## Simple checkout rules

- **DestinyOne Plus and gift coins:** digital features use Apple in-app purchase or Google Play Billing. They are not charged through Apple Pay.
- **Date venue reservation holds:** optional real-world services may use Stripe with Apple Pay. The current MVP uses a refundable $10 demo hold.
- **Delivered gifts:** physical goods may use Apple Pay after the recipient privately accepts delivery. The sender never receives the recipient's address.
- The app never receives a Stripe secret key and never decides the final amount. The Edge Function owns pricing and creates the PaymentIntent.

## Production setup

1. Register `merchant.com.destinyone.app` in the Apple Developer portal and add the Stripe-generated Apple Pay certificate.
2. Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` and set `EXPO_PUBLIC_PAYMENTS_API_URL` to `https://YOUR_PROJECT.supabase.co/functions/v1` in EAS environment variables.
3. Set the server-only secret and deploy:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase functions deploy create-date-reservation-intent
supabase functions deploy create-gift-order
```

4. Create an EAS development build. Apple Pay and Google Pay are unavailable in Expo Go.
5. Replace sample venue and gift catalogs with server-owned inventory and pricing, connect a contracted fulfillment provider, and add recipient-consent expiry, webhook-based refunds/cancellations, idempotency keys, receipts, and operational reconciliation.

The client falls back to an explicitly labelled demo reservation when Stripe credentials are absent, so previewing the app can never charge a real payment method.

Before store submission, pass the in-app **Payments & Entitlements Gate** and the checklist in `docs/PAYMENT_ENTITLEMENTS.md`. Store products, receipt verification, entitlement persistence and webhook reconciliation must be live before any paid feature unlocks in production.
