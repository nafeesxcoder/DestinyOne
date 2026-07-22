# Phase 2 Product Differentiation and Feature Focus

Date: 2026-07-15

## Strategic position

DestinyOne is not a swipe app with matrimony filters and it is not a traditional profile directory. Its distinct product promise is a guided path from serious intent to a safe, real relationship for South Asians in the USA and Canada.

The core loop is:

1. Express future intent and important life alignment.
2. Receive a small set of curated, explainable matches.
3. Unlock chat through mutual interest and a shared icebreaker.
4. Plan a public, low-pressure date inside DestinyOne.
5. Reflect privately so future recommendations improve.
6. Invite a Trusted Circle only when the relationship is ready.

## Current competitor signals

- Shaadi emphasizes deep partner preferences, two-way matching, profile search, verified details, direct contact, and paid visibility.
- Dil Mil emphasizes South Asian discovery, community chat, worldwide matching, unlimited likes, and success stories.
- Hinge emphasizes rich prompts, comments on profile content, conversation starters, private post-date feedback, and getting members to meaningful in-person dates.

Primary product references reviewed:

- https://www.shaadi.com/info/customer-relations/faq/match-making
- https://www.shaadi.com/info/introduction/membership-plans
- https://dilmil.co/
- https://help.hinge.co/hc/en-us/articles/26845979318803-What-is-Hinge
- https://help.hinge.co/hc/en-us/articles/360010692913-Worum-geht-es-in-Wir-haben-uns-getroffen
- https://help.hinge.co/hc/en-us/articles/38720312015123-What-is-Match-Note

## Feature hierarchy

### Tier 1: Core promise

- Identity, selfie and trust verification.
- Future alignment and serious relationship intent.
- Curated daily matches with understandable reasons.
- Mutual icebreaker and private, reliable chat.
- Relationship Path, safe date planning and private reflection.
- Reporting, blocking, check-ins and member support.

### Tier 2: Differentiating support

- Date Marketplace and reservations.
- Trusted Circle and character vouches.
- Privacy-safe relationship coach.
- Executive Circle for a separately operated premium segment.

### Tier 3: Delight, not navigation

- Gifts, GIFs, games, snaps, face stickers and themes.
- These remain behind Chat attachments or secondary surfaces. They must never compete with matching, conversation, safety or date planning.

## First implementation batch

- Added a testable Relationship Path domain model with five sequential stages.
- Added a Chat entry point that keeps the journey visible without adding another bottom-navigation tab.
- Connected the path to the existing Date Marketplace and Trusted Circle.
- Added a private post-date reflection state with continue, pause and close choices.
- Explicitly avoids public compatibility percentages; progress represents completed mutual steps only.
- Added five domain tests covering stage order, proposal gating, completion, progress and Trusted Circle gating.

## Second implementation batch

- Replaced the optimistic proposal shortcut with an explicit `proposed → accepted/countered/declined → completed → reflected` state machine.
- Persisted per-match reflection state in local app storage so mock journeys survive reloads.
- Added production adapters for proposal response, date completion, reflection save and relationship-journey hydration.
- Added migration `008_relationship_journey.sql` with participant validation, recipient-only proposal responses and member-only reflection RLS.
- Kept reflection locked until an accepted date has actually been marked completed.
- Connected `close` reflection to the existing private report, unmatch and block options instead of silently removing a member.
- Kept backend failures from falsely advancing local production state.

## Third implementation batch

- Added explicit, off-by-default consent before a private reflection can influence future matching.
- Reduced matching feedback to a coarse positive, neutral or negative signal; partner IDs, messages and private details never enter the learning table.
- Made consent revocable and kept the reflection useful even when matching consent stays off.
- Added an accepted-date reminder toggle that schedules a recipient-private reminder without partner-name or message preview copy.
- Added migration `009_relationship_learning_reminders.sql`, a cron-protected reminder worker and a service-role-only due-reminder processor.
- Added an off-by-default anonymous analytics control plus a five-event Relationship Path taxonomy with an allowlist for non-identifying properties only.
- Added four domain tests for consent gating, signal mapping, reminder eligibility and analytics redaction. The suite now covers 111 tests across 29 files.

## Success metrics

- Profile completion to first meaningful match.
- Match to first substantive reply, not raw messages sent.
- Conversation to mutually accepted public date plan.
- Safe check-in completion rate.
- Private reflection completion and second-date intent.
- Report/block rate by acquisition source and match cohort.
- Relationship Path completion without pressure or safety incidents.

## Remaining gates

- Apply migration 008 to the linked production Supabase project and regenerate linked types.
- Apply migration 009, deploy the reminder worker, configure its cron secret and connect the final push provider.
- Calibrate how coarse consented learning signals affect ranking; the current contract deliberately does not change live ranking weights yet.
- Validate respectful close/unmatch copy and safety escalation paths with target members and safety reviewers.
- Validate the journey with target-user research in initial launch cities.
- A/B test whether the path improves date quality without creating pressure.

Phase 2 is not 10/10 until the live backend, consent model, target-user research and cohort metrics validate the product promise.
