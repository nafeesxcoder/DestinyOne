# DestinyOne — start here

Latest clean developer handoff: 2026-08-03

Verified preview:

```text
https://emoji-gif-stickers-v9--destinyone-next-preview-shivay.netlify.app/actual-app/index.html?previewAccess=1&preview=chat&previewState=chat-emoji&v=final9
```

## Source map

| Location | Purpose | Edit it? |
| --- | --- | --- |
| `App.tsx`, `src/`, `assets/` | Original Expo/React Native app and approved UI shown in the preview | Yes — source of truth for the actual app |
| `frontend/src/` | Next.js web pages and developer-requested component structure | Yes — web migration source |
| `frontend/src/pages/preview.jsx` | Review catalog containing all main screens and deep internal states | Yes — only when adding/removing screens |
| `frontend/public/actual-app/` | Generated Expo web output embedded by Next.js | No — regenerate from the original app source |
| `backend/src/` | Node.js/Express REST and Socket.IO handoff | Yes — connect production services here |
| `backend/schema.sql` | MySQL 8 schema | Yes — apply through reviewed migrations in production |

There is no second hidden UI project in this delivery. The old duplicate work
folder, chat handoff notes, build caches, dependencies, deployment caches, and
private environment files are intentionally excluded from the clean ZIP.

## Review every app screen

After starting the Next.js frontend, open:

```text
http://localhost:3000/preview/
```

The catalog includes Splash, every onboarding/auth step, matching, profile,
chat, Romantic Gifts (including its full four-step order/quote/confirmation flow), date planning, Date Marketplace, safety, membership, Marriage Blueprint,
Relationship Journey, Family Room, readiness, and admin/audit screens. It also
provides Desktop/Mobile modes and Previous/Next navigation.

The Chat media picker now includes emotion-specific emoji animation, a
first-party romantic/funny sticker pack, exact GIF search integration,
pagination, provider attribution, and broken-media fallbacks. Live GIF results
activate when `EXPO_PUBLIC_GIPHY_API_KEY` is supplied; the credential-free
preview deliberately shows correctly-labelled first-party animated reactions.
See `docs/CHAT-MEDIA-SEARCH.md`.

API and Socket.IO documentation: `backend/API.md`  
Route/component map: `frontend/DEVELOPER-NAVIGATION-MAP.md`  
Requested feature evidence: `FEATURE-COMPLETION-MATRIX.md`

## Install and run

Requirements: Node.js 20+, pnpm 9+, and MySQL 8 for database mode.

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:backend
```

In a second terminal:

```bash
pnpm dev:frontend
```

Main app: `http://localhost:3000/`

All pages: `http://localhost:3000/preview/`

## Before production

The owner/developer must still supply production MySQL hosting and secrets,
SMS/email OTP, media storage, identity verification, payment credentials,
maps/places credentials, TURN infrastructure for restrictive call networks,
legal URLs, and operational staff workflows. Preview data and demo fallbacks
must not be represented as a live production backend.

Run the developer delivery check with:

```bash
pnpm check:conversion
```
