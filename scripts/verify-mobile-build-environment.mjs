const variant = process.env.APP_VARIANT?.trim();
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim();
const requiresRealBackend = process.env.EXPO_PUBLIC_REQUIRE_REAL_BACKEND === 'true';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const easProjectId = process.env.EAS_PROJECT_ID?.trim();
const errors = [];

const validUrl = (() => {
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'https:' && /\.supabase\.(co|in)$/.test(parsed.hostname);
  } catch {
    return false;
  }
})();
const validKey = Boolean(supabaseKey && supabaseKey.length >= 20 && (supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('eyJ')));
const validEasProjectId = Boolean(easProjectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(easProjectId));

if (!['development', 'pilot', 'production'].includes(variant)) {
  errors.push('APP_VARIANT must be development, pilot, or production.');
}

if (variant === 'development') {
  if (appEnvironment !== 'development') errors.push('Development builds must set EXPO_PUBLIC_APP_ENV=development.');
  if (requiresRealBackend) errors.push('Development builds must not require the production backend lock.');
}

if (variant === 'pilot') {
  if (appEnvironment !== 'staging') errors.push('Toronto pilot builds must set EXPO_PUBLIC_APP_ENV=staging.');
  if (!requiresRealBackend) errors.push('Toronto pilot builds must require a real backend.');
  if (!validUrl || !validKey) errors.push('Toronto pilot builds require explicit valid Supabase URL and publishable key values.');
  if (!validEasProjectId) errors.push('Toronto pilot builds require a valid linked EAS_PROJECT_ID UUID.');
}

if (variant === 'production') {
  if (appEnvironment !== 'production') errors.push('Production builds must set EXPO_PUBLIC_APP_ENV=production.');
  if (!requiresRealBackend) errors.push('Production builds must set EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true.');
  if (!validUrl || !validKey) errors.push('Production builds require explicit valid Supabase URL and publishable key values.');
  if (!validEasProjectId) errors.push('Production builds require a valid linked EAS_PROJECT_ID UUID.');
}

const summary = {
  variant: variant ?? null,
  appEnvironment: appEnvironment ?? null,
  requiresRealBackend,
  supabaseConfigured: validUrl && validKey,
  easProjectLinked: validEasProjectId,
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
