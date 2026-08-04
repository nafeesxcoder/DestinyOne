# Chat emoji, GIF and sticker media

DestinyOne chat now has three separate media paths:

- Single emoji messages use an emotion-aware animation in the app. Laughing,
  crying, love, kiss, anger, party, surprise and sleep reactions do not share a
  generic wiggle.
- The GIF tab uses GIPHY Search/Trending with safe-rating (`g`) results,
  36-result pagination, error handling and visible provider attribution.
- The Sticker tab is a first-party DestinyOne pack. It works without a media
  provider and sends a structured sticker payload through the existing chat
  message contract.

## Enable exact live GIF search

1. Create a production application in the GIPHY developer dashboard.
2. Set `EXPO_PUBLIC_GIPHY_API_KEY` in the Expo/EAS and Netlify build
   environments.
3. Rebuild the Expo web/native bundle.

Do not commit the key and do not use a sample key from public documentation.
The key is a public client SDK value, but it must still belong to DestinyOne so
usage, rate limits and provider compliance remain attributable to this app.

Without the key, the preview deliberately shows first-party animated reaction
cards. It never relabels an unrelated remote GIF as “hug”, “kiss” or another
search term.

## Contract

- Provider search: `src/services/gifSearch.ts`
- Search-intent index and stickers: `src/domain/chatMediaCatalog.ts`
- UI, error fallback and animation renderer: `App.tsx`
- Required environment value: `EXPO_PUBLIC_GIPHY_API_KEY`

The provider service returns normalized `ChatGifCatalogItem` records, filters
out results without a usable media URL, limits each request to 50 or fewer and
caps pagination at the provider-supported 5,000-result window.
