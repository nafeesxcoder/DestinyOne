import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-pilot.yml', 'utf8');
const verifier = readFileSync('scripts/verify-supabase-deployment.mjs', 'utf8');

describe('Toronto pilot backend workflow', () => {
  it('is manual, environment-separated, and confirmation-gated', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("inputs.confirm == 'DEPLOY_TORONTO_PILOT'");
    expect(workflow).toContain('inputs.baseline_reviewed');
    expect(workflow).toContain("inputs.change_ticket != ''");
    expect(workflow).toContain('environment: toronto-pilot');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toContain('push:');
  });

  it('uses pilot-only secret names instead of production credentials', () => {
    for (const secret of [
      'PILOT_SUPABASE_ACCESS_TOKEN',
      'PILOT_SUPABASE_PROJECT_REF',
      'PILOT_SUPABASE_DB_PASSWORD',
      'PILOT_SUPABASE_SERVICE_ROLE_KEY',
      'PILOT_EXPO_PUBLIC_SUPABASE_URL',
      'PILOT_EXPO_PUBLIC_SUPABASE_ANON_KEY',
    ]) expect(workflow).toContain(`secrets.${secret}`);
  });

  it('dry-runs before apply, then lints, executes pgTAP, and verifies', () => {
    const dryRun = workflow.indexOf('supabase db push --dry-run');
    const apply = workflow.indexOf('supabase db push --include-all');
    const lint = workflow.indexOf('supabase db lint --linked');
    const pgTap = workflow.indexOf('supabase test db --linked');
    const verify = workflow.indexOf('pnpm supabase:verify');
    expect(dryRun).toBeGreaterThan(-1);
    expect(dryRun).toBeLessThan(apply);
    expect(apply).toBeLessThan(lint);
    expect(lint).toBeLessThan(pgTap);
    expect(pgTap).toBeLessThan(verify);
  });

  it('deploys every privileged function and uploads sanitized evidence', () => {
    for (const functionName of [
      'create-date-reservation-intent',
      'create-gift-order',
      'relationship-reminders',
      'marketplace-booking-webhook',
      'store-billing-webhook',
    ]) expect(workflow).toContain(`functions deploy ${functionName}`);
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('supabase-pilot-evidence.json');
    expect(verifier).toContain('--evidence-file=');
    expect(verifier).toContain('verified: !failed');
    const evidenceSummary = verifier.slice(verifier.indexOf('const summary = {'), verifier.indexOf('console.log(JSON.stringify(summary'));
    expect(evidenceSummary).not.toContain('serviceRoleKey');
    expect(evidenceSummary).not.toContain('anonKey');
    expect(evidenceSummary).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
