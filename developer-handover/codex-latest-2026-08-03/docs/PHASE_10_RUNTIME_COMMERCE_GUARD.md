# Phase 10: runtime commerce guard

DestinyOne uses one runtime capability policy for date reservations, physical
gift delivery, digital gift wallets and Trusted Circle rewards.

Local demonstrations remain available only in development preview mode. A
staging pilot with the real-backend lock and every production build are strict:
an unconnected provider produces an unavailable state and an explicit error,
not a fake reservation, order, wallet spend or reward balance change.

The policy opens each capability independently. Connecting Stripe/date
reservation services does not imply gifts, store billing or vouch rewards are
ready. Physical gift ordering requires its own server/courier integration.
Digital gifts require server-verified Apple/Google billing and wallet sync.
Vouch rewards require verified invite completion plus a server-owned ledger.

Automated tests prove that missing providers still support harmless local demos
in development, while production and real-backend staging reject all economic
mutations without creating a local success record.
