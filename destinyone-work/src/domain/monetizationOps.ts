export type CommerceRail = 'apple_iap' | 'google_play' | 'real_world_processor';

export type PurchaseLifecycleStatus =
  | 'created'
  | 'pending_store'
  | 'verified'
  | 'active'
  | 'grace_period'
  | 'billing_retry'
  | 'expired'
  | 'partially_refunded'
  | 'refunded'
  | 'chargeback'
  | 'revoked';

export type MonetizationProductClass =
  | 'membership'
  | 'spark_pack'
  | 'executive_membership'
  | 'physical_gift'
  | 'date_reservation';

export type UnitEconomicsInput = {
  grossRevenueCents: number;
  storeAndProcessorFeesCents: number;
  taxesCents: number;
  refundsCents: number;
  chargebacksCents: number;
  marketplaceCostCents: number;
  supportCostCents: number;
  acquisitionCostCents: number;
};

export type MonetizationOperationsInput = {
  environment: string;
  liveReceiptCount: number;
  verifiedReceiptCount: number;
  activeEntitlementCount: number;
  unresolvedRefundCount: number;
  unresolvedChargebackCount: number;
  appleProviderConnected: boolean;
  googleProviderConnected: boolean;
  realWorldProcessorConnected: boolean;
  webhookSignatureVerificationReady: boolean;
  immutableLedgerReady: boolean;
  restoreReady: boolean;
  gracePeriodReady: boolean;
  refundWorkflowReady: boolean;
  taxConfigurationReady: boolean;
  fraudReviewReady: boolean;
  financeReconciliationReady: boolean;
  catalogVerificationReady: boolean;
  renewalOwnershipReady: boolean;
  restoreSessionReady: boolean;
  boundedReversalReady: boolean;
  refundAuditReady: boolean;
  financeProvenanceReady: boolean;
  protectedFreeCapabilitiesReady: boolean;
  unitEconomics: UnitEconomicsInput;
};

export type MonetizationOperationsSnapshot = {
  status: 'Source model only' | 'Provider validation pending' | 'Ready for controlled billing pilot';
  evidencePercent: number;
  liveReceiptCount: number;
  verifiedReceiptRate: number;
  contributionMarginCents: number;
  contributionMarginPercent: number;
  blockers: string[];
  nextBestStep: string;
  sourceControlScore: number;
  sourceControlReady: number;
  sourceControlTotal: number;
};

const transitions: Record<PurchaseLifecycleStatus, readonly PurchaseLifecycleStatus[]> = {
  created: ['pending_store', 'revoked'],
  pending_store: ['verified', 'revoked'],
  verified: ['active', 'revoked'],
  active: ['grace_period', 'billing_retry', 'expired', 'partially_refunded', 'refunded', 'chargeback', 'revoked'],
  grace_period: ['active', 'billing_retry', 'expired', 'refunded', 'chargeback', 'revoked'],
  billing_retry: ['active', 'grace_period', 'expired', 'refunded', 'chargeback', 'revoked'],
  partially_refunded: ['active', 'refunded', 'chargeback', 'revoked'],
  expired: ['active', 'refunded', 'chargeback', 'revoked'],
  refunded: [],
  chargeback: ['revoked'],
  revoked: [],
};

export function commerceRailFor(productClass: MonetizationProductClass, platform: 'ios' | 'android' | 'web'): CommerceRail {
  if (productClass === 'physical_gift' || productClass === 'date_reservation') return 'real_world_processor';
  return platform === 'ios' ? 'apple_iap' : 'google_play';
}

export function canTransitionPurchase(from: PurchaseLifecycleStatus, to: PurchaseLifecycleStatus) {
  return transitions[from].includes(to);
}

export function canGrantEntitlement(input: {
  status: PurchaseLifecycleStatus;
  serverVerified: boolean;
  transactionIdPresent: boolean;
  duplicateTransaction: boolean;
}) {
  return input.serverVerified && input.transactionIdPresent && !input.duplicateTransaction && ['verified', 'active', 'grace_period'].includes(input.status);
}

export function calculateUnitEconomics(input: UnitEconomicsInput) {
  const deductions = input.storeAndProcessorFeesCents + input.taxesCents + input.refundsCents + input.chargebacksCents + input.marketplaceCostCents + input.supportCostCents;
  const contributionMarginCents = input.grossRevenueCents - deductions;
  const contributionMarginPercent = input.grossRevenueCents > 0 ? Math.round((contributionMarginCents / input.grossRevenueCents) * 100) : 0;
  const afterAcquisitionCents = contributionMarginCents - input.acquisitionCostCents;
  return { deductionsCents: deductions, contributionMarginCents, contributionMarginPercent, afterAcquisitionCents };
}

export function buildMonetizationOperationsSnapshot(input: MonetizationOperationsInput): MonetizationOperationsSnapshot {
  const economics = calculateUnitEconomics(input.unitEconomics);
  const blockers: string[] = [];
  if (!input.appleProviderConnected) blockers.push('Apple receipt provider');
  if (!input.googleProviderConnected) blockers.push('Google receipt provider');
  if (!input.realWorldProcessorConnected) blockers.push('Real-world payment processor');
  if (!input.webhookSignatureVerificationReady) blockers.push('Signed webhook verification');
  if (!input.immutableLedgerReady) blockers.push('Immutable entitlement ledger');
  if (!input.restoreReady || !input.gracePeriodReady) blockers.push('Restore and billing recovery');
  if (!input.refundWorkflowReady || !input.fraudReviewReady) blockers.push('Refund, chargeback and fraud operations');
  if (!input.taxConfigurationReady || !input.financeReconciliationReady) blockers.push('Tax and finance reconciliation');

  const sourceControls = [input.webhookSignatureVerificationReady,input.immutableLedgerReady,input.restoreReady,input.gracePeriodReady,input.refundWorkflowReady,input.fraudReviewReady,input.catalogVerificationReady,input.renewalOwnershipReady,input.restoreSessionReady,input.boundedReversalReady,input.refundAuditReady,input.financeProvenanceReady,input.protectedFreeCapabilitiesReady];
  const sourceControlReady = sourceControls.filter(Boolean).length;
  const sourceControlScore = Math.round((sourceControlReady/sourceControls.length)*10);

  const verifiedReceiptRate = input.liveReceiptCount > 0 ? Math.round((input.verifiedReceiptCount / input.liveReceiptCount) * 100) : 0;
  const liveEvidence = input.liveReceiptCount > 0 && input.verifiedReceiptCount > 0;
  const ready = blockers.length === 0 && liveEvidence && input.unresolvedChargebackCount === 0;
  return {
    status: ready ? 'Ready for controlled billing pilot' : liveEvidence ? 'Provider validation pending' : 'Source model only',
    evidencePercent: liveEvidence ? Math.min(99, Math.round(((8 - blockers.length) / 8) * 100)) : 0,
    liveReceiptCount: input.liveReceiptCount,
    verifiedReceiptRate,
    contributionMarginCents: economics.contributionMarginCents,
    contributionMarginPercent: economics.contributionMarginPercent,
    blockers,
    nextBestStep: blockers[0] ? `Connect and validate: ${blockers[0]}.` : 'Run controlled iOS and Android purchase, renewal, restore, refund and chargeback tests.',
    sourceControlScore,
    sourceControlReady,
    sourceControlTotal: sourceControls.length,
  };
}

export function previewEntitlementAllowed(environment: string) {
  return environment !== 'production';
}
