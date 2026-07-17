# DestinyOne production scorecard

Last baseline: 2026-07-16 (Phase 10 controlled-pilot gate added)

This is the source of truth for the journey from a polished prototype to a
production dating business. A score describes verified capability, not the
number of screens or the amount of code. A category reaches 10/10 only when
every gate in that category has current evidence.

## Baseline

| Area | Baseline | What the evidence says now |
|---|---:|---|
| UI / brand | 8/10 | Strong premium visual system and broad screen coverage; full responsive, accessibility, and physical-device QA are not complete. |
| Product differentiation | 6/10 | Serious South Asian positioning, alignment questions, Trusted Circle, Executive Circle, dates, and safety are represented; the promise is still too broad and has not been validated with target members. |
| Feature focus | 5/10 | A tested five-tab information architecture now separates the Matches -> Chat -> Dates core loop from supporting tools in Discover and delight features inside Chat; production flags, funnel data, and target-member validation are pending. |
| Real backend | 3/10 | Runtime config fails closed; member bootstrap plus server-owned profile/chat mutations and block/media trust boundaries are implemented; the CLI/config and pgTAP matrix are repeatable; hosted Auth providers are configured. The hosted schema is behind migrations, and linked deployment, generated types, executed RLS tests, backups, alerts, and device smoke tests are pending. |
| Matching intelligence | 4/10 | Server-side reciprocal eligibility, explainable versioned ranking, consented outcome learning, exposure-aware ordering, rollback controls, and automated contracts are source-ready. Hosted deployment, executed RLS tests, calibration, cohort fairness audits, and real outcome evidence remain pending. |
| Trust and safety operations | Source 10/10 · live 4/10 | Private cases, immutable events, bounded enforcement, qualified review, member appeals and readiness gates are source-ready; real identity/liveness, staffed SLA evidence, legal approval and incident drills remain live launch gates. |
| City user density | Source 10/10 · live 0/10 | Provenance-backed weekly metrics, small-cohort suppression, seven liquidity gates, server-enforced city access, dual-approved expansion and rollback are source-ready. Hosted metrics and verified live Toronto supply remain absent, so no pilot liquidity is claimed. |
| Marketplace operations | Source 10/10 · live 3/10 | Compliant-partner activation, provider-sync provenance, atomic capacity holds, immutable server pricing, participant consent, signed amount-checked webhooks, server-calculated refunds, post-match financial access, reconciliation cases, client adapters and readiness scoring are source-ready. Live inventory, contracts, payments, staffed support, deployed migrations and pilot evidence remain pending. |
| Growth engine | 3/10 | A consent-gated nine-stage funnel, privacy-safe attribution, deterministic guarded experiments, verified-activation referral rewards, immutable reward ledger, cohort contracts, client adapter and honest Admin Audit are source-functional. Live event delivery, dashboards, deployed schema, experiment evidence and a repeatable acquisition channel remain pending. |
| Monetization readiness | 4/10 | Store-compliant product rails, purchase-session binding, signed idempotent webhooks, hashed receipts, immutable entitlements, restore, grace/retry states, refunds/chargebacks, unit economics and an atomic daily-free/paid Golden Spark send are source-functional. Live Apple/Google/processor accounts, tax setup, executed sandbox transactions and reconciled finance evidence remain pending. |

## Scoring rules

- **0-2:** concept, mock, or foundation only.
- **3-4:** functional local implementation with partial automated coverage.
- **5-6:** end-to-end staging capability with realistic data and internal QA.
- **7-8:** production-connected capability with security and device validation.
- **9:** controlled real-world pilot meets its service and quality targets.
- **10:** sustained production evidence meets every gate below with no critical
  open issue. A passing build alone never proves 10/10.

## 10/10 gates

### UI / brand

- All release-critical journeys are visually reviewed at phone, large phone,
  tablet, desktop, and wide desktop sizes.
- No clipped controls, hidden primary actions, broken scrolling, dead buttons,
  overlapping content, or unreadable loading/error/empty states.
- VoiceOver, TalkBack, keyboard navigation, dynamic text, contrast, reduced
  motion, slow network, and offline states pass the release checklist.
- Reusable screen and feature components replace the current single-file app
  concentration without changing behavior.
- Real-device usability sessions with target members meet the agreed task
  completion and satisfaction targets.

### Product differentiation

- One primary promise is consistent across onboarding, discovery, chat, dates,
  pricing, store listing, and growth campaigns.
- Target-member interviews validate the problem, trust proposition, and reason
  to switch from existing products.
- At least one controlled city pilot proves that verified, marriage-minded
  introductions convert to mutually accepted real dates.
- Competitive review is refreshed before each major positioning decision.

### Feature focus

