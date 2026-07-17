# Phase 10: controlled Toronto pilot gate

Phase 10 converts the source-ready product into a measurable, reversible city
pilot. The gate is deliberately evidence-only: screens, migrations and unit
tests do not increase the percentage until the target environment or operating
team has produced verified evidence.

## Evidence gates

1. Hosted Supabase migration baseline and generated types verified.
2. Real email and phone OTP delivery tested without demo codes.
3. RLS and storage tests executed against the pilot backend.
4. Critical journey passed on a physical iPhone.
5. Critical journey passed on a physical Android device.
6. Named Trust Ops rota and escalation coverage staffed.
7. Scam, harassment and unsafe-date incident drill passed.
8. Toronto reciprocal cohort liquidity meets threshold for eight weeks.
9. Billing, push and marketplace provider sandbox evidence reconciled.
10. Privacy-safe monitoring and alert drill passed.
11. Final legal and support URLs published over HTTPS.
12. Staged rollout and rollback drill passed.

## Go / no-go rule

The controlled pilot can open only when all 12 gates have current evidence.
Any failed critical journey, unstaffed safety window, security-test failure or
rollback failure is an automatic no-go. City expansion remains locked until
the Toronto pilot sustains liquidity, healthy outcomes and safety guardrails.

## Current state

The source model, automated contracts and Admin Audit card are implemented.
Live evidence remains `0/12`, so the honest state is `Source plan only · 0%`.
The first operational action is to align and verify the hosted Supabase pilot
baseline; no production backend deployment is claimed by this document.

## Hosted baseline verification

Migration `020_complete_deployment_contract.sql` upgrades the stable metadata RPC
that is executable only by `service_role`. `pnpm supabase:verify` uses that RPC
to compare the complete hosted app/Edge-Function table, RPC and RLS inventory
with the versioned v21 contract,
then uses the anonymous OpenAPI surface and read-only `GET ... limit=0` probes
to detect unintended anonymous exposure.

The verifier never calls member, safety, marketplace, growth or billing
mutation RPCs. It fails closed when the URL, anonymous key, service-role key,
manifest version, RLS state or anonymous privilege evidence is missing or
unexpected. The service-role key is an operator/CI secret and must never use an
`EXPO_PUBLIC_` prefix or enter an app build.

## Toronto pilot deployment workflow

`.github/workflows/supabase-pilot.yml` is separate from production and runs
only through a manual `DEPLOY_TORONTO_PILOT` confirmation, reviewed baseline
checkbox and change-ticket reference. It uses pilot-only GitHub Environment
secrets and the protected `toronto-pilot` environment.

The workflow records linked migration history, shows a dry run before apply,
deploys all five privileged Edge Functions, lints the linked public schema,
executes the full pgTAP security suite against the pilot database and runs the
read-only hosted contract verifier. A successful run uploads a permission-0600
JSON evidence artifact containing contract, schema, auth and exposure results;
credentials and tokens are never included. That artifact is required evidence
for the hosted-backend pilot gate, but it does not prove physical-device OTP or
end-to-end member journeys.

The hosted Auth settings probe currently confirms email, phone, Google, and
Twilio Verify. The deployment verifier fails closed if email, phone, or an SMS
provider is later removed.
