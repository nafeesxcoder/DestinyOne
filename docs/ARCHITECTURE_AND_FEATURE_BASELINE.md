# DestinyOne architecture and feature baseline

Last inspected: 2026-07-15

## Current architecture

| Layer | Current implementation | Production concern |
|---|---|---|
| App shell and screens | React Native/Expo web app concentrated in `App.tsx` (more than 5,000 lines) | High change risk; extract by feature during the relevant phase, not as an unrelated rewrite. |
| Shared UI | `src/components.tsx` and `src/theme.ts` | Component coverage is small relative to the app shell. |
| Domain rules | Tested modules under `src/domain/` | Many modules calculate readiness from supplied booleans; they do not verify external systems. |
| Local state | AsyncStorage and local in-memory/demo repositories | Useful for preview; not authoritative for identity, balances, moderation, or commerce. |
| Backend adapter | Supabase client and service functions under `src/lib/` and `src/services/` | Production providers, environments, integration tests, monitoring, and operational ownership remain pending. |
| Database | Fourteen SQL migrations, pinned Supabase CLI/config, and a transactional pgTAP RLS matrix | Hosted project is behind the migration chain; use a clean development project or reviewed baseline before applying. |
| Privileged actions | Edge Function stubs for gifts, date reservations, and private date reminders | Need deployment, secrets, provider APIs, idempotency, webhooks, reconciliation, and alerts. |
| Payments | Demo-safe payment boundary and Stripe/store plans | Digital purchases require store billing and server receipt verification. |
| Hosting | Expo static export and Sites project configuration | Public preview is not evidence of production mobile readiness. |

## Screen inventory

The app shell declares 27 screen states:

- Entry/onboarding: splash, welcome, auth, OTP, verification, profile setup,
  vibes, intent, and alignment.
- Core dating: home, Discover hub, discovery/filters, match detail, mutual match,
  icebreaker, likes, chat, and profile.
- Relationship/date value: date planner, events/date marketplace, gifts inside
  chat, AI coach, Trusted Circle, and Executive Circle.
- Business/safety: pricing, support, safety, verification hub, and admin audit.

## Working foundations

- Premium brand assets and red-velvet theme.
- Serious-intent onboarding and life-alignment data.
- Mock daily matching, interaction decisions, mutual match, icebreaker, and rich
  chat behavior.
- Trusted Circle and Executive Circle surfaces.
- Date marketplace, events, venue suggestions, and date-planning concepts.
- Safety, moderation, abuse/fraud, legal/store, growth, monetization, and launch
  readiness models with automated domain tests.
- Supabase-shaped profiles, preferences, media, matches, messaging, safety,
  commerce, notifications, and reservation foundations.

## Current information architecture

- Five persistent destinations: Matches, Discover, Chat, Dates, and Profile.
- Matches is reserved for qualified introductions and interaction decisions.
- Discover contains Executive Circle, likes, filters, coach, Trusted Circle,
  and verification tools.
- Dates contains date planning and marketplace/event discovery.
- Gifts, GIFs, and games remain contextual Chat attachments rather than
  top-level product promises.

## Known production gaps

- Real user acquisition and city liquidity do not exist yet.
- Demo/local state remains part of the main preview flow.
- Verification badges are not backed by a live identity/liveness operation.
- Marketplace listings and bookings are not connected to live inventory.
- Calls, rich uploads, notifications, gifts, payments, refunds, and subscription
  entitlements are not all production end to end.
- Trust and safety has product surfaces but no demonstrated staffed operation.
- Analytics adapters do not yet prove live event quality, attribution, or cohort
  outcomes.
- Accessibility and responsive behavior have not been comprehensively verified
  across physical devices and assistive technologies.
- Legal drafts require company details, publication, and qualified review.

## Phase order and dependency rule

1. Establish this baseline and keep the scorecard honest.
2. Fix core UI and responsive journeys before collecting pilot feedback.
3. Narrow the product promise and instrument the primary funnel.
4. Connect production backend and environments before trusting real member data.
5. Add server-side matching and outcome feedback.
6. Operationalize verification, moderation, privacy, and safety before growth.
7. Prove liquidity in one city before expanding coverage.
8. Connect live marketplace supply and operations after the core dating loop works.
9. Scale measured acquisition and retention loops.
10. Turn on compliant monetization only after server entitlements and support work.
11. Pass security, performance, accessibility, store, device, and launch gates.

No later phase may be called complete while an earlier dependency required for
member safety, data integrity, or payment integrity is still simulated.
