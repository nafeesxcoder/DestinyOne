# DestinyOne developer delivery

Delivery date: 2026-08-03

This package contains the latest working DestinyOne source and preserves the
original Expo/React Native user interface used by the public preview.

## Project layout

- `frontend/` — Next.js web delivery with the requested pages, reusable
  components, services, hooks, utilities, styles, images, and icons.
- `backend/` — Node.js + Express.js API handoff with MySQL schema, REST routes,
  Socket.IO chat events, validation, and tests.
- `backend/API.md` — REST, Socket.IO, permission and lifecycle contracts.
- `docs/REALTIME-PUSH-CALLS.md` — exact chat, push, WebRTC, TURN and deployment setup.
- `docs/BILLING-AND-LAUNCH-ANALYTICS.md` — native store verification,
  receipt/entitlement security, analytics consent, event taxonomy and manual provider setup.
- `docs/GIFT_FULFILLMENT.md` — versioned quote/fee calculation, recipient-private
  acceptance, fulfillment adapter and sender/recipient confirmation contracts.
- `docs/CHAT-MEDIA-SEARCH.md` — emotion-aware emoji animation, first-party
  sticker payloads, GIPHY search/pagination contract and launch configuration.
- `FEATURE-COMPLETION-MATRIX.md` — requested feature-to-code evidence and
  external-provider boundaries.
- `App.tsx`, `src/`, `assets/`, and Expo configuration — editable source for
  the original DestinyOne application shown inside the web preview.
- `frontend/public/actual-app/` — the latest compiled Expo web preview consumed
  by the Next.js home route.
- `frontend/src/pages/preview.jsx` — searchable review catalog for every actual
  app screen from splash/onboarding through member tools and admin readiness.
- `database/` and `backend/schema.sql` — MySQL setup and schema.
- `docs/WEB_CONVERSION_DELIVERY.md` — detailed conversion and manual launch
  handoff.

The requested home components are in `frontend/src/components/home/`:

- `HeroSection.jsx`
- `SearchForm.jsx`
- `StatsSection.jsx`
- `SuccessStories.jsx`
- `PremiumPlans.jsx`
- `Testimonials.jsx`

## Local setup

Requirements: Node.js 20+, pnpm 9+, and MySQL 8 when enabling the real API.

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:backend
```

In a second terminal:

```bash
pnpm dev:frontend
```

Open `http://localhost:3000`.

Open `http://localhost:3000/preview/` to review all actual-app screens from one
catalog without changing the approved application UI.

The frontend runs with preview data when production credentials are absent.
To enable MySQL, import `backend/schema.sql`, configure `backend/.env`, and use
a strong private `JWT_SECRET`. Production SMS/email OTP, media storage,
identity verification, payments, Expo/VAPID credentials, TURN infrastructure, and provider keys must
be supplied by the project owner/developer and are not included in this ZIP.

Digital billing now has Apple/Google product mappings, native checkout/restore,
server receipt verification and hashed audit records. Launch analytics now has
an offline queue, strict property allowlist, server consent enforcement and an
aggregate admin snapshot. Both remain fail-closed until production secrets and
provider approvals are supplied; the approved UI was not redesigned.

The Romantic Gifts flow is a primary destination and a highlighted Chat
action. Its four-step preview calculates an itemized live estimate, ETA,
delivery/rush/small-order/service/tax fees, creates an in-app order timeline,
and exposes sender/recipient in-app plus email confirmation contracts. Live
courier, payment and transactional-email calls remain developer-supplied
server adapters; preview mode never claims those external calls succeeded.

Chat media is updated in the original Expo source. Laugh, cry, love, kiss,
anger, party, surprise and sleep messages have distinct motion; the sticker
pack is first-party and works offline; GIF search is wired to GIPHY with safe
rating, pagination, attribution and media-error fallback. Set
`EXPO_PUBLIC_GIPHY_API_KEY` in the build environment for live exact results.
The preview never relabels an unrelated remote GIF as a requested reaction.

## Verification

```bash
pnpm check:conversion
```

The source package intentionally excludes `node_modules`, build caches,
temporary deployment folders, local environment files, and Git history.
