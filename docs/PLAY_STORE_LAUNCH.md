# DestinyOne Play Store launch plan

This guide is the working checklist for taking DestinyOne from Expo MVP to Google Play.

## Current Android app identity

- App name: `DestinyOne`
- Android package name: `com.destinyone.app`
- Version: `1.0.0`
- Version code: `1`
- Release artifact: Android App Bundle, `.aab`

Important: the Android package name is permanent after the first Play Console upload. If you want a different ID, change it before the first upload.

## What Codex can do

- Prepare app config, Play Store docs, build profiles, icons, privacy drafts, and release notes.
- Run local checks.
- Start an EAS Android production build after you log in.
- Help upload/submit when you provide Play Console/EAS access.

## What you must provide

- Google Play Developer account access.
- Expo account login.
- Final developer/support email.
- Public privacy policy URL.
- Final company/developer name and address if Google asks.
- At least 12 testers if your Play Console account is a new personal account that must complete closed testing.

## Step 1 — Create app in Google Play Console

Open Google Play Console → **Home → Create app**.

Use:

- App name: `DestinyOne`
- Default language: `English (United States)`
- App or game: `App`
- Free or paid: `Free`
- Contact email: your support email
- Accept Play policies, export laws, and Play App Signing terms.

## Step 2 — Store listing copy

Short description, under 80 characters:

```text
Intentional dating for Indians in the USA. For something real.
```

Full description:

```text
DestinyOne is a premium relationship app for Indians living in the USA who are looking for something real — serious dating, long-term commitment, and marriage-minded connections.

Meet curated daily matches, share values, plan safer dates, and chat only after mutual interest. DestinyOne is designed to feel intentional, modern, and respectful — not endless swiping.

Highlights:
• Curated daily matches
• Serious relationship and marriage intent
• Verified-member flow
• Icebreakers before chat
• Voice intro placeholder
• Real date planner
• Safety center with report, block, and unmatch tools
• Optional premium plan for more daily matches

DestinyOne is for adults. Always meet in public, protect your personal information, and use your own judgment.
```

Suggested category:

- Category: `Dating`
- Tags: dating, relationships, matrimony, social

## Step 3 — App access for Google review

Because DestinyOne requires onboarding/login, provide reviewer instructions only for the build behavior you are actually submitting.

For a local preview/demo build:

```text
Use any valid email/phone format on the login screen. For OTP, enter 123456. Payments and gift orders are demo placeholders unless production billing is configured.
```

For a real production build:

```text
Use the reviewer phone number or email test account provided here. OTP is delivered through the configured production auth provider. Payments and paid features are only available through configured Google Play test products.
```

Do not submit a production build that relies on the demo OTP.

## Step 4 — Data Safety draft

Use `docs/PLAY_STORE_DATA_SAFETY_DRAFT.md` as the starting answer sheet. Final answers must match the real production backend and providers.

## Step 5 — Build Android App Bundle

From this project folder:

```bash
pnpm release:check
pnpm dlx eas-cli login
pnpm dlx eas-cli build --platform android --profile production
```

EAS production Android builds default to `.aab`, which is the Play Store upload format.

## Step 6 — First upload

Google Play requires the first upload to be done manually before automated EAS submissions can work.

In Play Console:

1. Go to **Test and release**.
2. Start with **Internal testing** or **Closed testing**.
3. Create a release.
4. Upload the `.aab` from EAS.
5. Add release notes:

```text
Initial DestinyOne MVP release for testing. Includes onboarding, curated matches, profile setup, chat demo, safety tools, date planner, and premium plan placeholders.
```

## Step 7 — Closed testing, if required

If your Google Play Developer account is a personal account created after November 13, 2023, production access requires:

- Minimum 12 testers opted in.
- Testers must remain opted in for at least 14 continuous days.
- Then apply for production access in Play Console.

## Step 8 — Production rollout

After internal/closed testing and review:

1. Go to **Production**.
2. Create release.
3. Upload/select the approved app bundle.
4. Review countries, pricing, content rating, data safety, app access, and store listing.
5. Send for review.

Recommended first rollout:

- Use a small staged rollout if available.
- Watch crash reports, reviews, installs, and policy warnings.

## Useful commands

```bash
pnpm release:check
pnpm dlx eas-cli build --platform android --profile preview
pnpm dlx eas-cli build --platform android --profile production
pnpm dlx eas-cli submit --platform android --profile internal
pnpm dlx eas-cli submit --platform android --profile closed
pnpm dlx eas-cli submit --platform android --profile production
```
