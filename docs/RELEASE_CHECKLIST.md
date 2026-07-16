# DestinyOne — Release Checklist

## Automated gate

- [x] TypeScript compilation passes
- [x] Domain tests pass
- [x] Expo production web export passes
- [x] App icon, splash image, adaptive icon, and favicon are configured
- [x] iOS bundle ID and Android package ID are configured
- [x] Build numbers start at 1 and EAS profiles are defined
- [x] Product QA, Interaction QA, Dating Policy Compliance, Store Review, and Release Readiness domain gates are covered by tests
- [x] Profile setup includes the current 25–35 audience age gate

Run before every release:

```bash
pnpm release:check
```

## Product QA

- [ ] Test first launch, returning session, logout, and account deletion on a physical iPhone and Android phone
- [ ] Test phone OTP, email auth, resend/rate limits, expired codes, and offline failures against production Supabase
- [ ] Verify three-photo upload, selfie verification, microphone recording, denied permissions, and large files
- [ ] Verify match limits for Free and Plus, mutual match, icebreaker gate, realtime chat, report, block, and unmatch
- [ ] Verify gift balance cannot go negative and real purchases restore correctly
- [ ] Verify location remains approximate, opt-in, foreground-only, and disabled after consent withdrawal
- [ ] Test VoiceOver and TalkBack, large text, contrast, keyboard navigation, and reduced motion
- [ ] Test slow network, airplane mode, expired session, app resume, and crash recovery

## Production services

- [ ] Create separate production Supabase project and apply all migrations
- [ ] Configure production URL and anon key in EAS environment secrets
- [ ] Configure SMS/email provider, redirect URLs, CAPTCHA/rate limits, backups, and database monitoring
- [ ] Pass Backend / Supabase Launch Gate: production backend lock, SMS provider, generated types, RLS audit, realtime smoke tests, storage signed reads, Edge Function deployment, server secrets, backups and monitoring
- [ ] Add server-verified Apple/Google subscription and coin-purchase receipts; never trust client balances
- [ ] Pass Payments & Entitlements Gate: store product IDs, receipt verification, entitlement ledger, restore purchase, refund support, webhook reconciliation and production billing lock
- [ ] Register the Apple Merchant ID, upload the Stripe Apple Pay certificate, deploy the reservation Edge Function, and configure payment webhooks
- [ ] Pass Gift Fulfillment Gate and connect a real gift partner for flowers/desserts/cards: server pricing, recipient consent, hidden address, payment capture, order webhooks, refunds, support SLAs and physical-device QA
- [ ] Pass Places / Reservation Provider Gate and connect live venues, hours, ratings, maps, date packages, partner inventory, reservation holds, refund policy, support operations and physical-device QA
- [ ] Convert the Events & Date Marketplace preview into live operations: venue contracts, city launch list, Indian community mixers, video speed dating, invite-only dinner capacity, check-in staffing, and refund/support SLAs
- [ ] Configure push notifications for profile views, matches, Sparks, gift tracking, safety, and support updates
- [ ] Pass Notifications & Alerts Gate: push tokens, event triggers, member preferences, deep links, quiet hours, rate limits, provider secrets and physical-device QA
- [ ] Connect privacy-consented analytics and crash reporting through the existing adapters
- [ ] Pass Observability / Privacy Gate: privacy-safe event taxonomy, consent/opt-out controls, crash provider, performance dashboards, server-side provider keys, alert owner and physical-device QA
- [ ] Configure transactional notifications and member-controlled notification settings
- [ ] Staff report review, appeals, emergency escalation, and support response procedures. App-side Trust Ops SLA gate is implemented; production still needs real reviewer accounts, support desk and notification tooling.
- [ ] Pass Abuse / Fraud Protection Gate: romance scam rules, in-chat safety nudges, block graph, paid-action velocity limits, account integrity, freeze/evidence actions, member education, provider risk checks and real-device abuse drills
- [ ] Run a security review of RLS, storage buckets, uploads, abuse limits, secrets, and account deletion

## In-app readiness dashboards

- Trust Ops → Audit includes Backend / Supabase Gate, Payments & Entitlements Gate, Notifications & Alerts Gate, Gift Fulfillment Gate, Places / Reservation Provider Gate, Observability / Privacy Gate, Abuse / Fraud Protection Gate, Trust Ops SLA, Legal/Store Ops, Product QA, Interaction QA, Dating Policy Compliance, Store Review Pack, and Store Release cards.
- Product QA should show no blockers before sharing a preview.
- Interaction QA should show no critical missing actions before external testers.
- Dating Policy Compliance should show no blockers before store submission.
- Store Review Pack should show reviewer login instructions, demo path, safety path, and production demo-OTP guard.
- Events & Date Marketplace preview should show venue search, safe-first-date filters, packages, community events, premium dinners, and partner/reservation readiness.
- Store Release will remain “final connections pending” until backend, payments, gift fulfillment, places, push, analytics and crash-monitoring providers are connected.

## Store and legal

- [ ] Enroll in Apple Developer and Google Play Console accounts
- [ ] Replace all bracketed company/contact fields in the privacy draft and obtain legal review
- [ ] Finalize the included Privacy Policy, Terms, and Community Guidelines drafts and publish them with Safety Center and support pages over HTTPS. App-side Legal/Store Ops gate now tracks this explicitly.
- [ ] Configure App Store privacy labels and Google Play Data Safety from actual production behavior. Drafts exist, but final labels must match connected backend, analytics, payments, gifts and support tools.
- [ ] Create Apple/Google subscription products for DestinyOne Plus at $19.99/month
- [ ] Capture store screenshots using consented mock profiles; do not use scraped or unlicensed faces
- [ ] Complete age rating, content-moderation, user-generated-content, and account-deletion declarations
- [ ] Verify dating-policy compliance: user content moderation, report/block, subscription disclosure, location consent, real-world date/gift safety, and delete-account flow
- [ ] Add reviewer notes and a fully functional review/demo account; never submit production with demo OTP fallback enabled

## Release commands

```bash
eas login
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Production submission remains intentionally gated on store credentials, legal URLs, real backend secrets, billing products, and physical-device QA.
