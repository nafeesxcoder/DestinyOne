import { describe, expect, it } from 'vitest';
import { buildStoreReviewSnapshot } from './storeReview';

describe('store review readiness', () => {
  it('allows a preview reviewer account with demo OTP', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'preview',
      backendMode: 'demo',
      demoOtpFallbackAllowed: true,
      reviewerEmail: 'reviewer@destinyone.app',
      reviewerOtp: '123456',
      supportContact: 'support@destinyone.app',
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(true);
    expect(snapshot.score).toBe(100);
    expect(snapshot.reviewerInstructions.join(' ')).toContain('123456');
  });

  it('blocks production when demo OTP fallback is still enabled', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'production',
      backendMode: 'supabase',
      demoOtpFallbackAllowed: true,
      reviewerEmail: 'reviewer@destinyone.app',
      supportContact: 'support@destinyone.app',
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toContain('production_demo_guard');
  });

  it('blocks production when backend is not real', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'production',
      backendMode: 'demo',
      demoOtpFallbackAllowed: false,
      reviewerEmail: 'reviewer@destinyone.app',
      reviewerOtp: '123456',
      supportContact: 'support@destinyone.app',
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toContain('production_backend');
  });
});
