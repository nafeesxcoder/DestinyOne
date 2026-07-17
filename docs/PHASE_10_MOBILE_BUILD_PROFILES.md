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
enabled and orientation is set to `default` so tablet QA covers portrait and
landscape instead of only web sizing. Apple Pay merchant identifiers are also
isolated per app identity, preventing pilot/development builds from sharing the
production merchant entitlement.

Before the first pilot build, create `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` in the EAS `preview` environment. Before a store
build, create their production equivalents in the EAS `production`
environment. These are public client values; service-role, database, provider
and signing secrets must never use an `EXPO_PUBLIC_` prefix.

Run `eas init` once with the intended Expo organization to create/link the real
project. Configure its UUID as the plain `EAS_PROJECT_ID` variable in the EAS
`preview` and `production` environments. Also add the same UUID as the protected
GitHub environment variable `PILOT_EAS_PROJECT_ID`; this allows CI to resolve
the project before EAS-hosted environment variables are loaded. Pilot and
production build guards reject missing or malformed linkage IDs. The project
UUID is an identifier rather than a credential, but it should still be managed
as configuration instead of being invented or copied from another app.

## Signed Toronto pilot build

`.github/workflows/mobile-pilot-build.yml` is the controlled build entry point.
It is manual, requires the exact `BUILD_TORONTO_PILOT` confirmation, a change or
QA ticket, and confirmation that Expo/platform signing credentials are already
configured. The workflow runs the environment guard and full release check
before requesting a non-blocking EAS build from the reviewed commit. iOS,
Android or both platforms can be selected. The workflow stores only the EAS
build request metadata as a short-lived artifact.

Create the protected GitHub environment `toronto-pilot-mobile` with approval
rules and these pilot-only secrets:

- `PILOT_EXPO_TOKEN`
- `PILOT_EXPO_PUBLIC_SUPABASE_URL`
- `PILOT_EXPO_PUBLIC_SUPABASE_ANON_KEY`

Add this protected environment variable (not a secret):

- `PILOT_EAS_PROJECT_ID`

Apple distribution, provisioning devices and Android keystore credentials stay
in the Expo credential service and must be configured before selecting the
workflow's credentials confirmation. Never place signing files in the repo.

## Physical-device evidence gate

A successful cloud build is not a passed device journey. Run the canonical ten
steps in `scripts/mobile-pilot-evidence-contract.mjs` on a physical iPhone and a
physical Android device using the same reviewed commit. Start from
`docs/evidence/mobile-pilot-evidence.example.json`, create separate iOS and
Android packets outside the repo, and validate them with:

```bash
pnpm mobile:pilot:evidence path/to/ios.json path/to/android.json \
  --summary-file=artifacts/mobile-pilot-summary.json
```

The gate fails unless both packets use the pilot app, real backend, physical
devices, the same commit, every required journey is passed, and every evidence
reference is marked redacted. The validator rejects common personal/secret
metadata fields. Screenshots and videos still require human review before they
are attached: use synthetic pilot accounts, redact identifiers and message
content, and keep raw artifacts in access-controlled QA storage. Only the
sanitized summary should be retained with release evidence.
