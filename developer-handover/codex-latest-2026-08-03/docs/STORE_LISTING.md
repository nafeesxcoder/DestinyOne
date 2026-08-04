# DestinyOne store listing

The canonical submission copy is stored in:

- `store/release-manifest.json` for names, subtitles, keywords and short copy
- `store/full-description.txt` for the reviewed long description used by both stores

This document explains the intended presentation. Do not paste this guidance
into App Store Connect or Play Console.

## Positioning

- Product: premium serious dating and marriage-minded introductions
- Audience: South Asians in the USA and Canada
- Minimum age: 18; core audience: 25–35
- Tone: intentional, modern, respectful and premium
- Category: Dating on Google Play; Lifestyle with Social Networking secondary on iOS

## Screenshot story

1. **For something real** — premium welcome experience
2. **Fewer, better introductions** — curated daily matches
3. **Values before small talk** — intent and life-alignment profiles
4. **Conversation with personality** — rich chat and icebreakers
5. **Plan a thoughtful first date** — public-place suggestions
6. **Designed with safety in mind** — reports, blocks and privacy controls

Screenshots must use synthetic or consented mock profiles. Record model-consent
evidence in the store release manifest and review every screenshot on physical
iOS and Android devices.

## Claim rules

Do not claim guaranteed matches, the safest dating experience, a soulmate
prediction, universal identity verification, live reservations, or live
payments before the corresponding provider evidence is approved. Provider-
dependent copy must describe availability conditionally.

Run `pnpm store:manifest:verify` during development. Run
`pnpm store:release:verify` before requesting a production release candidate.
