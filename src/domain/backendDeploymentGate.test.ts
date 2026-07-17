import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-production.yml', 'utf8');
const preflight = readFileSync('scripts/preflight-supabase-production.mjs', 'utf8');
const verifier = readFileSync('scripts/verify-supabase-deployment.mjs', 'utf8');
const contract = readFileSync('scripts/supabase-deployment-contract.mjs', 'utf8');

describe('hosted backend deployment gate', () => {
  it('requires a manual production deployment and reviewed legacy baseline', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("inputs.confirm == 'DEPLOY' && inputs.baseline_reviewed");
    expect(workflow).toContain('environment: production');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toContain('push:');
  });

  it('runs validation and a dry run before changing the hosted database', () => {
    expect(workflow.indexOf('pnpm backend:preflight --remote')).toBeLessThan(workflow.indexOf('Apply reviewed migrations'));
    expect(workflow.indexOf('supabase db push --dry-run')).toBeLessThan(workflow.indexOf('supabase db push --include-all'));
    expect(workflow.indexOf('Apply reviewed migrations')).toBeLessThan(workflow.indexOf('pnpm supabase:verify'));
  });

  it('requires remote credentials without putting service-role secrets in Expo', () => {
    expect(preflight).toContain("'SUPABASE_ACCESS_TOKEN'");
    expect(preflight).toContain("'SUPABASE_DB_PASSWORD'");
    expect(preflight).toContain("'SUPABASE_SERVICE_ROLE_KEY'");
    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(preflight).toContain("process.env.SUPABASE_BASELINE_APPROVED === 'true'");
    expect(preflight).toContain('EXPO_PUBLIC_(?:SUPABASE_)?SERVICE_ROLE');
  });

  it('fails verification for missing objects, anonymous exposure, or unhealthy endpoints', () => {
    expect(verifier).toContain('missingTables.length > 0');
    expect(verifier).toContain('missingRpcs.length > 0');
    expect(verifier).toContain('requiredTablesWithoutRls.length > 0');
    expect(verifier).toContain('anonymousTableExposures.length > 0');
    expect(verifier).toContain('anonymousRpcExposures.length > 0');
    expect(verifier).toContain('unhealthyTableEndpoints.length > 0');
    expect(verifier).toContain('missingAuthProviders.length > 0');
  });

  it('uses the same complete versioned inventory for source and hosted verification', () => {
    expect(preflight).toContain("import { deploymentContract } from './supabase-deployment-contract.mjs'");
    expect(verifier).toContain("import { deploymentContract } from './supabase-deployment-contract.mjs'");
    expect(preflight).toContain('for (const table of deploymentContract.tables)');
    expect(preflight).toContain('for (const rpc of deploymentContract.rpcs)');
    expect(contract).toContain("id: 'destinyone-backend-v29'");
    expect(contract).toContain('schemaVersion: 29');
  });

  it('deploys every privileged Edge Function before hosted verification', () => {
    for (const functionName of [
      'create-date-reservation-intent',
      'create-gift-order',
      'relationship-reminders',
      'marketplace-booking-webhook',
      'store-billing-webhook',
    ]) expect(workflow).toContain(`functions deploy ${functionName}`);
  });

  it('lints, executes database security tests, and preserves commit-linked evidence', () => {
    expect(workflow).toContain('supabase db lint --linked');
    expect(workflow).toContain('supabase test db --linked');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('supabase-production-evidence-${{ github.sha }}');
    expect(workflow).toContain('supabase-production-evidence.json');
  });
});
