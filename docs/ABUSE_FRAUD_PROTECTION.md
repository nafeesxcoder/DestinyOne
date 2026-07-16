# DestinyOne abuse and fraud protection gate

Dating apps fail when growth gets ahead of safety. DestinyOne should feel romantic and premium, but it also needs practical protection against romance scams, harassment, fake profiles, unsafe meetings and paid-action abuse.

## Core protections already represented in-app

- Romance scam rules for money, crypto, gift cards, off-app pressure, secrecy and private-location language.
- In-chat safety nudges that scan only the current in-app draft.
- Report, block and unmatch flows that remove members from discovery, likes and chat paths.
- Trust Ops queue with risk scoring, freeze/escalate/resolve actions and evidence notes.
- Paid-action guardrails for Roses, Sparks, gifts, refunds and disputes.
- Profile re-verification, trusted vouches and account integrity review.
- Safety Center education for public first dates, private reporting and keeping early conversations in-app.

## Final provider work before scale

- Device-risk or fraud provider for suspicious account creation and burst activity.
- CAPTCHA/rate-limit provider for suspicious signup/login and velocity spikes.
- Server-side block graph enforcement across Supabase, push, gifts, dates and chat.
- Physical-device abuse drills for fake profile, money scam, harassment, gift abuse and unsafe-date scenarios.

## Admin Audit gate

The in-app **Abuse / Fraud Protection Gate** checks:

1. Romance scam and unsafe-conversation rules
2. Message safety scanner
3. Report/block graph removal
4. Paid romantic-action abuse controls
5. Account integrity and re-verification
6. Fraud providers
7. Freeze/evidence/appeal workflows
8. Member safety education
9. Production abuse QA

Current app status: core anti-abuse flows are preview-ready. Final live release still needs device/CAPTCHA risk providers, backend-enforced rate limits, provider-backed audit trails and real-device abuse drills.
