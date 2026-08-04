# DestinyOne navigation and inside-page map

The top-level files in `src/pages/` are route entry points. Cards, sheets,
forms and interactive panels inside those pages live in `src/components/`.
They are not missing pages.

## Profile flow

| Profile action | Next.js route | Main component |
| --- | --- | --- |
| Profile overview | `/profile` | `components/profile/ProfileSummary.jsx` |
| Account settings | `/profile/settings` | `components/profile/ProfileSettingsExperience.jsx` |
| Edit profile | `/onboarding` | `components/auth/AuthForm.jsx` and onboarding page UI |
| Preferences | `/discovery` | discovery page state and filters |
| Trust Hub | `/verification` | verification page |
| Safety and privacy | `/safety` | `components/safety/SafetyReportForm.jsx` and safety UI |
| Membership | `/membership` | membership page |
| Relationship Coach | `/coach` | coach page |
| Dates and Events | `/dates` | `components/dates/DateMarketplace.jsx` and `DatePlanner.jsx` |
| Executive Circle | `/executive` | `components/common/ExecutiveOverview.jsx` |
| Help and appeals | `/support` | support page |

## Other important inside flows

- Match card → `/match/[id]`
- Mutual match → `/mutual`
- Icebreaker → `/icebreaker`
- Conversation → `/messages`
- Romantic Gift Marketplace → `/gifts` (interactive production-parity state: `preview=gifts`; also a primary bottom-navigation tab and a highlighted Chat toolbar action)
- Date marketplace and planner → `/dates`
- Marriage Blueprint → `/blueprint`
- Relationship milestones and Family Room → `/journey`
- Verified city density → `/community`
- Post-date matching feedback → `/readiness`
- Notifications → `/notifications`
- Admin readiness → `/admin`

## Deep preview states

The catalog at `/preview/` also exposes the original app's internal sheets:
chat search, coach, attachments, emoji, the compact gift sheet, games, snaps, calls,
nickname/theme settings, safety, Relationship Path, accepted/cancelled/no-show/
unresponsive date states, Profile settings/referral, and Safety confirmations.

The `chat-emoji` state exposes Emoji, GIF and Stickers tabs. Exact provider
search lives in the root Expo app (`src/services/gifSearch.ts`); the Next.js
route embeds the generated actual app and must not duplicate this logic.

Each catalog entry builds a preview-only URL:

```text
/actual-app/index.html?previewAccess=1&preview=<screen>&previewState=<inside-state>
```

The visible four-step gift flow is available directly at:

```text
/actual-app/index.html?previewAccess=1&preview=gifts
```

Its browser never calls or redirects to a fulfillment provider. The client
calls DestinyOne's gift BFF; that server owns recipient consent, private address
collection, payment authorization, provider adapters, webhooks and refunds.
The four-step UI includes the versioned live quote, complete fee breakdown,
private-route refresh note, sender/recipient confirmation center and email
adapter contract. See `docs/GIFT_FULFILLMENT.md` for the exact handoff.

## Original approved UI

The repository-root `App.tsx` remains the visual source of truth. It contains
the native screen transitions and modal flows for Profile settings, Chat
settings, calls, attachments, gifts, Relationship Path, Safety tools and other
inside states. The public preview catalog exposes those states directly with
`previewState` query parameters so a reviewer does not need to discover them
manually.

## Backend handoff

Interactive preview state works without production credentials. Real account
persistence, identity providers, calls, location, payments and notifications
must be connected through the top-level Express/MySQL `backend/` and provider
credentials. UI code must not silently claim those external services succeeded.

Complete REST and Socket.IO contracts are in `backend/API.md`. The automated
navigation check is `pnpm --filter destinyone-frontend test:routes`.
