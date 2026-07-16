export type BillingCycle = 'monthly' | 'annual';
export type MembershipPlanId = 'base' | 'plus' | 'elite';
export type ProductKind = 'membership' | 'spark_pack' | 'executive_application';
export type PaymentEntitlementStatus = 'Ready for paid launch' | 'Final payment providers pending' | 'Billing setup needed';
export type PaymentEntitlementGateId =
  | 'product_catalog'
  | 'checkout_surface'
  | 'store_products'
  | 'receipt_verification'
  | 'entitlement_limits'
  | 'restore_disclosure'
  | 'real_world_payments'
  | 'refund_safety_ops'
  | 'production_lock';

export type MembershipPlan = {
  id: MembershipPlanId;
  name: 'Base' | 'Plus' | 'Elite';
  tag: string;
  forLabel: string;
  monthlyCents: number;
  annualCents: number;
  dailyMatches: number;
  weeklyBonusSparks: number;
  features: string[];
  cta: string;
  recommended?: boolean;
};

export type ExecutivePlan = {
  id: 'executive';
  name: 'Executive Circle';
  tag: string;
  priceCents: number;
  period: '/ year';
  forLabel: string;
  features: string[];
  cta: string;
  approvalRequired: true;
};

export type SparkPack = {
  id: 'spark_5' | 'spark_15' | 'spark_40';
  name: string;
  sparks: number;
  priceCents: number;
  tag: string;
  bestValue?: boolean;
};

export type PaymentEntitlementInput = {
  billingMode: 'preview' | 'store' | 'missing' | string;
  appEnvironment: string;
  paymentsConfigured: boolean;
  membershipPlanCount: number;
  sparkPackCount: number;
  hasExecutivePlan: boolean;
  checkoutPreviewReady: boolean;
  storeProductIdsReady: boolean;
  receiptVerificationReady: boolean;
  restorePurchaseReady: boolean;
  entitlementLedgerReady: boolean;
  featureLimitsReady: boolean;
  subscriptionCopyReady: boolean;
  appleGoogleDisclosureReady: boolean;
  stripeReservationReady: boolean;
  webhookReconciliationReady: boolean;
  refundSupportReady: boolean;
  abuseControlsReady: boolean;
  productionBillingLocked: boolean;
};

