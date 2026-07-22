# Phase 10: store release contract

`store/release-manifest.json` is the canonical non-secret release record for
App Store Connect and Google Play. It keeps product positioning, identifiers,
legal URLs, support ownership, reviewer-note references, compliance approvals,
provider truth, billing products, screenshot consent and release evidence in
one reviewable place.

The manifest never stores reviewer credentials, passwords or OTPs. Reviewer
access details belong only in protected App Store Connect and Play Console
fields. The manifest stores a reference to that protected record.

## Two validation modes

`pnpm store:manifest:verify` validates the draft on every source release check.
It enforces:

- production bundle/package identifiers
- adults-only age floor
- USA and Canada market scope
- South Asian/Indian audience positioning
- Apple and Google copy length limits
- a clean shared full-description source
- no prohibited guarantees or provider claims
- no embedded reviewer credentials

`pnpm store:release:verify` is the production gate. In addition to the draft
checks, it requires:

- manifest status `approved`
- published HTTPS privacy, terms, support and deletion URLs
- monitored support email and escalation owner
- protected reviewer access/instruction references
- final legal, privacy-label, Data Safety, age-rating and UGC approvals
- account-deletion evidence
- at least three approved screenshot references per platform
- model-consent evidence and physical-device screenshot review
- release ticket, backend/provider gates and iOS/Android device-QA evidence
- Apple/Google product IDs and restore/refund evidence when billing is live

The production mobile workflow runs this gate after generated native-project
verification and before requesting a signed EAS build.

## Updating provider truth

Keep provider flags `false` until the exact live integration and operational
evidence are reviewed. Store copy cannot claim universal verification, live
venue booking, gift fulfillment or paid entitlements merely because a preview
screen exists.

Use `store/full-description.txt` as the only long-description upload source.
The guidance in `docs/STORE_LISTING.md` is not submission copy.
