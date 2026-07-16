export type StoreReviewEnvironment = 'development' | 'preview' | 'production' | string;

export type StoreReviewInput = {
  appEnvironment: StoreReviewEnvironment;
  backendMode: 'demo' | 'supabase' | 'missing' | string;
  demoOtpFallbackAllowed: boolean;
  reviewerEmail?: string;
  reviewerPhone?: string;
  reviewerOtp?: string;
  supportContact?: string;
  legalUrlsPublished: boolean;
};

export type StoreReviewItem = {
  id: string;
  title: string;
  body: string;
  ready: boolean;
  storeCritical: boolean;
};

export type StoreReviewSnapshot = {
  ready: boolean;
  score: number;
  readyCount: number;
  total: number;
  reviewerCredential: string;
  reviewerInstructions: string[];
  blockers: StoreReviewItem[];
  items: StoreReviewItem[];
};

export function buildStoreReviewSnapshot(input: StoreReviewInput): StoreReviewSnapshot {
  const isProduction = input.appEnvironment === 'production';
  const hasCredential = Boolean(input.reviewerEmail || input.reviewerPhone);
  const hasOtpOrBackend = Boolean(input.reviewerOtp || input.backendMode === 'supabase');
  const productionDemoGuardReady = !isProduction || !input.demoOtpFallbackAllowed;
  const productionBackendReady = !isProduction || input.backendMode === 'supabase';

  const items: StoreReviewItem[] = [
    {
      id: 'reviewer_credentials',
      title: 'Reviewer login credentials',
      body: hasCredential && hasOtpOrBackend
        ? 'A reviewer can enter the app without needing a personal phone number.'
        : 'Add a review account email/phone and OTP or connect real Supabase auth.',
      ready: hasCredential && hasOtpOrBackend,
      storeCritical: true,
    },
    {
      id: 'review_notes',
      title: 'Review notes',
      body: input.supportContact
        ? 'Reviewer notes can include support contact, demo path and safety feature instructions.'
        : 'Add support contact and review notes before store submission.',
      ready: Boolean(input.supportContact),
      storeCritical: true,
    },
    {
      id: 'production_demo_guard',
      title: 'Production demo guard',
      body: productionDemoGuardReady
        ? 'Demo OTP fallback is not allowed in production.'
        : 'Production cannot ship with preview OTP fallback enabled.',
      ready: productionDemoGuardReady,
      storeCritical: true,
    },
    {
      id: 'production_backend',
      title: 'Production backend mode',
      body: productionBackendReady
        ? 'Production mode requires real backend auth/data.'
        : 'Production release is blocked until Supabase mode is active.',
      ready: productionBackendReady,
      storeCritical: true,
    },
    {
      id: 'legal_urls',
      title: 'Legal URLs',
      body: input.legalUrlsPublished
        ? 'Privacy, terms and support URLs are ready to paste into store review.'
        : 'Publish privacy policy, terms and support URLs over HTTPS before submission.',
      ready: input.legalUrlsPublished,
      storeCritical: true,
    },
  ];

  const readyCount = items.filter((item) => item.ready).length;
  const blockers = items.filter((item) => item.storeCritical && !item.ready);
  const reviewerCredential = input.reviewerEmail || input.reviewerPhone || 'Add reviewer account before submission';
  const reviewerInstructions = [
    `Login: ${reviewerCredential}`,
    input.reviewerOtp ? `OTP/code: ${input.reviewerOtp}` : 'OTP/code: use the real Supabase email or phone code',
    'Test path: complete onboarding → open Matches → view profile → send interest → answer icebreaker → open Chat.',
    'Safety path: open chat menu → Report/Block/Unmatch → Profile → Safety Center → Trust Ops Preview.',
    'Payments/gifts: use preview checkout only until store billing and fulfillment provider are connected.',
  ];

  return {
    ready: blockers.length === 0,
    score: Math.round((readyCount / items.length) * 100),
    readyCount,
    total: items.length,
    reviewerCredential,
    reviewerInstructions,
    blockers,
    items,
  };
}
