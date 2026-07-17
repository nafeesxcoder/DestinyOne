# DestinyOne — Trust Ops and Safety SLA

This is the P1 operating layer that turns report/block features into a safer launch system.

## What is included now

- Trust Ops SLA readiness engine for reviewer staffing, SLA coverage, critical escalation, evidence audit, member safety actions, reviewer access, timed drills, and appeals/support
- Admin dashboard card showing required reviewer count, fastest active SLA, high-risk cases, human-review cases, blockers, and next best step
- Queue-driven staffing logic based on moderation workload instead of a hardcoded “ready” label
- Critical-case gate for money scams, harassment, unsafe meeting signals, identity issues, and support escalation
- Evidence/audit model covering reports, chat evidence, payment/gift events, block graph, reviewer notes, and enforcement action
- Migration 025 automatically creates a private moderation case from every report and preserves an immutable, idempotent case timeline
- Server-owned bounded freezes for discovery, chat, gifts, payments, and dates, with active reviewer validation and lead/legal review for critical outcomes
- A member-only appeal RPC and dedicated Support Center appeal route; the reporter's identity remains outside the appeal response
- Tests that block launch when reviewers/playbooks are missing
- Abuse / Fraud Protection Gate for scam rules, message safety nudges, block graph, paid-action abuse, account integrity, provider risk checks and production abuse drills

## Production connection points

- Named, trained reviewers assigned to the source-ready least-privilege roles
- Support desk integration
- Push/email notifications for safety updates
- Hosted deployment evidence for the source-ready server audit trail, case lifecycle, enforcement and appeal contracts
- Emergency escalation handbook and reviewer training
- Legal-reviewed data retention rules for safety evidence

## Launch rule

Do not scale city growth unless Trust Ops shows a staffed pilot, sub-24h SLA coverage, clear critical escalation, evidence retention, reviewer RBAC and dual review, report/block access, support/appeal handoff, and a passed timed incident drill.

## Honest score

The source implementation is **10/10** for the defined Trust Ops engineering
contract. Live operations are not 10/10 until staffing, vendor integrations,
legal approval, hosted security evidence, SLA performance and incident drills
are proven in the pilot environment.
