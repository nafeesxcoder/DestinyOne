import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const workflow = readFileSync('.github/workflows/mobile-production-build.yml', 'utf8');
const eas = JSON.parse(readFileSync('eas.json', 'utf8'));

describe('production mobile release-candidate workflow', () => {
  it('is manual, protected, and gated by explicit release evidence', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("inputs.confirm == 'BUILD_PRODUCTION_RC'");
    for (const gate of [
      'inputs.credentials_preconfigured',
      'inputs.legal_review_complete',
      'inputs.store_metadata_approved',
      'inputs.provider_evidence_reviewed',
      "inputs.device_qa_summary_ref != ''",
      "inputs.release_ticket != ''",
    ]) expect(workflow).toContain(gate);
    expect(workflow).toContain('environment: production-mobile');
    expect(workflow).not.toContain('push:');
    expect(workflow).not.toContain('pull_request:');
  });

  it('uses production-only configuration and signing references', () => {
    for (const value of [
      'secrets.PRODUCTION_EXPO_TOKEN',
      'vars.PRODUCTION_EAS_PROJECT_ID',
      'secrets.PRODUCTION_EXPO_PUBLIC_SUPABASE_URL',
      'secrets.PRODUCTION_EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'APP_VARIANT: production',
      'EXPO_PUBLIC_APP_ENV: production',
      "EXPO_PUBLIC_REQUIRE_REAL_BACKEND: 'true'",
    ]) expect(workflow).toContain(value);
    expect(workflow).not.toContain('PILOT_');
  });

  it('runs release, environment, and generated-native gates before the build request', () => {
    const release = workflow.indexOf('pnpm release:check');
    const environment = workflow.indexOf('pnpm mobile:build:verify');
    const prebuild = workflow.indexOf('expo prebuild --no-install --platform all');
    const native = workflow.indexOf('pnpm mobile:native:verify -- --variant=production');
    const build = workflow.indexOf('eas build --profile production');
    expect(release).toBeGreaterThan(-1);
    expect(release).toBeLessThan(environment);
    expect(environment).toBeLessThan(prebuild);
    expect(prebuild).toBeLessThan(native);
    expect(native).toBeLessThan(build);
  });

  it('creates a store-distribution RC but never auto-submits it', () => {
    expect(eas.build.production).toMatchObject({
      environment: 'production',
      distribution: 'store',
      autoIncrement: true,
    });
    expect(workflow).toContain('eas-production-rc-request.json');
    expect(workflow).toContain('production-rc-evidence.json');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).not.toContain('eas submit');
  });
});