export type PaymentEntitlementGate = {
  id: PaymentEntitlementGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type PaymentEntitlementSnapshot = {
  status: PaymentEntitlementStatus;
  score: number;
  readyCount: number;
  total: number;
  paidProductCount: number;
  blockerCount: number;
  blockers: PaymentEntitlementGate[];
  gates: PaymentEntitlementGate[];
  nextBestStep: string;
};

export const membershipPlans: readonly MembershipPlan[] = [
  {
    id: 'base',
    name: 'Base',
    monthlyCents: 3900,
    annualCents: 39000,
    tag: 'Serious start',
    forLabel: 'For intentional singles starting with fewer, better matches.',
    dailyMatches: 3,
    weeklyBonusSparks: 0,
    features: ['3 curated matches/day', 'Basic chat after mutual match', 'Location and religion filters', '1 Golden Spark/day', 'Safety center access'],
    cta: 'Choose Base',
  },
  {
    id: 'plus',
    name: 'Plus',
    monthlyCents: 6900,
    annualCents: 69000,
    tag: 'Recommended',
    forLabel: 'For members who want more visibility without casual swipe noise.',
    dailyMatches: 7,
    weeklyBonusSparks: 0,
    features: ['7 curated matches/day', 'See who liked you', 'Advanced serious filters', 'Voice intro access', 'Priority Spark animation'],
    cta: 'Choose Plus',
    recommended: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyCents: 9900,
    annualCents: 99000,
    tag: 'High intent',
    forLabel: 'For people who want stronger curation, privacy and premium tools.',
    dailyMatches: 12,
    weeklyBonusSparks: 5,
    features: ['12 handpicked matches/day', 'Elite visibility boost', 'Concierge date ideas', 'Unlimited voice intros', '5 bonus Sparks/week'],
    cta: 'Choose Elite',
  },
] as const;

export const executivePlan: ExecutivePlan = {
  id: 'executive',
  name: 'Executive Circle',
  priceCents: 500000,
  period: '/ year',
  tag: 'Invite-only',
  forLabel: 'For founders, business owners and senior professionals who want private matchmaking.',
  features: ['Private application review', 'Business/profile verification', 'Handpicked weekly introductions', 'Executive privacy mode', 'VIP concierge and date planning', 'Priority safety support'],
  cta: 'Apply for Executive Circle',
  approvalRequired: true,
} as const;

export const sparkPacks: readonly SparkPack[] = [
  { id: 'spark_5', name: 'Starter Spark Pack', sparks: 5, priceCents: 799, tag: 'Quick boost' },
  { id: 'spark_15', name: 'Social Weekend Pack', sparks: 15, priceCents: 1999, tag: 'Popular', bestValue: true },
  { id: 'spark_40', name: 'Intentional Month Pack', sparks: 40, priceCents: 4499, tag: 'Best value' },
] as const;

export function formatMoney(cents: number) {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function membershipPriceCents(plan: MembershipPlan, billing: BillingCycle) {
  return billing === 'annual' ? plan.annualCents : plan.monthlyCents;
}

export function membershipPriceLabel(plan: MembershipPlan, billing: BillingCycle) {
  return formatMoney(membershipPriceCents(plan, billing));
}

export function billingPeriodLabel(billing: BillingCycle) {
  return billing === 'annual' ? '/ year' : '/ month';
}

export function annualSavingsCents(plan: MembershipPlan) {
  return Math.max(0, plan.monthlyCents * 12 - plan.annualCents);
}

export function annualSavingsLabel(plan: MembershipPlan) {
  const savings = annualSavingsCents(plan);
  return savings ? `Save ${formatMoney(savings)}` : 'Annual value';
}

export function membershipEntitlementSummary(plan: MembershipPlan) {
  return [
    `${plan.dailyMatches} curated matches/day`,
    plan.id === 'base' ? 'Basic filters' : 'Advanced filters',
    plan.id === 'plus' || plan.id === 'elite' ? 'Likes visibility' : 'Mutual chat',
    plan.weeklyBonusSparks ? `${plan.weeklyBonusSparks} bonus Sparks/week` : '1 free Spark/day',
  ];
}

export function sparkUnitPriceCents(pack: SparkPack) {
  return Math.round(pack.priceCents / pack.sparks);
}

export function checkoutSteps(kind: ProductKind, approvalRequired = false) {
  if (kind === 'executive_application' || approvalRequired) return ['Apply', 'Verify', 'Approve', 'Bill yearly'];
  if (kind === 'spark_pack') return ['Select', 'Store billing', 'Add Sparks', 'Restore anytime'];
  return ['Select', 'Store billing', 'Unlock', 'Restore anytime'];
}

export function buildRestorePreview(activeProductNames: string[]) {
  if (activeProductNames.length === 0) {
    return 'No previous purchases found in this preview. Production will ask Apple/Google for receipts.';
  }
  return `Restore ready: ${activeProductNames.join(', ')}. Production validates receipts before unlocking.`;
}

export function isStoreCompliantProduct(kind: ProductKind) {
  return kind === 'membership' || kind === 'spark_pack' || kind === 'executive_application';
}

function gateScore(gate: PaymentEntitlementGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildPaymentEntitlementSnapshot(input: PaymentEntitlementInput): PaymentEntitlementSnapshot {
  const catalogReady = input.membershipPlanCount >= 3 && input.sparkPackCount >= 3 && input.hasExecutivePlan;
  const checkoutReady = input.checkoutPreviewReady && input.subscriptionCopyReady;
  const storeProductsReady = input.storeProductIdsReady && input.appleGoogleDisclosureReady;
  const receiptReady = storeProductsReady && input.receiptVerificationReady;
  const entitlementReady = input.entitlementLedgerReady && input.featureLimitsReady;
  const restoreReady = input.restorePurchaseReady && input.subscriptionCopyReady;
  const realWorldReady = input.stripeReservationReady && input.webhookReconciliationReady;
  const safetyReady = input.refundSupportReady && input.abuseControlsReady;
  const productionReady = input.productionBillingLocked && storeProductsReady && receiptReady;

  const gates: PaymentEntitlementGate[] = [
    {
      id: 'product_catalog',
      title: 'Paid product catalog',
      body: `${input.membershipPlanCount} membership plan(s), ${input.sparkPackCount} Spark pack(s), Executive Circle ${input.hasExecutivePlan ? 'present' : 'missing'}.`,
      ready: catalogReady,
      started: input.membershipPlanCount > 0 || input.sparkPackCount > 0,
      nextStep: 'Keep product names, prices, durations and feature promises consistent with App Store / Play Console products.',
    },
    {
      id: 'checkout_surface',
      title: 'Checkout surfaces',
      body: checkoutReady
        ? 'Membership, Spark pack and Executive application checkout previews are reachable with clear renewal copy.'
        : 'Paid flows must show price, billing period, renewal, restore and cancellation copy before purchase.',
      ready: checkoutReady,
      started: input.checkoutPreviewReady,
      nextStep: 'Finish the checkout preview and add final store-approved renewal/cancellation language.',
    },
    {
      id: 'store_products',
      title: 'Apple / Google products',
      body: storeProductsReady
        ? 'App Store and Google Play product IDs are mapped to in-app entitlements.'
        : 'Store product IDs are not final yet. The app must not unlock paid features from client-only state.',
      ready: storeProductsReady,
      started: input.appleGoogleDisclosureReady,
      nextStep: 'Create App Store / Play Console products for plans and Spark packs, then map exact product IDs in the app/backend.',
    },
    {
      id: 'receipt_verification',
      title: 'Server receipt verification',
      body: receiptReady
        ? 'Receipts are verified server-side before membership, Sparks or Executive access unlock.'
        : 'Production must validate Apple/Google receipts on the server and never trust client balances.',
      ready: receiptReady,
      started: input.receiptVerificationReady,
      nextStep: 'Add server receipt verification, idempotency keys and entitlement webhooks before real payments.',
    },
    {
      id: 'entitlement_limits',
      title: 'Entitlement and limits',
      body: entitlementReady
        ? 'Daily matches, likes visibility, filters, Spark wallet and abuse limits are modeled as entitlements.'
        : 'Feature access needs a single entitlement ledger so paid benefits cannot be bypassed.',
      ready: entitlementReady,
      started: input.entitlementLedgerReady,
      nextStep: 'Persist plan, expiry, Spark balance, daily free Spark usage and feature gates in the backend.',
    },
    {
      id: 'restore_disclosure',
      title: 'Restore, cancel and disclosure',
      body: restoreReady
        ? 'Restore purchase path and subscription disclosure copy are represented.'
        : 'Users need a clear restore path, cancellation language and refund support entry point.',
      ready: restoreReady,
      started: input.restorePurchaseReady || input.subscriptionCopyReady,
      nextStep: 'Verify restore purchase on iOS/Android builds and publish final billing help copy.',
    },
    {
      id: 'real_world_payments',
      title: 'Real-world payments',
      body: realWorldReady
        ? 'Stripe/Apple Pay reservation flow and webhook reconciliation are ready.'
        : input.paymentsConfigured
          ? 'Stripe keys exist, but reservation webhooks/reconciliation still need production checks.'
          : 'Date holds and physical gifts need Stripe/Apple Pay only after recipient/venue consent and server pricing.',
      ready: realWorldReady,
      started: input.paymentsConfigured || input.stripeReservationReady,
      nextStep: 'Deploy payment webhooks for date holds, gifts, refunds, cancellation and reconciliation logs.',
    },
    {
      id: 'refund_safety_ops',
      title: 'Refunds and abuse safety',
      body: safetyReady
        ? 'Refund support, spam limits and abuse controls are represented for Sparks, gifts and dates.'
        : 'Paid romantic actions need refund support, anti-spam limits and Trust Ops review paths.',
      ready: safetyReady,
      started: input.refundSupportReady || input.abuseControlsReady,
      nextStep: 'Connect billing support queue, refund policy, chargeback handling and suspicious-purchase alerts.',
    },
    {
      id: 'production_lock',
      title: 'Production billing lock',
      body: productionReady
        ? `Billing is locked for ${input.appEnvironment} with server-verified entitlements.`
        : `Current mode is ${input.billingMode}. Release builds must require store billing, verified receipts and backend entitlements.`,
      ready: productionReady,
      started: input.productionBillingLocked || input.billingMode === 'store',
      nextStep: 'Block production paid unlocks unless store billing, receipt verification and entitlement persistence are enabled.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: PaymentEntitlementGateId[] = [
    'product_catalog',
    'checkout_surface',
    'entitlement_limits',
    'restore_disclosure',
    'refund_safety_ops',
  ];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for paid launch' : hasSetupBlocker ? 'Billing setup needed' : 'Final payment providers pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    paidProductCount: input.membershipPlanCount + input.sparkPackCount + (input.hasExecutivePlan ? 1 : 0),
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run paid-flow smoke tests on iOS and Android with test purchases, restore and refund scenarios.',
  };
}
