import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = readFileSync('supabase/config.toml', 'utf8');
const migration = readFileSync('supabase/migrations/021_auth_profile_media_hardening.sql', 'utf8');
const preflight = readFileSync('scripts/preflight-supabase-production.mjs', 'utf8');
const verifier = readFileSync('scripts/verify-supabase-deployment.mjs', 'utf8');
const eas = readFileSync('eas.json', 'utf8');

describe('Auth and profile production gate', () => {
  it('disables unsafe identity features and uses bounded OTP settings', () => {
    expect(config).toContain('enable_anonymous_sign_ins = false');
    expect(config).toContain('enable_manual_linking = false');
    expect(config).toContain('minimum_password_length = 10');
    expect(config).toContain('password_requirements = "lower_upper_letters_digits"');
    expect(config).toContain('secure_password_change = true');
    expect(config).toContain('max_frequency = "30s"');
    expect(config).toContain('otp_expiry = 600');
    expect(config).toContain('"destinyone://auth/callback"');
  });

  it('enforces private media limits, allowlists, owner folders, and media kinds in SQL', () => {
    expect(migration).toContain('file_size_limit = 10485760');
    expect(migration).toContain('file_size_limit = 15728640');
    expect(migration).toContain('allowed_mime_types = array[');
    expect(migration).toContain("owner_id = (select auth.uid())::text");
    expect(migration).toContain("(storage.foldername(name))[2] in ('photo', 'voice', 'verification')");
    expect(migration).toContain("lower(coalesce(metadata->>'mimetype', ''))");
  });

  it('makes Auth hardening part of source preflight and real-backend release profiles', () => {
    expect(preflight).toContain('requiredAuthContracts');
    expect(preflight).toContain('Missing production Auth config contract');
    expect(verifier).toContain("auth?.external?.email === true ? null : 'email'");
    expect(verifier).toContain("auth?.external?.phone === true ? null : 'phone'");
    expect(verifier).toContain("null : 'sms_provider'");
    expect(verifier).toContain('missingAuthProviders.length > 0');
    const releaseConfig = JSON.parse(eas) as { build: Record<string, { env?: Record<string, string> }> };
    expect(releaseConfig.build['toronto-pilot']?.env?.EXPO_PUBLIC_REQUIRE_REAL_BACKEND).toBe('true');
    expect(releaseConfig.build.production?.env?.EXPO_PUBLIC_REQUIRE_REAL_BACKEND).toBe('true');
  });
});
