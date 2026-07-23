export type GiftFulfillmentLaunchStatus = 'Ready for live gift orders' | 'Final fulfillment partners pending' | 'Gift operations setup needed';

export type GiftFulfillmentGateId =
  | 'catalog_pricing'
  | 'recipient_consent'
  | 'provider_coverage'
  | 'payment_capture'
  | 'order_tracking'
  | 'privacy_safety'
  | 'support_refunds'
  | 'production_qa';

export type GiftFulfillmentReadinessInput = {
  appEnvironment: string;
  giftOrderingConfigured: boolean;
  catalogItemCount: number;
  cityCoverageCount: number;
  signedPartnerCount: number;
  hasServerOwnedPricing: boolean;
  hasRecipientConsentFlow: boolean;
  hasPrivateAddressHandling: boolean;
  hasProviderApi: boolean;
  hasCourierTracking: boolean;
  hasWebhookReconciliation: boolean;
  hasPaymentAuthorization: boolean;
  hasRefundPolicy: boolean;
  hasSupportSla: boolean;
  hasAbuseLimits: boolean;
  hasGiftNotificationFlow: boolean;
  hasPhysicalDeviceQa: boolean;
  productionLocked: boolean;
};

export type GiftFulfillmentGate = {
  id: GiftFulfillmentGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type GiftFulfillmentReadinessSnapshot = {
  status: GiftFulfillmentLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  catalogItemCount: number;
  providerCoverage: number;
  blockerCount: number;
  blockers: GiftFulfillmentGate[];
  gates: GiftFulfillmentGate[];
  nextBestStep: string;
};

function gateScore(gate: GiftFulfillmentGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildGiftFulfillmentReadinessSnapshot(input: GiftFulfillmentReadinessInput): GiftFulfillmentReadinessSnapshot {
  const catalogReady = input.catalogItemCount >= 10 && input.hasServerOwnedPricing;
  const consentReady = input.hasRecipientConsentFlow && input.hasPrivateAddressHandling;
  const providerCoverage = input.cityCoverageCount ? Math.round((input.signedPartnerCount / input.cityCoverageCount) * 100) : 0;
  const providerReady = input.giftOrderingConfigured && input.hasProviderApi && input.signedPartnerCount >= Math.min(5, input.cityCoverageCount || 5);
  const paymentReady = input.hasPaymentAuthorization && input.hasWebhookReconciliation;
  const trackingReady = input.hasCourierTracking && input.hasGiftNotificationFlow && input.hasWebhookReconciliation;
  const privacyReady = consentReady && input.hasAbuseLimits;
  const supportReady = input.hasRefundPolicy && input.hasSupportSla;
  const qaReady = input.hasPhysicalDeviceQa && input.productionLocked && input.appEnvironment === 'production';

  const gates: GiftFulfillmentGate[] = [
    {
      id: 'catalog_pricing',
      title: 'Gift catalog and server pricing',
      body: `${input.catalogItemCount} gift item(s) modeled. Pricing ${input.hasServerOwnedPricing ? 'server-owned' : 'still needs server authority'}.`,
      ready: catalogReady,
      started: input.catalogItemCount > 0,
      nextStep: 'Keep gift catalog, availability, taxes, fees and final totals server-owned before any real order.',
    },
    {
      id: 'recipient_consent',
      title: 'Recipient consent and hidden address',
      body: consentReady
        ? 'Recipient accepts privately and address never appears to sender.'
        : 'Physical gifts must collect recipient consent and address privately before payment capture.',
      ready: consentReady,
      started: input.hasRecipientConsentFlow || input.hasPrivateAddressHandling,
      nextStep: 'Build private recipient accept/decline flow with address tokenization and expiry.',
    },
    {
      id: 'provider_coverage',
      title: 'Fulfillment partner coverage',
      body: `${input.signedPartnerCount}/${input.cityCoverageCount || 5} launch-city partner coverage target · provider API ${input.hasProviderApi ? 'ready' : 'pending'}.`,
      ready: providerReady,
      started: input.hasProviderApi || input.signedPartnerCount > 0 || input.giftOrderingConfigured,
      nextStep: 'Choose DoorDash Drive, Uber Direct, florist/dessert APIs or local partners, then sign coverage for launch cities.',
    },
    {
      id: 'payment_capture',
      title: 'Payment authorization and capture',
      body: paymentReady
        ? 'Payment hold/capture is connected to consent and provider confirmation.'
        : 'Gift payments need authorize-after-consent and capture/refund webhooks, never client-owned totals.',
      ready: paymentReady,
      started: input.hasPaymentAuthorization,
      nextStep: 'Authorize payment only after recipient acceptance; capture only after provider confirmation and idempotent webhook.',
    },
    {
      id: 'order_tracking',
      title: 'Order tracking and notifications',
      body: trackingReady
        ? 'Tracking events can update chat and notifications.'
        : 'Orders need status webhooks for accepted, preparing, courier assigned, picked up, delivered, failed and refunded.',
      ready: trackingReady,
      started: input.hasCourierTracking || input.hasGiftNotificationFlow,
      nextStep: 'Wire provider webhooks into gift_order_events, chat metadata and safe notifications.',
    },
    {
      id: 'privacy_safety',
      title: 'Privacy and anti-abuse controls',
      body: privacyReady
        ? 'Address privacy, consent and anti-spam limits are represented.'
        : 'Gift orders need spam limits, block checks, report review and no pressure/quid-pro-quo behavior.',
      ready: privacyReady,
      started: input.hasAbuseLimits || consentReady,
      nextStep: 'Enforce block graph, purchase velocity limits, report holds and sender/recipient privacy rules.',
    },
    {
      id: 'support_refunds',
      title: 'Support, refunds and exceptions',
      body: supportReady
        ? 'Refund policy and support SLA are represented for failed or declined gifts.'
        : 'Real gifts need cancellation, declined-recipient, failed-courier, missing-item and chargeback support flows.',
      ready: supportReady,
      started: input.hasRefundPolicy || input.hasSupportSla,
      nextStep: 'Publish refund/cancellation policy and connect support queue to every order status.',
    },
    {
      id: 'production_qa',
      title: 'Production lock and device QA',
      body: qaReady
        ? 'Live gift flow is locked to production providers and tested on devices.'
        : 'Preview gift flow must stay visibly demo until provider, webhooks, payments and device QA pass.',
      ready: qaReady,
      started: input.productionLocked || input.hasPhysicalDeviceQa,
      nextStep: 'Run end-to-end gift tests on iOS/Android: accept, decline, timeout, capture, delivery, failure and refund.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: GiftFulfillmentGateId[] = ['catalog_pricing', 'recipient_consent', 'privacy_safety', 'support_refunds'];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for live gift orders' : hasSetupBlocker ? 'Gift operations setup needed' : 'Final fulfillment partners pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    catalogItemCount: input.catalogItemCount,
    providerCoverage,
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run live gift smoke tests with provider sandbox, payment webhooks, support exceptions and address privacy checks.',
  };
}
