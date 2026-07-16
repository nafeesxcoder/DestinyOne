import { describe, expect, it } from 'vitest';
import { buildGiftFulfillmentReadinessSnapshot, type GiftFulfillmentReadinessInput } from './giftFulfillmentReadiness';

const readyInput: GiftFulfillmentReadinessInput = {
  appEnvironment: 'production',
  giftOrderingConfigured: true,
  catalogItemCount: 12,
  cityCoverageCount: 5,
  signedPartnerCount: 5,
  hasServerOwnedPricing: true,
  hasRecipientConsentFlow: true,
  hasPrivateAddressHandling: true,
  hasProviderApi: true,
  hasCourierTracking: true,
  hasWebhookReconciliation: true,
  hasPaymentAuthorization: true,
  hasRefundPolicy: true,
  hasSupportSla: true,
  hasAbuseLimits: true,
  hasGiftNotificationFlow: true,
  hasPhysicalDeviceQa: true,
  productionLocked: true,
};

describe('gift fulfillment readiness', () => {
  it('does not treat demo gift ordering as ready for real fulfillment', () => {
    const snapshot = buildGiftFulfillmentReadinessSnapshot({
      ...readyInput,
      appEnvironment: 'preview',
      giftOrderingConfigured: false,
      hasProviderApi: false,
      signedPartnerCount: 0,
      hasWebhookReconciliation: false,
      hasPhysicalDeviceQa: false,
      productionLocked: false,
    });

    expect(snapshot.status).toBe('Final fulfillment partners pending');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'provider_coverage',
      'payment_capture',
      'order_tracking',
      'production_qa',
    ]));
  });

  it('blocks launch when consent/privacy and support policy are incomplete', () => {
    const snapshot = buildGiftFulfillmentReadinessSnapshot({
      ...readyInput,
      hasRecipientConsentFlow: false,
      hasPrivateAddressHandling: false,
      hasRefundPolicy: false,
      hasSupportSla: false,
      hasAbuseLimits: false,
    });

    expect(snapshot.status).toBe('Gift operations setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'recipient_consent',
      'privacy_safety',
      'support_refunds',
    ]));
  });

  it('passes when catalog, consent, provider, payment, tracking and QA are ready', () => {
    const snapshot = buildGiftFulfillmentReadinessSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for live gift orders');
    expect(snapshot.score).toBe(100);
    expect(snapshot.providerCoverage).toBe(100);
    expect(snapshot.blockers).toHaveLength(0);
  });
});