- The primary funnel is measurable: verified profile -> qualified introduction
  -> mutual interest -> meaningful conversation -> accepted date -> feedback.
- Every main navigation item supports the primary funnel or a measured business
  need; secondary experiments are feature-flagged.
- No mock-only action appears as a live promise in production.
- Onboarding completion, time to first qualified introduction, conversation
  quality, date acceptance, and safety outcomes meet launch targets.

### Real backend

- Separate development, staging, and production Supabase projects are managed
  with repeatable migrations and generated types.
- Phone/email auth, private media, profiles, preferences, likes, matches,
  messages, notifications, reports, blocks, deletion, and admin workflows work
  end to end on physical iOS and Android devices.
- RLS and storage policies pass positive and negative integration tests,
  including blocked-member and non-match access attempts.
- Privileged mutations run server-side with idempotency, rate limits, audit
  logs, secret isolation, backups, restore drill, monitoring, and alert owner.
- Production builds cannot use demo OTP, demo purchases, or local-only balances.

### Matching intelligence

- Candidate generation and ranking run server-side with hard preference and
  safety filters before scoring.
- Ranking uses consented first-party signals and explains recommendations
  without exposing sensitive scores.
- Post-introduction and post-date feedback closes the learning loop.
- Offline evaluation, online experiments, cold-start behavior, diversity,
  fairness, abuse resistance, and model rollback are documented and monitored.
- Success is measured by healthy mutual outcomes, not swipes or time spent.

### Trust and safety operations

- Selfie liveness and identity checks produce backend-controlled badges with
  re-verification and fraud review.
- Report, block, unmatch, evidence preservation, appeals, emergency escalation,
  account deletion, and law-enforcement request procedures are operational.
- Staffed queues meet published severity-based SLAs with quality audits and
  least-privilege reviewer access.
- Romance-scam, harassment, impersonation, underage, payment, and offline-date
  incident drills pass before scale.
- Safety controls remain available without a paid subscription.

### City user density

- A launch city has balanced, verified supply across target age, intent, gender,
  distance, and key preference cohorts.
- Cohort-level liquidity is measured as eligible candidates and qualified
  introductions per active member, not as a vanity waitlist count.
- Match, reply, meaningful-conversation, accepted-date, retention, and safety
  rates meet thresholds for at least eight consecutive weeks.
- Waitlist throttling, referrals, ambassadors, events, and city expansion are
  controlled by a live density dashboard.

### Marketplace operations

- Live venue/provider data includes licensing, photos, availability, distance,
  price, accessibility, safety, cancellation terms, and source freshness.
- Search, recommendation, hold, payment, confirmation, modification,
  cancellation, refund, no-show, and support flows work end to end.
- Recipient consent and location privacy are enforced for shared plans and
  physical fulfillment.
- Partners have contracts, inventory ownership, webhook reconciliation,
  incident SLAs, and city coverage reporting.
- Booking success, cancellation, refund, support, fraud, and contribution
  margin targets are sustained in the pilot.

### Growth engine

- Privacy-consented analytics has a versioned event taxonomy, identity rules,
  data-quality monitoring, dashboards, and deletion support.
- Acquisition source -> verification -> activation -> accepted date -> retained
  member is measurable by city and cohort.
- Referral and ambassador rewards are server verified and abuse resistant.
- A documented experiment system controls hypotheses, guardrails, sample size,
  rollout, rollback, and decision logs.
- At least one repeatable channel shows healthy retention and sustainable
  payback rather than installs alone.

### Monetization readiness

- Apple/Google subscriptions and digital currency use compliant store billing;
  eligible real-world commerce uses server-side payment flows.
- Server-verified receipts, immutable entitlement ledger, restore purchase,
  webhook reconciliation, grace periods, refunds, chargebacks, taxes, support,
  and fraud controls pass production tests.
- Free members retain safety, reporting, blocking, and a viable core dating
  experience.
- Pricing experiments measure conversion, retention, outcome quality, refunds,
  and harm guardrails.
- LTV, CAC, gross margin, support cost, and city contribution margin are proven
  before aggressive scaling.

## Current automated evidence

- TypeScript: passing on 2026-07-16.
- Domain/service tests: rerun through the full release gate after each phase; the Phase 10 controlled-pilot contract keeps hosted, device, staffing, city-liquidity, provider, monitoring, legal and rollback evidence separate from source readiness.
- Expo web export: passing on 2026-07-16.
- These checks prove source health only. They do not prove production providers,
  real-device behavior, operational staffing, city liquidity, or unit economics.

## North-star and guardrails

**North-star:** percentage of verified weekly-active members who reach a
mutually accepted real date within 30 days.

Guardrails: serious-intent confirmation, report/block rate, harmful-message
rate, no-show rate, member satisfaction, balanced cohort liquidity, and
post-date safety feedback.
