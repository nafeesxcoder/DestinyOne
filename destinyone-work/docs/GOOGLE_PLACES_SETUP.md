# Google Places Setup

DestinyOne's Date Marketplace uses the **Places API (New)** through the
JWT-protected `search-places` Supabase Edge Function. The Google key never
ships in the Expo/web app.

## One-time Google Cloud setup

1. In the Google Cloud project that will own DestinyOne, enable billing.
2. Enable **Places API (New)** in APIs & Services.
3. Create a new API key named `destinyone-places-server`.
4. Restrict the key to the **Places API (New)** only. Do not use a browser,
   Android, or iOS-restricted key here: the request is made by Supabase.
5. Set an alert and a sensible daily budget in Google Cloud Billing before
   launch. Places searches are billable.

## Add the secret to Supabase

Open the DestinyOne Development project, then go to **Edge Functions →
Secrets** and add:

```
GOOGLE_MAPS_API_KEY=your_google_server_key
```

No redeploy is required after saving the secret. The already-deployed
`search-places` function reads it on the next request.

## What is live after setup

Signed-in members can search a city plus terms such as `Indian dinner`,
`coffee`, `museum`, or `spa` in Date Marketplace. The app receives only place
name, address, category, rating, open-now state, and a Google Maps URI. The
server key and raw Google response never reach the app.

Google Places finds places; it does **not** create reservations. Real booking
still needs a reservation partner (for example OpenTable, SevenRooms, or Resy)
and the existing Stripe reservation flow.
