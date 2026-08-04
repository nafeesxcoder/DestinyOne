# DestinyOne Next.js Handoff

This workspace now contains a separate web frontend and API backend while the
existing Expo application remains available at the repository root.

## Ownership

- `frontend/`: Next.js pages, components, client-side services, hooks, and styles.
- `backend/`: Express API, MySQL connection, routes, and database schema.
- Repository root: existing Expo application. Do not remove it until the web
  migration reaches full feature parity.

## Local setup

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Create a MySQL database and apply `backend/schema.sql`.

4. Start both applications in separate terminals:

   ```bash
   pnpm dev:backend
   pnpm dev:frontend
   ```

The frontend runs at `http://localhost:3000`. The API defaults to
`http://localhost:4000`.

The repository-root Expo application remains the approved UI source. The
Next.js route `/actual-app/` embeds its generated web output, while `/preview/`
provides a catalog of all screens and internal states. Do not rebuild the
approved UI as a second unrelated Next.js theme.

## Current API route groups

- `/api/health`
- `/api/auth` — register, login, current session and logout
- `/api/profiles` — profile CRUD, onboarding resume, privacy and preferences
- `/api/matches` — introductions, decisions, explanations and unmatch
- `/api/messages` — chat history/send/search, receipts, reactions, stars and preferences
- `/api/dates` and `/api/places` — planning, lifecycle, feedback and recommendations
- `/api/membership` — plans, status, checkout, verification and restore
- `/api/safety` — report, block/unblock and account deletion
- `/api/notifications` — inbox, device registration and notification preferences
- `/api/admin` — role permissions and moderation queue
- `/api/analytics` — consented events and aggregate launch snapshot

The complete REST and Socket.IO contract is maintained in `backend/API.md`.

When MySQL credentials are absent, the API uses preview data so the web
experience can still be reviewed. Production must use MySQL and real
authentication before launch.

## Frontend structure

The home experience is assembled from focused components:

- `HeroSection.jsx`
- `SearchForm.jsx`
- `StatsSection.jsx`
- `SuccessStories.jsx`
- `PremiumPlans.jsx`
- `Testimonials.jsx`

Shared navigation is owned by `components/layout/AppShell.jsx`. Feature code
belongs inside its matching component folder rather than in page files.

## Migration order

1. Authentication and sessions.
2. Profiles, media, and verification.
3. Preferences and matching.
4. Likes, mutual matches, and chat.
5. Date and gift marketplaces.
6. Membership and payments.
7. Safety, moderation, and notifications.

Keep API responses versionable and never expose private phone numbers, precise
addresses, payment credentials, or moderation metadata to the browser.
