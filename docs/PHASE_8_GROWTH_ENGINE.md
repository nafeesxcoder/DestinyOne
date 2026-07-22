# Phase 8: growth engine

## Outcome

DestinyOne now has a production-oriented growth control model instead of only
promotional UI and local retention ideas.

The measurable funnel is:

1. signup started
2. profile verified
3. profile completed
4. qualified introduction viewed
5. mutual match created
6. meaningful conversation reached
7. date plan accepted
8. date outcome submitted
9. member retained at week eight

Events are off by default. The client analytics adapter and database RPC both
require explicit analytics consent, and only non-identifying allowlisted
properties are accepted. Names, contact details, message content, profile or
match IDs, photos, addresses and precise coordinates are rejected.

## Migration 017

`017_growth_engine_and_experiments.sql` adds:

- private attribution touches and consented funnel events;
- a controlled experiment registry with stable assignments and mandatory
  report/block guardrails;
- referral conversion states that separate joining, verification, activation,
  fraud review, eligibility and reward;
- an idempotent reward ledger;
- service-only city/cohort acquisition, accepted-date, retention, safety and
  spend snapshots.

Referral rewards are not granted for an install or signup. The service-only
processor requires a distinct member, verified profile, completed onboarding,
a mutual match as the activation signal, fraud clearance and a unique ledger
entry.

## Admin Audit

The Growth Engine Gate shows funnel mapping, live event count, active
experiments, verified conversions and the exact missing production connections.
The current build correctly reports `Source model only · 0%`: there is no live
analytics provider, production event stream, cohort dashboard or verified
conversion evidence yet.

## Evidence

- 17 contiguous migrations
- 112 pgTAP contracts
- consent-bound telemetry tests
- deterministic experiment, attribution, reward and source-only honesty tests
- deployment verifier coverage for all growth tables and member RPCs

## Remaining production gates

- Deploy migration 017 and generate database types from the linked project.
- Connect a privacy-reviewed analytics provider and verify opt-out/deletion.
- Create city/cohort dashboards and data-quality alerts.
- Run experiments only after sample-size, safety, retention and rollback review.
- Prove a repeatable acquisition channel with healthy eight-week retention and
  contribution margin before increasing spend.
