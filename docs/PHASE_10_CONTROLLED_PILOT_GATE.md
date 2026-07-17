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

Migration `019_read_only_deployment_manifest.sql` adds a stable metadata RPC
that is executable only by `service_role`. `pnpm supabase:verify` uses that RPC
to compare the hosted table/function/RLS inventory with the versioned contract,
then uses the anonymous OpenAPI surface and read-only `GET ... limit=0` probes
to detect unintended anonymous exposure.

The verifier never calls member, safety, marketplace, growth or billing
mutation RPCs. It fails closed when the URL, anonymous key, service-role key,
manifest version, RLS state or anonymous privilege evidence is missing or
unexpected. The service-role key is an operator/CI secret and must never use an
`EXPO_PUBLIC_` prefix or enter an app build.
