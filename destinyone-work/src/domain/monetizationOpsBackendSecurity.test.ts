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
    expect(migration).toContain("existing.user_id<>resolved_user_id or existing.product_key<>resolved_product_key");
    expect(migration).toContain('billing_status_transition_allowed(prior_status,p_status)');
    expect(migration).toContain("product.product_class='spark_pack' and prior_status is not null then 0");
    expect(webhook).toContain("processed!==true");
  });

  it('derives member and product from a server-created purchase session', () => {
    expect(migration).toContain('create table if not exists public.billing_purchase_sessions');
    expect(migration).toContain('create or replace function public.prepare_store_purchase');
    expect(migration).toContain('resolved_user_id:=purchase_session.user_id');
    expect(migration).toContain('resolved_product_key:=purchase_session.product_key');
    expect(webhook).toContain('purchaseSessionId');
    expect(webhook).not.toContain('event.userId');
    expect(webhook).not.toContain('event.productKey');
  });

  it('uses server catalog units for grants and consumes the Spark wallet through an idempotent RPC', () => {
    expect(migration).toContain("when p_status in ('verified','active') then product.units");
    expect(migration).toContain('create or replace function public.consume_billing_entitlement');
    expect(migration).toContain("p_entitlement_key<>'spark_wallet'");
    expect(migration).toContain("source_key:='member-consume:'");
    expect(migration).toContain("snapshot.units<p_units");
  });

  it('atomically applies the daily free Spark or paid wallet debit before recording interest', () => {
    expect(migration).toContain('create table if not exists public.golden_spark_sends');
    expect(migration).toContain('golden_spark_one_free_daily_idx');
    expect(migration).toContain('create or replace function public.send_golden_spark');
    expect(migration).toContain("public.consume_billing_entitlement('spark_wallet',1");
    expect(migration).toContain("public.submit_match_decision(p_recipient_id,'interested')");
  });
});
