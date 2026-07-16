# DestinyOne retention loops

This document tracks the app hooks that bring serious users back without making the product feel noisy or casual.

## Implemented MVP loops

1. **3–5 curated daily matches** — caps the daily deck at a premium-feeling rhythm instead of infinite swiping.
2. **Daily relationship prompt** — a thoughtful question that can feed Coach, onboarding, and first-message ideas.
3. **Weekly high-intent match drop** — highlights exceptional/high-intent profiles once per week.
4. **Voice intro unlocks** — nudges members to record/listen to voice intros when trust depth matters.
5. **Date plan reminders** — turns mutual interest into safe venue/time suggestions.
6. **Match quality feedback** — uses in-app views, interests, and skips to improve the next deck.
7. **AI Coach suggestions** — brings members back to polish bio, openers, red flags, and post-date reflection.
8. **Profile-view alert** — supports “someone viewed your profile” notifications after meaningful detail-page time.
9. **Events near you** — links retention to safe cafés, mixers, video speed dates, and premium dinners.
10. **Trusted Circle rewards** — encourages friend vouches and trust-building rewards.

## Production connection points

- Push notifications: Expo Notifications or Firebase Cloud Messaging.
- Scheduled jobs: Supabase Edge Functions + cron for daily decks and weekly drops.
- Analytics: keep privacy-safe; use only in-app actions such as profile views, likes, skips, vouches, date plans, event saves.
- Profile-view alerts: trigger only after meaningful detail-page time, not after swipe impressions.
- Events: connect to venue/reservation partners after city-by-city marketplace launch.
- Before launch, pass the Notifications & Alerts Gate in `docs/NOTIFICATION_READINESS.md` so retention notifications have push tokens, deep links, quiet hours, rate limits and physical-device QA.

## Privacy boundary

Retention should never read browser searches, other-app behavior, contacts, private photos, or microphone activity. Ranking and reminders should come from stated preferences and DestinyOne in-app actions only.
