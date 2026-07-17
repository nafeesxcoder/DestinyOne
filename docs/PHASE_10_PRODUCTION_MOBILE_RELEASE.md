# Phase 10: production mobile release candidate

DestinyOne has a separate manual production release-candidate workflow at
`.github/workflows/mobile-production-build.yml`. It does not run on pushes or
pull requests and it never submits a build to either store automatically.

## Protected environment

Create a GitHub environment named `production-mobile` with required reviewers.
Configure:

- Secret `PRODUCTION_EXPO_TOKEN`
- Variable `PRODUCTION_EAS_PROJECT_ID`
- Secret `PRODUCTION_EXPO_PUBLIC_SUPABASE_URL`
- Secret `PRODUCTION_EXPO_PUBLIC_SUPABASE_ANON_KEY`

The same project UUID and public client backend values must exist in the EAS
`production` environment. Apple signing credentials and the Android upload
keystore remain in Expo's credential service, never in the repository.

## Release-candidate gate

The workflow requires the exact confirmation `BUILD_PRODUCTION_RC`, signing
setup confirmation, final legal review, approved store metadata, reviewed live
provider evidence, a physical-device QA summary reference and an approved
release ticket. It then runs the full source release check, production backend
lock, generated iOS/Android least-privilege audit, and requests a store-signed
EAS build with auto-incremented build numbers.

Only non-secret build metadata and evidence references are retained for 30
days. Reviewer login values and OTPs are never stored in client code, build
artifacts or workflow inputs. Put working reviewer credentials only in the
protected App Store Connect and Play Console reviewer-note fields.

## Submission remains separate

A successful release-candidate build is not store approval and is not evidence
that live providers work. Submit only after both platform builds complete,
their exact commit passes physical-device journeys, billing restore/refund is
verified, backend/security evidence is reviewed, final privacy labels match
actual data collection, and rollback ownership is confirmed.
