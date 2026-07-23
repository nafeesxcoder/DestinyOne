# DestinyOne Source Map

## Current working source

`App.tsx` is the current application entry point and contains the screen components so the Expo preview can run from one place. Shared design primitives live in `src/components.tsx`; theme tokens live in `src/theme.ts`; mock data lives in `src/data.ts`.

## Screen index

| Area | Current component(s) | Planned destination when split |
| --- | --- | --- |
| Launch and sign-in | `Splash`, `Welcome`, `Auth`, `Otp` | `src/screens/auth/` |
| Onboarding | `Verify`, `ProfileSetup`, `Vibes`, `Intent`, `Alignment` | `src/screens/onboarding/` |
| Matches and discovery | `HomeClean`, `MatchCard`, `Detail`, `DiscoveryCenter`, `Likes` | `src/screens/matches/` |
| Couple mode | `CoupleMode`, partner connection sheets | `src/screens/couple/` |
| Chat | `Chat`, `ChatBubble`, attachment sheets, calls | `src/screens/chat/` |
| Dates and marketplace | `EventsHub`, `DatePlanner`, `PlaceCard`, booking sheets | `src/screens/dates/` |
| Executive Circle | `ExecutiveCircle`, application and review cards | `src/screens/executive/` |
| Profile and safety | `Profile`, `SafetyCenter`, `SupportCenter` | `src/screens/profile/` |
| Membership | `Pricing`, checkout sheets, entitlement cards | `src/screens/membership/` |
| Shared UI | `Button`, `Field`, `Chip`, `SectionTitle`, `StepBar` | `src/components/` |
| Backend and persistence | `src/services/`, `src/domain/`, `supabase/` | Kept by domain |

## Handoff workflow

1. Install dependencies with `pnpm install`.
2. Start the web preview with `pnpm web` or make a web build with `pnpm build:web`.
3. Run `pnpm check` before merging changes.
4. Use `.env.example` as the environment-variable template; do not share `.env.local`.

## Important

The requested folder-by-screen split should be done as a controlled refactor: move one functional area at a time, run typecheck/tests after each move, and preserve the public `Screen` navigation contract. The handoff ZIP contains this working baseline before that refactor begins.
