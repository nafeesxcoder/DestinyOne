import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import {
  configuredAppEnvironment,
  configuredRequiresRealBackend,
  configuredSupabaseAnonKey,
  configuredSupabaseUrl,
} from '../config/supabase';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || configuredSupabaseUrl || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || configuredSupabaseAnonKey || '';
export const appEnvironment =
  process.env.EXPO_PUBLIC_APP_ENV || configuredAppEnvironment || process.env.NODE_ENV || 'development';
export const requiresRealBackend =
  (process.env.EXPO_PUBLIC_REQUIRE_REAL_BACKEND ?? String(configuredRequiresRealBackend)) === 'true';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20;

export const backendReadinessError = requiresRealBackend && !isSupabaseConfigured
  ? 'Production backend is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before releasing DestinyOne.'
  : '';

const canReadAuthSessionFromUrl =
  typeof window !== 'undefined' && typeof window.location !== 'undefined';

// The placeholder client keeps imports safe in demo mode. Network methods are
// called only after `isSupabaseConfigured` has been checked.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-for-local-demo',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Web magic-link callbacks need this on. Email OTP is still the primary
      // flow, but this prevents Supabase default link emails from dead-ending.
      detectSessionInUrl: canReadAuthSessionFromUrl,
    },
  },
);
