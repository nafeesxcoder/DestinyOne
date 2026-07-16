# DestinyOne — Trust Ops and Safety SLA

This is the P1 operating layer that turns report/block features into a safer launch system.

## What is included now

- Trust Ops SLA readiness engine for reviewer staffing, SLA coverage, critical escalation, evidence audit, member safety actions, and appeals/support
- Admin dashboard card showing required reviewer count, fastest active SLA, high-risk cases, human-review cases, blockers, and next best step
- Queue-driven staffing logic based on moderation workload instead of a hardcoded “ready” label
- Critical-case gate for money scams, harassment, unsafe meeting signals, identity issues, and support escalation
- Evidence/audit model covering reports, chat evidence, payment/gift events, block graph, reviewer notes, and enforcement action
- Tests that block launch when reviewers/playbooks are missing
- Abuse / Fraud Protection Gate for scam rules, message safety nudges, block graph, paid-action abuse, account integrity, provider risk checks and production abuse drills

## Production connection points

- Staff reviewer accounts and roles
- Support desk integration
- Push/email notifications for safety updates
- Server-side audit trail for reports, blocks, freezes, escalations, appeals, and resolutions
- Emergency escalation handbook and reviewer training
- Legal-reviewed data retention rules for safety evidence

## Launch rule

Do not scale city growth unless Trust Ops shows a staffed pilot, sub-24h SLA coverage, clear critical escalation, evidence retention, report/block access, and support/appeal handoff.
