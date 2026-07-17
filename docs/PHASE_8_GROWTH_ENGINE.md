# Phase 8: Growth Engine

## Honest score

- Source controls: **10/10**
- Live growth evidence: **0/10**

Source readiness means DestinyOne can measure and govern growth without trusting
client claims. It does not mean that a live acquisition channel or retention
loop has been proven.

## North-star funnel

1. Signup started
2. Profile verified
3. Profile completed
4. Qualified introduction viewed
5. Mutual match created
6. Meaningful two-sided conversation reached
7. Date plan accepted
8. Date outcome submitted
9. Member retained at week eight

Every high-value outcome is checked against authoritative profile, discovery,
match, message, date or reflection records before it enters growth reporting.
The client cannot create a verified conversion merely by sending an event name.

## Source controls

Migrations `017_growth_engine_and_experiments.sql` and
`028_growth_operations_control_plane.sql` provide:

- analytics-consent enforcement, a strict property allowlist and member-triggered
  withdrawal that removes attribution, events and experiment assignments;
- server-verified funnel outcomes with event source and verification timestamps;
- governed campaigns so paid, creator, partnership, event, ambassador and
  referral touches must reference a matching active campaign;
- deterministic experiment assignment with capped rollout and explicit exposure;
- distinct product, data and safety approvals, expiry, a kill switch, minimum
  sample size, immutable decisions and automatic pause on safety/retention breach;
- referral risk evidence for shared device, shared payment identity and velocity,
  followed by a real coin-ledger credit only after clearance;
- idempotent referral reversal with a compensating ledger entry;
- provenance-backed city, cohort and channel snapshots covering the full funnel,
  spend, revenue and contribution margin.

## Admin Audit

The Growth Engine Gate reports source controls separately from live evidence.
The current preview correctly shows source readiness at 100% while live events,
verified conversions and active experiments remain zero.

## Automated evidence

- 28 ordered migrations
- 89 required tables and 71 required RPCs in the deployment contract
- 245 pgTAP security assertions
- 71 test files and 301 passing tests
- TypeScript and source deployment preflight pass

## Remaining live gates

- Deploy and verify the v28 backend in staging and production.
- Connect a privacy-reviewed production event pipeline and deletion workflow.
- Build city, cohort and channel dashboards with freshness and quality alerts.
- Run one controlled Toronto experiment through approval, exposure, guardrail,
  decision and rollback drills.
- Produce verified referral activation, fraud-review and reversal evidence.
- Sustain an acquisition channel with healthy eight-week retention, accepted-date
  outcomes, safety guardrails and positive contribution margin before scaling.
