# Google Play Data Safety draft

Use this as a working draft only. The final Play Console answers must match the real production backend, payment providers, analytics, and support tools.

## Data collected

| Data type | Collected? | Purpose | Notes |
| --- | --- | --- | --- |
| Name | Yes | App functionality, account management | Profile setup |
| Email address | Yes | Account management, support | Signup/login |
| Phone number | Yes | Account management, verification | OTP/login |
| Photos/videos | Yes | App functionality | Profile photos, selfie verification, chat images/snaps |
| Audio files | Yes | App functionality | Optional voice intro and voice-note placeholder |
| Approximate location | Yes, optional | App functionality | Crossed Paths and date ideas; exact location should not be shown |
| User messages | Yes | App functionality, safety | Chat after mutual match |
| App interactions | Yes | App functionality, analytics | Likes, skips, profile views, discovery preferences |
| Purchase history | Yes, if billing is enabled | App functionality, payments | Plus plan, gift coins, real-world gift/date orders |
| Crash logs/diagnostics | Yes, when provider is connected | Analytics, app performance | Use privacy-safe crash reporting only |

## Data sharing

Likely shared with service providers only:

- Hosting/backend provider, such as Supabase or Firebase.
- Payment provider, such as Google Play Billing and Stripe.
- Moderation/support tools, if connected.
- Analytics/crash provider, if connected.

Before final submission, compare this draft with the in-app Observability / Privacy Gate and the actual analytics/crash provider settings. The final Play Console answers must match real event names, consent controls, crash logs and performance monitoring behavior.

Do not mark data as sold. The product intent is not to sell personal data.

## Security practices

- Data should be encrypted in transit.
- Users should be able to request account deletion.
- Location should be foreground-only, approximate, opt-in, and revocable.
- Reports, blocks, and safety records may need limited retention for safety/fraud/legal reasons.

## Play Console notes

- Ads: `No`, unless an ad SDK is added later.
- App category: `Dating`.
- Target audience: adults age 18 and older only.
- In-app purchases: `Yes` once DestinyOne Plus/gift coins are live.
- User-generated content: `Yes` because profiles, photos, and chat exist.
- Preview-only app access may use the documented demo OTP. A production
  submission must use a protected real-backend reviewer account and must never
  include its credentials or OTP in source files or the app bundle.
