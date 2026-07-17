# DestinyOne AI matching and privacy notes

DestinyOne should feel smart without becoming creepy.

## What AI matching can use

- Profile answers: intent, age range, city, vibes, family priority, children, marriage timeline, relocation.
- In-app activity: viewed profiles, interested, skipped, blocked, reported.
- Safety status: blocked/reported members must never be recommended.
- Optional approximate location only when Crossed Paths is enabled.

## What AI matching must not use

- Browser or Google search history.
- WhatsApp, iMessage, SMS, calls, contacts, email, or social apps.
- Microphone activity outside an explicit recording action.
- Photos the user did not choose.
- Exact live location trail.
- Sensitive assumptions such as caste, health, income, immigration status, or political views.

## UI rules

- Do not show percentage compatibility scores.
- Show qualitative labels only: Strong Match, Great Match, Exceptional Match.
- Explain matches with friendly reasons such as “Family-first match” or “Same relationship intent.”
- Let users reset learning and change filters.

## Red Rose rules

- Base plan includes 1 free Red Rose per day.
- Extra roses require a store-compliant in-app purchase.
- Red Rose notes should be respectful and reportable.
- Roses must not bypass block, report, or safety controls.

## Production boundary

Preview mode uses a local privacy-safe scorer for demonstration. Real-member
builds fail closed and use the server-owned v2 eligibility/ranking engine, so
clients cannot alter scores, daily limits, repeat cooldowns, safety exclusions,
or model versions. The app receives only qualitative labels and up to three
plain-language reasons.

## Observability boundary

Analytics and crash reporting should use only privacy-safe in-app events. Do not send message text, uploaded media, OTPs, contact details, exact location, delivery addresses, raw profile identifiers, or verification files. The Admin Audit screen now includes an Observability / Privacy Gate so final provider setup stays visible before release.
