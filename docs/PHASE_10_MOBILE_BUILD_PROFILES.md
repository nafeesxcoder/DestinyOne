# Phase 10: mobile build profiles

DestinyOne now has three install identities and backend policies:

| Profile | App identity | EAS environment | Backend policy |
|---|---|---|---|
| `development` | `com.destinyone.app.dev` | `development` | Local mock mode allowed |
| `toronto-pilot` / `preview` | `com.destinyone.app.pilot` | `preview` | Staging Supabase required; demo OTP disabled |
| `production` | `com.destinyone.app` | `production` | Production Supabase and real-backend lock required |

The three variants can be installed without overwriting one another. The pilot
uses the standard EAS `preview` variable environment because custom EAS
environment names are plan-dependent. Its display name and deep-link scheme are
`DestinyOne Pilot` and `destinyone-pilot`.

`scripts/verify-mobile-build-environment.mjs` runs through the official EAS
`eas-build-pre-install` lifecycle hook. It fails pilot/production builds before
dependency installation when the environment, backend lock, Supabase HTTPS URL
or publishable key is missing or invalid. It reports only boolean configuration
state and never prints key values.

`app.config.ts` preserves the static `app.json` configuration while selecting
variant-specific names, schemes and package identifiers. iPad support is
enabled so tablet QA can use a real native build instead of only web sizing.

Before the first pilot build, create `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` in the EAS `preview` environment. Before a store
build, create their production equivalents in the EAS `production`
environment. These are public client values; service-role, database, provider
and signing secrets must never use an `EXPO_PUBLIC_` prefix.
