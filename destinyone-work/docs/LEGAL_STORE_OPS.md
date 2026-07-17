# DestinyOne — Legal & Store Ops Gate

This P1 layer keeps store submission honest before production API keys, billing products, and public legal pages are connected.

## What is included now

- Legal/store readiness engine for:
  - Privacy Policy, Terms, and Community Guidelines
  - Final company/contact details
  - Public HTTPS legal/support URLs
  - Google Play Data Safety and App Store privacy labels
  - Reviewer credentials, demo path, support contact, and production demo guard
  - Subscription disclosure
  - Age rating and account deletion
- Admin Audit card that shows legal blockers and the next best step.
- Store Review card now correctly treats unpublished public legal URLs as a blocker.
- Tests covering missing public URLs, missing legal review, and fully ready submission.

## Current honest status

The app has strong launch drafts and store assets, but store submission is not final until:

1. Legal company name, jurisdiction, legal/privacy/support emails are finalized.
2. Privacy Policy, Terms, Community Guidelines, and Support pages are published over HTTPS.
3. App Store privacy labels and Google Play Data Safety answers match the real backend/providers.
4. Age rating, subscription products, restore-purchase copy, and account deletion behavior are reviewed.

## Production rule

Do not submit to Play Store/App Store with placeholder legal contact details, unpublished URLs, or privacy labels that do not match real production behavior.
