# Phase 5: matching intelligence

Last verified locally: 2026-07-16

## Product rule

DestinyOne optimizes for healthy mutual outcomes, not swipe volume or time in
the app. Safety and reciprocal hard preferences run before ranking. Members see
short reasons and labels, never an internal percentage score.

## Implemented in source

- Reciprocal gender, age, intent, must-have vibe, future-plan, relocation, and
  city eligibility checks.
- Block, pass, incomplete profile, missing approved photo, and existing mutual
  relationship exclusions before scoring.
- Server-owned daily deck generation with a maximum of five introductions.
- Approved profile photos are resolved through short-lived signed storage URLs.
- Versioned deterministic weights with one active model and a service-role-only
  activation/rollback function.
- Quality-first ranking with 30-day exposure count as a fairness tie-breaker.
- Plain-language recommendation reasons limited to one through three.
- Religion, community, ethnicity, caste, and gender are prohibited as ranking
  weights. Gender participates only in reciprocal eligibility.
- Coarse post-relationship feedback and existing post-date reflections affect
  ranking only after explicit member consent.
- Member learning reset deletes discovery signals, disables reflection signals,
  revokes match-feedback consent, and regenerates the daily deck.
- Server-owned discovery signals are idempotent and limited to 120 actions per
  day. Match decisions must belong to the current deck or an inbound interest.
- Service-role quality snapshots accept only numeric aggregate metrics; member,
  profile, message, and location identifiers are not accepted.

## Migration 014

`014_matching_intelligence.sql` adds:

- `profile_match_attributes` and `matching_preferences`
- `matching_model_versions` and `matching_model_events`
- `daily_match_recommendations` and hidden internal scores
- `match_feedback` with per-record learning consent
- validated preference, discovery, feedback, reset, model activation, and
  quality snapshot RPCs
- an expanded `daily_matches` RPC that returns display-safe profile fields,
  approved media paths, explanations, and model version

## Current verification

- TypeScript passes.
- 39 test files and 147 tests pass.
- The transactional pgTAP matrix contains 75 assertions, including reciprocal
  rejection, hidden-score privileges, idempotent discovery learning, explicit
  outcome consent, and learning reset.
- The Expo web export passes.
- Local pgTAP execution still requires a Docker-compatible PostgreSQL runtime.
- The configured hosted project remains behind the source migration chain, so
  this phase is not yet staging-validated or production-connected.

## Gates before the score can rise above 4/10

1. Apply migrations 001-014 to a clean development project and regenerate types.
2. Execute the pgTAP suite plus signed-media tests with real authenticated users.
3. Backfill normalized matching attributes for every pilot member.
4. Establish offline evaluation sets and minimum precision/coverage thresholds.
5. Run exposure and outcome audits across sufficiently large cohorts without
   exposing or optimizing directly on protected traits.
6. Pilot in one city and measure qualified mutuals, meaningful conversations,
   accepted dates, reports, and post-date outcomes.
7. Define automatic rollback thresholds and complete a model rollback drill.

