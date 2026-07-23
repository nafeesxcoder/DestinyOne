# DestinyOne Supabase email OTP setup

The app now uses Supabase email OTP for email verification. Phone can keep the
preview code during development, but email must use the real code sent by
Supabase.

## 1. Make the email show a 6-digit OTP

Supabase passwordless email uses the Magic Link template. By default, that email
often shows a sign-in link instead of a visible OTP code.

In Supabase Dashboard:

1. Open **Authentication**.
2. Open **Email Templates**.
3. Choose **Magic Link**.
4. Add the token anywhere visible in the email:

```html
<p>Your DestinyOne verification code is:</p>
<h1>{{ .Token }}</h1>
<p>This code expires soon. If you did not request it, ignore this email.</p>
```

You can keep the link too, but the app's main flow expects the user to type the
6-digit `{{ .Token }}` into the verification screen.

## 2. Fix broken email links

In Supabase Dashboard:

1. Open **Authentication**.
2. Open **URL Configuration**.
3. Set **Site URL** to the current app URL while testing.
4. Add the app URL to **Redirect URLs**.

For the current preview, use:

```text
https://specified-cologne-price-film.trycloudflare.com/
```

For production, replace this with the real domain / app deep link. Cloudflare
preview URLs change, so they are only for testing.

## 3. Current app behavior

- Phone: preview OTP `123456` / `12345` is allowed in development.
- Email: preview OTP is disabled. The user must enter the real Supabase email OTP.
- Email password is saved only after the email OTP verifies successfully.
