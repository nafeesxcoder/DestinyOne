# DestinyOne observability and privacy gate

DestinyOne needs analytics and crash monitoring before scale, but it must never feel creepy. Observability should improve reliability and match quality without collecting private dating content.

## What can be tracked

- App flow events: onboarding started/completed, match viewed, interested/pass, mutual match, icebreaker answered.
- Relationship Path events: path stage opened, date status transition, reflection category saved, matching-consent change and reminder change.
- Commerce flow events: Spark/Rose sent, gift quote requested, gift order state, date reservation intent.
- Safety/support events: report submitted, block used, safety check-in state, support ticket created.
- Reliability events: app crash, screen load failure, slow startup, failed media picker, failed payment or provider timeout.

## What must never go to analytics or crash logs

- Phone numbers, email addresses, OTPs, passwords, auth tokens or provider secrets.
- Exact location, raw GPS coordinates, private address, delivery address or live-location trail.
- Message text, voice note audio, uploaded photos, verification files or selfie source media.
- Real profile IDs when an aggregate/surrogate event ID is enough.
- Sensitive inferred attributes such as caste, health, income, immigration status or politics.

## Launch gate checks

The in-app **Observability / Privacy Gate** checks:

1. Privacy-safe telemetry boundary and metadata redaction
2. Event taxonomy for the critical product flows
3. Consent, opt-out/reset, retention and Data Safety alignment
4. Crash reporting provider connection
5. Performance dashboards for core flows
6. Provider keys kept out of client code
7. Alert owner and response SLA
8. Physical-device QA for crash, events, opt-out and app resume

## Provider connection plan

When backend/API work is resumed, connect providers in this order:

1. Crash reporting provider such as Sentry or Bugsnag.
2. Privacy-consented analytics provider such as PostHog, Amplitude or Segment.
3. Performance monitoring for startup, navigation, chat send, media picker, gift quote and date reservation quote.
4. Alert routing to the Trust/Ops owner for crash spikes, auth failures, gift/date provider errors and payment failures.

Current app status: privacy-safe event boundaries, redaction logic, error boundary, an off-by-default analytics control and a server-side Relationship Path property allowlist are ready. Final live release still needs provider DSNs/keys, dashboards, alert ownership, consent QA and physical-device validation.
