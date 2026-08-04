# DestinyOne Web Platform

Production-shaped web conversion using Next.js, React, Node.js, Express.js, Socket.IO, and MySQL 8.

## Structure

- `frontend/` — Next.js pages, components, hooks, services, utilities, styles, and public assets
- `backend/` — Node.js/Express REST API, authenticated sessions, Socket.IO presence/typing/read receipts/call signaling, and MySQL access
- `database/` — database setup notes; canonical schema is `backend/schema.sql`

## Local setup

Requirements: Node.js 20+, pnpm 9+, and optionally MySQL 8.

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:backend
```

In another terminal:

```bash
pnpm dev:frontend
```

Open `http://localhost:3000`. When MySQL values are blank, the API uses preview data. To enable MySQL, import `backend/schema.sql`, fill `backend/.env`, and set a strong `JWT_SECRET`.

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to the deployed Express service. Audio/video calls request real device permissions in the browser; production peer media should use the included authenticated signaling events with a TURN service for restrictive networks.

## Live date recommendations

Set `GOOGLE_PLACES_API_KEY` in the Express environment to activate `/api/places/search`. The server uses Google Places Text Search (New), keeps the provider credential private, rate-limits search, and returns only the fields required by the UI. If the key is absent, `/dates` remains fully usable with city-personalized provider search cards and explicit Maps/Travel/Airbnb links. Airbnb is a provider deep link—not scraped inventory or a claimed reservation API.

## Verification

```bash
pnpm check
```

This runs backend tests and produces the complete Next.js production build.

Production credentials for MySQL hosting, email/SMS, payments, media storage, identity verification, maps, and deployment are intentionally not stored in this source package.
