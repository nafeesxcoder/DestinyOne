# DestinyOne

A premium, intentional dating and matrimony MVP for South Asians in the USA and Canada, built with Expo, React Native, and TypeScript.

DestinyOne is exclusively for committed long-term relationships and marriage. Casual and short-term intentions are not part of the product.

## Run

```bash
pnpm install
pnpm start
```

Then press `i` for iOS, `a` for Android, or `w` for the web preview.

For development-only visual QA, open a screen directly with `?preview=<screen>`, for example `?preview=home`, `?preview=chat`, `?preview=events`, or `?preview=pricing`. This shortcut is disabled when `EXPO_PUBLIC_APP_ENV=production`.

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm check
```

The automated suite covers matching/ranking, wallet gift rules, and authentication validation. Core controls include screen-reader roles, labels, selected states, and disabled states. A branded error boundary protects users from a blank screen, while privacy-safe analytics and crash adapters are ready for production providers without collecting contact details, messages, profile IDs, photos, or precise locations.

## Included MVP flows

- Splash, welcome, validated phone/email authentication, and mock OTP verification
- Cinematic red-velvet preloader, dimensional ruby branding, and Poppins-first typography with limited Satisfy accents
- Selfie verification and optional ID placeholder
- Native camera/photo-library profile uploads and private front-camera selfie capture
- Short profile, vibe, and relationship-intent onboarding
- Life-alignment onboarding for marriage timeline, children, family involvement, and relocation
- Curated daily matches with qualitative match labels
- Match details, voice-intro placeholder, and mutual-match moment
- Serious-profile details covering future plans, family expectations, languages, and relocation
- Optional 30-second voice introduction with recording, preview, and delete controls
- Icebreaker gate before chat
- Chat with voice-note and safety placeholders
- WhatsApp-inspired rich chat with online state, typing indicator, read receipts, photos, GIFs, quick emojis, filtered snaps, and custom selfie stickers
- Gift Shop with 12 physical delivery ideas, recipient-private address consent, order status cards, plus optional digital gifts
- Trusted Circle with private friend vouches, shareable referral invites, profile trust badges, and completion rewards
- Privacy-safe Smart Discovery based only on in-app choices, with visible activity controls and reset
- Opt-in Crossed Paths using approximate foreground location, mutual consent, and delayed profile display
- Date Planner with café/walk/dinner/activity ideas, approximate-area discovery, time proposals, safety check-ins, and rich chat cards
- Simple payment architecture: store billing for Plus/gift coins and Stripe Apple Pay for optional real-world date reservation holds
- Safety Center with private reporting, blocking, unmatching, date check-ins, scam guidance, data controls, and account deletion requests
- Likes, profile, Free plan, and DestinyOne Plus pricing
- Persistent local session, onboarding preferences, verification, and per-match chat

All profiles use mock data. Session and conversation state are stored locally with AsyncStorage. Backend connection points are intentionally kept behind this state layer; Firebase or Supabase can replace it without changing the visual components.

For local preview without Supabase, the OTP demo accepts `123456` or `12345`. Production builds should explicitly block this fallback with `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true`.

## Production backend

The app automatically uses Supabase when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are configured. Local preview can run in demo mode, but production builds should set `EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true` so fake OTP/local-only auth cannot ship.

Start with [.env.example](./.env.example), then apply [the initial migration](./supabase/migrations/001_initial_schema.sql). The schema includes RLS-protected profiles, preferences, matches, messages, gifts, date proposals, vouches, discovery signals, subscriptions, coins, blocks, and reports.

Never include a Supabase service-role key in the mobile app.

## Payments

DestinyOne keeps checkout simple and store-compliant: digital subscriptions and gift coins use official Apple/Google in-app billing, while optional real-world venue holds and physical gifts can use Stripe Apple Pay. The browser and unconfigured builds use clearly labelled no-charge demo orders. See [the payment setup guide](./docs/PAYMENTS.md).

## Release package

- `assets/` contains the 1024px app icon, splash icon, and web favicon.
- `vercel.json` and `netlify.toml` are included for static web deployment.
- `eas.json` contains development, internal preview, and production build profiles.
- `docs/DEPLOYMENT.md` explains the live web launch flow.
- `docs/PLAY_STORE_LAUNCH.md` explains the Android/Google Play launch flow.
- `docs/PLAY_STORE_DATA_SAFETY_DRAFT.md` provides a draft Data Safety worksheet.
- `docs/REAL_APP_ROADMAP.md` tracks the real backend/auth/storage/verification launch path.
- `docs/PRODUCTION_SCORECARD.md` is the evidence-based baseline and defines what 10/10 means for every business area.
- `docs/ARCHITECTURE_AND_FEATURE_BASELINE.md` maps the current app architecture, feature inventory, dependencies, and production gaps.
- `docs/PHASE_1_UI_QA.md` records the responsive UI/brand audit, interaction checks, fixes, and remaining device-level gates.
- `docs/PHASE_2_PRODUCT_DIFFERENTIATION.md` defines the Relationship Path, competitor signals, feature hierarchy, metrics, and remaining validation gates.
- `docs/AI_MATCHING_AND_PRIVACY.md` explains the privacy-safe AI matching and Red Rose rules.
- `docs/STORE_LISTING.md` contains App Store and Google Play copy plus the screenshot story.
- `docs/PRIVACY_POLICY_DRAFT.md`, `docs/TERMS_DRAFT.md`, and `docs/COMMUNITY_GUIDELINES.md` provide launch drafts that require final company details and legal review.
- `docs/RELEASE_CHECKLIST.md` separates completed engineering checks from the credentials, production services, legal publishing, billing, and physical-device checks still required before public submission.

Run the complete local release gate with `pnpm release:check`.

## Live web deployment

The recommended production web host is Vercel. Push this project to GitHub, import it into Vercel, and the app will build with `pnpm build:web` and publish from `dist`. Netlify is also supported with `netlify.toml`.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).
