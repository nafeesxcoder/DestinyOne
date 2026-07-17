import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/018_monetization_entitlements_and_ledger.sql', 'utf8');
const webhook = readFileSync('supabase/functions/store-billing-webhook/index.ts', 'utf8');

describe('monetization operations backend security', () => {
  it('keeps products on compliant payment rails and blocks client entitlement writes', () => {
    expect(migration).toContain("product_class in ('membership','spark_pack','executive_membership') and platform in ('apple_iap','google_play')");
    expect(migration).toContain("product_class in ('physical_gift','date_reservation') and platform='real_world_processor'");
    expect(migration).toContain('revoke all on public.billing_products');
    expect(migration).not.toContain('grant insert on public.billing_entitlement');
  });

  it('processes provider events only as service role and stores hashed transaction identifiers', () => {
    expect(migration).toContain("auth.role()<>'service_role'");
    expect(migration).toContain('external_transaction_hash');
    expect(webhook).toContain('await sha256(event.transactionId)');
    expect(webhook).toContain("crypto.subtle.sign('HMAC'");
    expect(webhook).not.toContain('external_transaction_id');
  });

  it('makes entitlement events immutable and refund requests idempotent', () => {
    expect(migration).toContain("raise exception 'billing audit rows are immutable'");
    expect(migration).toContain('source_event_key text not null unique');
    expect(migration).toContain('unique(user_id,idempotency_key)');
    expect(migration).toContain('request_billing_refund');
  });

  it('rejects transaction ownership changes, invalid transitions and duplicate Spark grants', () => {
    expect(migration).toContain("existing.user_id<>p_user_id or existing.product_key<>p_product_key");
    expect(migration).toContain('billing_status_transition_allowed(prior_status,p_status)');
    expect(migration).toContain("product.product_class='spark_pack' and prior_status is not null then 0");
    expect(webhook).toContain("processed!==true");
  });
});
