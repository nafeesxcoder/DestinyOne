# DestinyOne — Notifications & Alerts Gate

This gate makes sure notifications feel premium, useful and safe instead of spammy.

The app can preview profile-view notices, Spark alerts, retention nudges and in-app notifications now. Production push delivery still needs a real provider and physical-device QA.

## What the gate checks

1. `member_notifications` table, push token storage and realtime notification stream
2. Member permissions, notification preferences, profile-view threshold and quiet hours
3. Event triggers for profile views, matches, Sparks, gifts, dates, safety and support
4. Expo Push / FCM / APNs provider configured server-side
5. Deep links that open the right screen only after auth, block and privacy checks
6. Rate limits so profile views and Sparks do not become noisy or abusive
7. Safety, date check-in and support alerts with audit logs
8. Physical-device QA for iOS and Android

## Current app status

Implemented or represented:

- Profile-view alert only after meaningful detail-page time
- Notification data model and push-token tables in Supabase migrations
- Retention notification ideas on the home experience
- Member preference fields for profile-view notifications
- Match, icebreaker and date proposal notification inserts in migrations
- Admin Audit card for notification readiness

Still pending before live release:

- Expo Push / FCM / APNs credentials
- Server-side push sending job or Edge Function
- Device token lifecycle: add, refresh, revoke, invalid-token cleanup
- Deep-link routing for every notification type
- Quiet-hour and rate-limit enforcement on the server
- Real-device testing for foreground, background, killed app, denied permission and expired token states

## Production rule

Never send romantic notifications directly from the client. The backend should decide:

- whether the member opted in;
- whether the event passes threshold and rate limits;
- whether the sender/recipient are blocked or hidden;
- whether the notification should be in-app only or push + in-app;
- whether the copy is safe and not too revealing on the lock screen.
