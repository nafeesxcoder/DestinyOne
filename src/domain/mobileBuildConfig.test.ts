import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
const appConfig = readFileSync('app.config.ts', 'utf8');
const script = 'scripts/verify-mobile-build-environment.mjs';
const validSupabase = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://pilotref.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_12345678901234567890',
};

function verify(env: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    env: {...process.env, ...env},
    encoding: 'utf8',
  });
}

describe('mobile build profiles', () => {
  it('separates development, pilot, and production app identities', () => {
    expect(appConfig).toContain("development: 'com.destinyone.app.dev'");
    expect(appConfig).toContain("pilot: 'com.destinyone.app.pilot'");
    expect(appConfig).toContain("production: 'com.destinyone.app'");
    expect(appConfig).toContain('supportsTablet: true');
  });

  it('allows local development without a hosted backend', () => {
    const result = verify({
      APP_VARIANT: 'development',
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'false',
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    });
    expect(result.status).toBe(0);
  });

  it('fails pilot builds when real backend values are absent', () => {
    const result = verify({
      APP_VARIANT: 'pilot',
      EXPO_PUBLIC_APP_ENV: 'staging',
      EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true',
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Toronto pilot builds require explicit valid Supabase');
  });

  it('fails production when the real-backend lock is disabled', () => {
    const result = verify({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'false',
      ...validSupabase,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('EXPO_PUBLIC_REQUIRE_REAL_BACKEND=true');
  });

  it('accepts explicit production Supabase configuration with the lock enabled', () => {
    const result = verify({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true',
      ...validSupabase,
    });
    expect(result.status).toBe(0);
  });

  it('binds EAS profiles to the correct environment and policy', () => {
    expect(eas.build.development).toMatchObject({environment: 'development', env: {APP_VARIANT: 'development', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'false'}});
    expect(eas.build['toronto-pilot']).toMatchObject({environment: 'preview', distribution: 'internal', env: {APP_VARIANT: 'pilot', EXPO_PUBLIC_APP_ENV: 'staging', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true'}});
    expect(eas.build.preview).toEqual({extends: 'toronto-pilot'});
    expect(eas.build.production).toMatchObject({environment: 'production', env: {APP_VARIANT: 'production', EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true'}});
  });
});
