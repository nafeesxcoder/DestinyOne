# DestinyOne live deployment

This project is ready for a static web launch through Vercel, Netlify, or Cloudflare Pages.

## Recommended: Vercel

Use this when you want the fastest shareable production URL.

1. Push this project to GitHub.
2. Open Vercel and choose **Add New → Project**.
3. Import the GitHub repo.
4. Vercel should read `vercel.json` automatically:
   - Install command: `pnpm install`
   - Build command: `pnpm build:web`
   - Output directory: `dist`
5. Add environment variables only when backend/payment services are ready:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GIFTS_API_URL`
6. Deploy.

The current MVP also works without those variables in local mock/demo mode.

## Backup: Netlify

1. Push this project to GitHub.
2. Open Netlify and choose **Add new site → Import an existing project**.
3. Select the repo.
4. Netlify should read `netlify.toml` automatically:
   - Build command: `pnpm build:web`
   - Publish directory: `dist`
5. Deploy.

## Local production check

```bash
pnpm release:check
```

This runs TypeScript, tests, and a production web export.

## Important before public launch

- Replace mock/demo auth with Supabase/Firebase.
- Connect production payment keys for store billing and Stripe Apple Pay.
- Review privacy policy, terms, gift delivery flow, and safety reporting with legal.
- Test on real iPhone/Android devices before App Store or Play Store submission.
