import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/029_monetization_operations_control_plane.sql', 'utf8');
const webhook = readFileSync('supabase/functions/store-billing-webhook/index.ts', 'utf8');

describe('monetization operations control plane', () => {
  it('requires immutable verified catalog evidence before product activation', () => {
    expect(migration).toContain('billing_catalog_versions_immutable');
    expect(migration).toContain('Approved store catalog evidence is required before product activation');
    expect(migration).toContain('verified store product unavailable');
  });

  it('supports renewal ownership without a client purchase session', () => {
    expect(webhook).toContain('event.purchaseSessionId||event.originalTransactionId');
    expect(migration).toContain("external_transaction_hash=p_original_transaction_hash or original_transaction_hash=p_original_transaction_hash");
  });

  it('binds provider verification, price, currency and environment to the receipt', () => {
    for (const field of ['p_external_product_id','p_amount_cents','p_currency','p_environment','p_verification_source','p_provider_signed_at']) expect(webhook).toContain(field);
    expect(migration).toContain("verification_source is null or verification_source in('apple_server_api','google_play_api')");
  });

  it('keeps failed events retryable and bounds entitlement reversal', () => {
    expect(migration).toContain('retry_count=retry_count+1');
    expect(migration).toContain('processed_at=null');
    expect(migration).toContain("product.product_class in('membership','executive_membership') then -greatest(coalesce(snapshot.units,0),0)");
  });

  it('has auditable restore, refund, finance and reconciliation operations', () => {
    for (const name of ['complete_store_restore','review_billing_refund','record_billing_finance_snapshot','reconcile_billing_operations','resolve_billing_reconciliation_case']) expect(migration).toContain(`function public.${name}`);
    expect(migration).toContain('resolution_idempotency_key');
  });

  it('forbids charging for safety and privacy capabilities', () => {
    for (const capability of ['safety','report','block','unmatch','emergency','privacy','verification','deletion']) expect(migration).toContain(capability);
    expect(migration).toContain('Safety and privacy capabilities cannot be paid entitlements');
  });
});
