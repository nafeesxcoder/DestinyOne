export type BackendRuntimeMode = 'demo' | 'supabase' | 'blocked';

export type BackendRuntimeInput = {
  appEnvironment?: string;
  requiresRealBackend?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  hasExplicitSupabaseUrl?: boolean;
  hasExplicitSupabaseAnonKey?: boolean;
};

export type BackendRuntimePolicy = {
  mode: BackendRuntimeMode;
  appEnvironment: 'development' | 'staging' | 'production';
  requiresRealBackend: boolean;
  isSupabaseConfigured: boolean;
  allowsDemoOtp: boolean;
  blockingReason: string;
};

function normalizeEnvironment(value?: string): BackendRuntimePolicy['appEnvironment'] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'production') return 'production';
  if (normalized === 'staging') return 'staging';
  return 'development';
}

function isValidSupabaseUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /\.supabase\.(co|in)$/.test(url.hostname);
  } catch {
    return false;
  }
}

function isValidPublishableKey(value?: string) {
  if (!value || value.length < 20) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('eyJ');
}

export function evaluateBackendRuntime(input: BackendRuntimeInput): BackendRuntimePolicy {
  const appEnvironment = normalizeEnvironment(input.appEnvironment);
  const requiresRealBackend = input.requiresRealBackend === true;
  const hasUrl = Boolean(input.supabaseUrl);
  const hasKey = Boolean(input.supabaseAnonKey);
  const validUrl = isValidSupabaseUrl(input.supabaseUrl);
  const validKey = isValidPublishableKey(input.supabaseAnonKey);
  const isSupabaseConfigured = validUrl && validKey;
  const isProduction = appEnvironment === 'production';
  const hasExplicitProductionConfig = input.hasExplicitSupabaseUrl === true && input.hasExplicitSupabaseAnonKey === true;

  let blockingReason = '';
  if (hasUrl !== hasKey) {
    blockingReason = 'Supabase configuration is incomplete. Set both the project URL and publishable key.';
  } else if ((hasUrl && !validUrl) || (hasKey && !validKey)) {
    blockingReason = 'Supabase configuration is invalid. Use the HTTPS project URL and an anon or publishable key.';
  } else if (isProduction && !requiresRealBackend) {
    blockingReason = 'Production must set EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true.';
  } else if (isProduction && !hasExplicitProductionConfig) {
    blockingReason = 'Production Supabase values must come from the release environment, not source defaults.';
  } else if (requiresRealBackend && !isSupabaseConfigured) {
    blockingReason = 'A real Supabase backend is required but is not configured.';
  }

  const mode: BackendRuntimeMode = blockingReason
    ? 'blocked'
    : isSupabaseConfigured
      ? 'supabase'
      : 'demo';

  return {
    mode,
    appEnvironment,
    requiresRealBackend,
    isSupabaseConfigured,
    allowsDemoOtp: appEnvironment !== 'production' && !requiresRealBackend,
    blockingReason,
  };
}
