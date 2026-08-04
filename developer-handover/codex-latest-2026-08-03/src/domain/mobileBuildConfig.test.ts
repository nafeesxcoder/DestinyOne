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
const validEasProjectId = '123e4567-e89b-42d3-a456-426614174000';

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
      EAS_PROJECT_ID: '',
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
      EAS_PROJECT_ID: validEasProjectId,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Toronto pilot builds require explicit valid Supabase');
  });

  it('fails production when the real-backend lock is disabled', () => {
    const result = verify({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'false',
      EAS_PROJECT_ID: validEasProjectId,
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
      EAS_PROJECT_ID: validEasProjectId,
      ...validSupabase,
    });
    expect(result.status).toBe(0);
  });

  it('fails non-interactive pilot and production builds without an EAS project link', () => {
    for (const [variant, appEnvironment] of [['pilot', 'staging'], ['production', 'production']] as const) {
      const result = verify({
        APP_VARIANT: variant,
        EXPO_PUBLIC_APP_ENV: appEnvironment,
        EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true',
        EAS_PROJECT_ID: '',
        ...validSupabase,
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('linked EAS_PROJECT_ID UUID');
    }
  });

  it('resolves tablet rotation, project linkage, and isolated Apple Pay identities', () => {
    const cli = 'node_modules/expo/bin/cli';
    const resolved = (variant: 'development' | 'pilot' | 'production', appEnvironment: string) => {
      const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
        env: {
          ...process.env,
          APP_VARIANT: variant,
          EAS_PROJECT_ID: validEasProjectId,
          EXPO_PUBLIC_APP_ENV: appEnvironment,
        },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      return JSON.parse(result.stdout);
    };
    const development = resolved('development', 'development');
    const pilot = resolved('pilot', 'staging');
    const production = resolved('production', 'production');
    expect(pilot.orientation).toBe('default');
    expect(pilot.ios.supportsTablet).toBe(true);
    expect(pilot.extra.eas.projectId).toBe(validEasProjectId);
    const merchantId = (config: Record<string, any>) => config.plugins
      .find((plugin: unknown[]) => plugin[0] === '@stripe/stripe-react-native')[1].merchantIdentifier;
    expect(merchantId(development)).toBe('merchant.com.destinyone.app.dev');
    expect(merchantId(pilot)).toBe('merchant.com.destinyone.app.pilot');
    expect(merchantId(production)).toBe('merchant.com.destinyone.app');
  });

  it('binds EAS profiles to the correct environment and policy', () => {
    expect(eas.build.development).toMatchObject({environment: 'development', env: {APP_VARIANT: 'development', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'false'}});
    expect(eas.build['toronto-pilot']).toMatchObject({environment: 'preview', distribution: 'internal', env: {APP_VARIANT: 'pilot', EXPO_PUBLIC_APP_ENV: 'staging', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true'}});
    expect(eas.build.preview).toEqual({extends: 'toronto-pilot'});
    expect(eas.build.production).toMatchObject({environment: 'production', env: {APP_VARIANT: 'production', EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true'}});
  });
});
