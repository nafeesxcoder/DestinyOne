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
import { evaluateBackendRuntime } from '../domain/backendRuntime';

const explicitSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const explicitSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = explicitSupabaseUrl || configuredSupabaseUrl || '';
const supabaseAnonKey = explicitSupabaseAnonKey || configuredSupabaseAnonKey || '';

export const backendRuntime = evaluateBackendRuntime({
  appEnvironment: process.env.EXPO_PUBLIC_APP_ENV || configuredAppEnvironment || process.env.NODE_ENV,
  requiresRealBackend:
    (process.env.EXPO_PUBLIC_REQUIRE_REAL_BACKEND ?? String(configuredRequiresRealBackend)) === 'true',
  supabaseUrl,
  supabaseAnonKey,
  hasExplicitSupabaseUrl: Boolean(explicitSupabaseUrl),
  hasExplicitSupabaseAnonKey: Boolean(explicitSupabaseAnonKey),
});

export const appEnvironment = backendRuntime.appEnvironment;
export const requiresRealBackend = backendRuntime.requiresRealBackend;
export const isSupabaseConfigured = backendRuntime.isSupabaseConfigured;
export const backendReadinessError = backendRuntime.blockingReason;

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
