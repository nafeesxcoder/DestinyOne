import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const edge = readFileSync('supabase/functions/verify-store-purchase/index.ts', 'utf8');
const hook = readFileSync('src/hooks/useStoreBilling.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260803225305_billing_launch_analytics.sql', 'utf8');
const environment = readFileSync('.env.example', 'utf8');

describe('billing and launch analytics production boundary', () => {
  it('finishes native transactions only after server receipt verification', () => {
    expect(hook.indexOf('await verifyStorePurchase')).toBeGreaterThan(-1);
    expect(hook.indexOf('await finishTransaction')).toBeGreaterThan(hook.indexOf('await verifyStorePurchase'));
    expect(edge).toContain('finishedTransactionAllowed:true');
    expect(edge).toContain('process_billing_webhook');
  });

  it('stores receipt evidence as hashes and keeps verifier secrets server-only', () => {
    expect(edge).toContain('purchase_token_hash:tokenHash');
    expect(edge).not.toContain('purchase_token:input.purchaseToken');
    expect(environment).toContain('STORE_PURCHASE_VERIFIER_SECRET=');
    expect(environment).not.toContain('EXPO_PUBLIC_STORE_PURCHASE_VERIFIER');
  });

  it('keeps launch analytics consented, allowlisted, and private by default', () => {
    expect(migration).toContain('analytics_consent');
    expect(migration).toContain('allowed_events text[]');
    expect(migration).toContain('allowed_keys text[]');
    expect(migration).toContain('revoke all on public.billing_verification_attempts,public.launch_analytics_sessions,public.launch_analytics_events');
    expect(migration).toContain('grant execute on function public.get_launch_analytics_snapshot(timestamptz) to service_role');
  });
});
