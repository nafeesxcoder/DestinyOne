// Public Supabase client config for DestinyOne.
//
// These values are safe to ship in the app bundle because Supabase publishable
// keys are client-side keys. Real security must come from Row Level Security
// policies and server-side Edge Functions for privileged actions.
// Keep release credentials in local/EAS/Sites environment configuration. These
// source defaults intentionally stay empty so a production build cannot appear
// configured by inheriting a development project.
export const configuredSupabaseUrl = '';
export const configuredSupabaseAnonKey = '';

export const configuredAppEnvironment = 'development';
export const configuredRequiresRealBackend = false;
