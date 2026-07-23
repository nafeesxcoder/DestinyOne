# Phase 6: city density and location intelligence

Last verified locally: 2026-07-16

## Product rule

DestinyOne opens discovery city by city. A waitlist is acquisition inventory,
not proof that a dating market works. Expansion requires balanced verified
supply, reciprocal candidate liquidity, healthy relationship outcomes,
retention, and safety for eight consecutive weeks.

## Implemented in source

- Five controlled launch markets: NYC, Bay Area, Dallas, Toronto, and Chicago.
- Alias-based metro resolution without collecting precise coordinates for city
  filters.
- A member-facing city availability panel in Discovery that explains founding
  communities and the separate opt-in boundary for Crossed Paths.
- A city density domain model with seven gates:
  verified active supply, cohort balance, reciprocal candidate liquidity,
  reply/conversation/date outcomes, eight-week retention, offline safety, and
  eight-week durability.
- An Admin Audit card that remains at `Source model only · 0%` until live
  warehouse metrics are connected. Seed data or static lists cannot turn the
  gate green.
- Secure backend adapters for waitlist join, referral creation, and ambassador
  application.
- A provenance-backed weekly metric ingestion contract with recent-Monday
  windows, explicit consent-policy version, source-job identity, idempotency,
  payload allowlisting, and automatic privacy suppression below 20 members.
- A server-only expansion evaluator that requires fresh measurements and eight
  exact consecutive healthy weeks instead of a client-supplied streak.
- Dual-approved city state changes with two distinct active reviewers, required
  Safety lead approval, sequential promotion, immutable evidence, and rollback.
- Matching eligibility now enforces the city launch state. Controlled and
  healthy pilots serve only activated waitlist members in the same metro;
  waitlist-only markets cannot leak into production discovery.

## Migration 015

`015_city_density_and_waitlist.sql` adds:

- controlled `city_launch_markets` state
- private `city_waitlist_entries`, `city_referral_invites`, and
  `city_ambassador_applications`
- service-only weekly `city_liquidity_snapshots` and
  `city_cohort_snapshots`
- validated authenticated RPCs for waitlist, referrals, and ambassador intake
- one waitlist row per member/market, a 20-referral monthly limit, self-referral
  protection, verification-required ambassador applications, RLS, and explicit
  privilege revocation

## Migration 026

`026_city_density_control_plane.sql` adds private metric runs, city operations
reviewers and immutable expansion decisions. Service-only RPCs record weekly
metrics, evaluate expansion evidence and apply or roll back discovery state.
Small cohorts are zeroed and marked suppressed before storage, and launch-state
enforcement is composed directly into server matching eligibility.

## Pilot thresholds

| Gate | Minimum |
|---|---:|
| Verified active members | 180–250 by market |
| Smallest reciprocal cohort | 20% of target |
| Median eligible candidates | 15 per active member |
| Qualified introductions | 3 per active member/week |
| Reply rate | 45% |
| Meaningful conversation rate | 25% |
| Accepted date rate | 8% |
| Eight-week retention | 35% |
| Substantiated safety incidents | no more than 1.5 per 100 accepted dates |
| Healthy duration | 8 consecutive weeks |

## Verification

- City density and backend security unit contracts pass.
- The deployment preflight requires migration 015 and all city RPC contracts.
- The hosted verifier now probes six city tables and three RPCs and fails on
  missing objects or anonymous exposure.
- The complete pgTAP matrix contains 199 assertions, including service-only
  metric provenance, reviewer identity, decision evidence and expansion RPCs.
- TypeScript and the Expo web export must pass before publishing.
- Local pgTAP execution still requires a Docker-compatible PostgreSQL runtime.

## Weekly operational refresh

`refresh-city-density` is a server-only Edge Function for the weekly city
measurement. It requires the `CITY_DENSITY_CRON_SECRET` header and uses the
Supabase service key inside the function; neither is ever exposed to members.
It records only city-level aggregates through `record_city_density_week`.

The first version measures verified active members, mutual-match reply quality,
meaningful two-way conversations, accepted dates, safety events, waitlist and
approved ambassadors. Reciprocal preference cohorts, eligibility medians,
eight-week retention and event capacity deliberately remain zero until their
consented data sources are connected. A missing metric is a failed gate, never
an assumed pass.

Schedule it once each Monday with the current `CITY_DENSITY_CRON_SECRET`, then
review the resulting evidence before any dual-approved market-state change.

## What is intentionally not claimed

No city has verified live density yet. Hosted migration deployment, consented
analytics ingestion, real waitlist acquisition, ambassador vetting, event
operations, and eight weeks of pilot evidence are still required. This source
phase raises operational readiness, not real-world liquidity.

The defined source control plane is **10/10**. Live city density remains
**0/10** until hosted ingestion, balanced verified Toronto supply and eight
consecutive weeks of healthy outcome evidence exist.

## Toronto controlled-pilot sequence

1. Deploy migrations to development and staging, run pgTAP, and regenerate
   database types.
2. Enroll Toronto, Brampton, Mississauga, Markham, and Vaughan members through
   the consented waitlist.
3. Balance reciprocal age, intent, gender, distance, and future-plan cohorts;
   suppress small operational cohorts from dashboards.
4. Invite a limited weekly deck only when every active member has useful
   reciprocal supply.
5. Run verified community events and attribute activation without exposing
   member identity in aggregate analytics.
6. Review relationship and safety metrics weekly; pause invites automatically
   when any hard gate fails.
7. Hold every gate for eight weeks before considering Hamilton/Niagara or a
   second launch market.
