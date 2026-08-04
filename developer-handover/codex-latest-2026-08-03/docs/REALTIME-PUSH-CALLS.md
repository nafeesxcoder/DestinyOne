# Real chat, push and calls

The approved DestinyOne chat UI is unchanged. This layer replaces preview
timers with authenticated transport, persisted receipts and real media where
the runtime supports it.

## Runtime paths

- Expo app: Supabase Auth, private Realtime topic `chat:<match_uuid>`, Presence,
  Broadcast signaling, Postgres messages/receipts and Expo push registration.
- Next.js delivery: the same visual chat workflow backed by Express/MySQL and
  authenticated Socket.IO conversation rooms.
- Web calls: browser `getUserMedia` and `RTCPeerConnection`. Offer, answer and
  ICE candidates travel through the authenticated chat transport; media does
  not pass through the application database.
- Native calls: call audit/signaling is ready. Build the app with a compatible
  native WebRTC module and EAS development build before shipping iOS/Android
  media. Expo Go does not contain that native WebRTC module.

## Supabase deployment

1. Apply all migrations, including
   `20260803215545_real_chat_push_calls.sql`.
2. Deploy `dispatch-push` and set `PUSH_DISPATCH_SECRET`. Set
   `EXPO_PUSH_ACCESS_TOKEN` when Expo push access security is enabled.
3. In Supabase Database Webhooks, call
   `https://<project-ref>.supabase.co/functions/v1/dispatch-push` on
   `member_notifications` INSERT. Send header
   `x-push-secret: <PUSH_DISPATCH_SECRET>`. The standard Supabase webhook body
   is accepted through `record.id`; manual workers may send
   `{ "notificationId": "<record.id>" }`.
4. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in the mobile build environment. Remote
   Android push requires an EAS development/production build, not Expo Go.

Do not put the service-role key, Expo access token or push dispatch secret in
the client bundle.

## Express/MySQL deployment

Set `FRONTEND_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, and a
strong `JWT_SECRET`. For browser push generate one VAPID pair and set the public
key on both frontend and backend; keep the private key only on the server.
Run `backend/schema.sql` so `push_devices`, message receipt columns and
`conversation_calls` exist.

## TURN configuration

STUN is a fallback, not a production relay. Supply short-lived TURN credentials
through `EXPO_PUBLIC_WEBRTC_ICE_SERVERS` and
`NEXT_PUBLIC_WEBRTC_ICE_SERVERS`, for example a JSON array containing STUN and
`turns:` URLs. Generate expiring TURN usernames/passwords server-side. Never
commit permanent relay credentials.

## Delivery behavior

- `sent`: message accepted by the server (one tick).
- `delivered`: recipient device joined/marked delivery (two ticks).
- `read`: recipient opened the conversation (blue ticks).
- Presence tracks multiple member devices so closing one tab does not falsely
  mark the member offline.
- Calls persist ringing/accepted/rejected/ended/missed/failed status, while SDP
  and ICE remain ephemeral.
- Push copy is privacy-safe and does not expose message text on a lock screen.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm --filter destinyone-backend check
pnpm --filter destinyone-frontend test:routes
pnpm --filter destinyone-frontend build
```

Test live calling with two authenticated users in separate browser profiles on
HTTPS. At least one test should use a restrictive/mobile network to verify TURN.
