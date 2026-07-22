import { describe, expect, it } from 'vitest';
import { buildMonetizationOperationsSnapshot, calculateUnitEconomics, canGrantEntitlement, canTransitionPurchase, commerceRailFor, previewEntitlementAllowed } from './monetizationOps';

describe('monetization operations', () => {
  it('keeps digital products on store billing and physical commerce on the processor rail', () => {
    expect(commerceRailFor('membership', 'ios')).toBe('apple_iap');
    expect(commerceRailFor('spark_pack', 'android')).toBe('google_play');
    expect(commerceRailFor('physical_gift', 'ios')).toBe('real_world_processor');
    expect(commerceRailFor('date_reservation', 'web')).toBe('real_world_processor');
  });

  it('permits only explicit purchase state transitions', () => {
    expect(canTransitionPurchase('pending_store', 'verified')).toBe(true);
    expect(canTransitionPurchase('active', 'grace_period')).toBe(true);
    expect(canTransitionPurchase('refunded', 'active')).toBe(false);
    expect(canTransitionPurchase('created', 'active')).toBe(false);
  });

  it('never grants a client-only or duplicate entitlement', () => {
    expect(canGrantEntitlement({ status: 'verified', serverVerified: true, transactionIdPresent: true, duplicateTransaction: false })).toBe(true);
    expect(canGrantEntitlement({ status: 'active', serverVerified: false, transactionIdPresent: true, duplicateTransaction: false })).toBe(false);
    expect(canGrantEntitlement({ status: 'verified', serverVerified: true, transactionIdPresent: true, duplicateTransaction: true })).toBe(false);
  });

  it('reports contribution margin after every material variable cost', () => {
    expect(calculateUnitEconomics({ grossRevenueCents: 10000, storeAndProcessorFeesCents: 1500, taxesCents: 500, refundsCents: 300, chargebacksCents: 200, marketplaceCostCents: 1000, supportCostCents: 500, acquisitionCostCents: 2500 })).toEqual({ deductionsCents: 4000, contributionMarginCents: 6000, contributionMarginPercent: 60, afterAcquisitionCents: 3500 });
  });

  it('keeps readiness at zero without real receipts even when source controls exist', () => {
    const snapshot = buildMonetizationOperationsSnapshot({
      environment: 'preview', liveReceiptCount: 0, verifiedReceiptCount: 0, activeEntitlementCount: 0,
      unresolvedRefundCount: 0, unresolvedChargebackCount: 0, appleProviderConnected: false,
      googleProviderConnected: false, realWorldProcessorConnected: false, webhookSignatureVerificationReady: true,
      immutableLedgerReady: true, restoreReady: true, gracePeriodReady: true, refundWorkflowReady: true,
      taxConfigurationReady: false, fraudReviewReady: true, financeReconciliationReady: false,
      unitEconomics: { grossRevenueCents: 0, storeAndProcessorFeesCents: 0, taxesCents: 0, refundsCents: 0, chargebacksCents: 0, marketplaceCostCents: 0, supportCostCents: 0, acquisitionCostCents: 0 },
    });
    expect(snapshot.status).toBe('Source model only');
    expect(snapshot.evidencePercent).toBe(0);
    expect(snapshot.liveReceiptCount).toBe(0);
  });

  it('forbids preview entitlement changes in production', () => {
    expect(previewEntitlementAllowed('preview')).toBe(true);
    expect(previewEntitlementAllowed('production')).toBe(false);
  });
});
