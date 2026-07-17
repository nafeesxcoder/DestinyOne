import {afterEach, describe, expect, it, vi} from 'vitest';

const originalPaymentsUrl = process.env.EXPO_PUBLIC_PAYMENTS_API_URL;
const originalStripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const originalGiftsUrl = process.env.EXPO_PUBLIC_GIFTS_API_URL;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../lib/supabase');
  process.env.EXPO_PUBLIC_PAYMENTS_API_URL = originalPaymentsUrl;
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalStripeKey;
  process.env.EXPO_PUBLIC_GIFTS_API_URL = originalGiftsUrl;
});

async function loadStrictCommerce() {
  vi.resetModules();
  process.env.EXPO_PUBLIC_PAYMENTS_API_URL = '';
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = '';
  process.env.EXPO_PUBLIC_GIFTS_API_URL = '';
  vi.doMock('../lib/supabase', () => ({
    appEnvironment: 'production',
    requiresRealBackend: true,
    isSupabaseConfigured: true,
    supabase: {auth: {getSession: vi.fn()}},
  }));
  const payments = await import('./payments');
  const gifts = await import('./gifts');
  return {payments, gifts};
}

describe('production commerce runtime', () => {
  it('never simulates a successful reservation without the real provider', async () => {
    const {payments} = await loadStrictCommerce();
    expect(payments.dateReservationMode).toBe('blocked');
    const quote = payments.estimateDateReservationQuote({
      venueId: 'venue-1',
      venueName: 'Public Cafe',
      amountCents: 1000,
      currency: 'usd',
    });
    expect(quote.providerLabel).toBe('Reservations unavailable');
    await expect(payments.createDateReservationIntent({
      venueId: 'venue-1',
      venueName: 'Public Cafe',
      amountCents: 1000,
      currency: 'usd',
    })).rejects.toThrow('No payment or reservation was created');
  });

  it('never creates a local physical gift order or wallet mutation path', async () => {
    const {gifts} = await loadStrictCommerce();
    expect(gifts.physicalGiftOrderingMode).toBe('blocked');
    expect(gifts.digitalGiftWalletMode).toBe('blocked');
    expect(gifts.vouchRewardsMode).toBe('blocked');
    await expect(gifts.createPhysicalGiftOrder({
      productId: 'ruby-roses',
      productName: 'Ruby Roses',
      recipientId: 'member-1',
      priceCents: 4900,
    })).rejects.toThrow('No order or payment was created');
  });
});
