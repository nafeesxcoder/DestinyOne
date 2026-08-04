# DestinyOne Express/MySQL API contract

Base URL: `http://localhost:4000/api`

Authentication uses an HTTP-only `destinyone_session` cookie or
`Authorization: Bearer <token>`. JSON requests use `Content-Type:
application/json`. Preview mode runs when MySQL variables are absent; it never
claims a payment, provider notification, identity check or real member mutation
succeeded.

## Standard responses

- `200` read/update succeeded
- `201` resource created
- `202` asynchronous request accepted
- `204` no response body
- `400` validation error
- `401` missing/expired session
- `403` authenticated but not permitted
- `404` resource/route not found
- `409` lifecycle conflict
- `429` rate limited
- `500` safe generic server error

Errors use `{ "message": "Human-readable explanation" }`.

## Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account and session |
| POST | `/auth/login` | Authenticate and create session |
| GET | `/auth/me` | Current member plus `member/moderator/admin` role |
| POST | `/auth/logout` | Clear session |

## Profile, onboarding, privacy and notifications

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/profiles/me` | Current profile |
| PUT | `/profiles/me` | Update editable profile fields |
| GET | `/profiles` | Visible profile list |
| GET | `/profiles/me/settings` | Privacy, visibility, onboarding resume and notification preferences |
| PUT | `/profiles/me/settings` | Persist allowlisted settings |
| GET | `/notifications` | Latest 100 member notifications |
| GET | `/notifications/push-readiness` | Expo/Web Push provider readiness and VAPID public key |
| POST | `/notifications/devices` | Register Expo token or browser PushSubscription |
| DELETE | `/notifications/devices/:tokenHash` | Revoke one current-member device |
| PATCH | `/notifications/:notificationId/read` | Mark one notification read |
| POST | `/notifications/read-all` | Mark inbox read |

Settings fields include global/profile privacy, match/message/date/safety
notification switches, marketing consent, quiet hours and `onboardingStep`.
The Expo client also persists onboarding locally so an interrupted preview
resumes from the exact step instead of Welcome.

## Matches

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/matches` | Curated introductions and match explanation |
| POST | `/matches/:profileId/decision` | `interested`, `passed` or `spark` |
| DELETE | `/matches/:profileId` | Unmatch respectfully |

Public responses expose human reasons, never the internal numeric score.
Strict dealbreakers remain eligibility gates before ranking; Marriage Blueprint
and consented post-date signals only rank profiles after those gates pass.

## Messages and chat preferences

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/messages/:conversationId` | Conversation history |
| POST | `/messages/:conversationId` | Send idempotent typed message |
| PATCH | `/messages/:conversationId/:messageId/receipt` | Sent/delivered/read receipt |
| GET | `/messages/:conversationId/search?q=...` | Search message bodies |
| PUT | `/messages/:conversationId/:messageId/reaction` | Add/change reaction |
| PUT | `/messages/:conversationId/:messageId/star` | Star/unstar privately |
| GET | `/messages/:conversationId/starred` | Current member's starred messages |
| GET | `/messages/:conversationId/preferences/me` | Nickname/theme/alerts |
| PUT | `/messages/:conversationId/preferences/me` | Save nickname/theme/alerts |

Replies use `payload.replyToMessageId`; rich payloads live in `payload_json`.
Every route verifies conversation membership.

## Socket.IO contracts

Client to server:

- `conversation:join(conversationId, acknowledgement)`
- `conversation:leave(conversationId)`
- `typing:start({ conversationId })` / `typing:stop({ conversationId })`
- `message:read({ conversationId, messageId })`
- `call:invite|accept|reject|end|signal({ conversationId, clientCallId, ... })`

Server to client:

- `message:new(message)`
- `message:receipt({ conversationId, messageId, status, at })`
- `message:reaction({ conversationId, messageId, userId, emoji })`
- `typing:update({ conversationId, userId, typing, at })`
- `presence:update({ conversationId, userId, online, at })`
- `call:event({ event, conversationId, fromUserId, at, ... })`

One tick is stored/sent, two ticks is delivered, and blue ticks is read. Call
signals are limited to `offer`, `answer`, and `ice`, capped at 64 KiB, and
forwarded only inside an authenticated conversation room. Web media uses
`getUserMedia` + `RTCPeerConnection`; production needs HTTPS and short-lived
TURN credentials for restrictive networks.

Message and incoming-call pushes are dispatched to registered Expo or browser
devices. Production requires Expo/EAS credentials and/or a VAPID key pair.
Permanent invalid registrations are revoked automatically.

## Date Planner, lifecycle and learning

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/dates` | Member's accessible plans |
| POST | `/dates` | Create a public-first plan |
| PATCH | `/dates/:datePlanId/status` | Lifecycle transition |
| POST | `/dates/:datePlanId/feedback` | Private post-date outcome |
| GET | `/places/search` | City/category/query ranked recommendations |

Statuses: `proposed`, `countered`, `accepted`, `completed`, `declined`,
`cancelled`, `no_show`, `unresponsive`. Invalid transitions return `409`.
Post-date feedback accepts `continue`, `pause` or `close`, `feltSafe`, and an
explicit `useForMatching` consent flag. Personal notes are never public match
explanations.

The ranking contract uses profile city, distance, public-first safety,
relationship/date style, category, current query and provider freshness. Live
places, reservations, hotels and vacation stays need owner provider keys.

## Safety and account control

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/safety/reports` | Confidential safety report |
| POST | `/safety/blocks/:userId` | Silent block |
| DELETE | `/safety/blocks/:userId` | Unblock |
| POST | `/safety/account-deletion` | Queue account deletion |

No-show UI links to the existing report/block/unmatch flow. Production deletion
must run through a reviewed background job with legal retention exceptions.

## Membership and purchases

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/membership/plans` | Current plan catalog |
| GET | `/membership/status` | Entitlement/purchase status |
| POST | `/membership/checkout` | Begin checkout contract |
| POST | `/membership/verify` | Verify native receipt and write entitlement |
| POST | `/membership/restore` | Restore server-known purchase |

Preview checkout never charges. MySQL production mode prepares a server-owned
purchase session and accepts only an HMAC-protected Apple/Google verifier
result. Raw receipt tokens are not persisted, and the client may finish the
native transaction only when the response contains
`finishedTransactionAllowed: true`. Provider credentials and approved store
products are still owner-supplied.

## Launch analytics

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/analytics/sessions` | Start/reuse a consented launch session |
| POST | `/analytics/events` | Submit one idempotent allowlisted event |
| DELETE | `/analytics/consent` | Withdraw consent and delete member analytics |
| GET | `/analytics/snapshot` | Admin-only 30-day aggregate funnel |

Analytics requires the member's `anonymous_analytics` setting. Payloads allow
only the documented scalar dimensions; names, contact details, message/profile
content, locations and transaction data are not accepted.

## Admin moderation and permissions

Requires `moderator` or `admin` role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/permissions` | Effective role permissions |
| GET | `/admin/moderation` | Open review queue |
| PATCH | `/admin/moderation/:caseId` | Review/resolve/dismiss with audit event |

In local preview only, send `x-preview-role: moderator` or
`x-preview-role: admin` to exercise protected routes. Never enable this header
shortcut in a production gateway.

## Verification

```bash
pnpm --filter destinyone-backend check
pnpm --filter destinyone-frontend test:routes
pnpm typecheck
pnpm test
pnpm --filter destinyone-frontend build
```
