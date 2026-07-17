import { describe, expect, it, vi } from 'vitest';
import { buildGiftFulfillmentPlan, buildGiftSteps, estimateGiftOrderQuote, formatGiftMoney, giftOrderSummary } from './gifts';

vi.mock('../lib/supabase', () => ({
  appEnvironment: 'development',
  requiresRealBackend: false,
  isSupabaseConfigured: false,
  supabase: { auth: { getSession: vi.fn() } },
}));

describe('real gift fulfillment estimates', () => {
  it('estimates on-demand gifts in minutes with fees and tax', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'gelato-night', productName: 'Gelato Night', priceCents: 2600, recipientId: 'match-a' },
      new Date('2026-07-11T15:00:00-07:00'),
    );
    expect(quote.etaLabel).toBe('43–67 min');
    expect(quote.serviceLevelLabel).toBe('On-demand courier');
    expect(quote.paymentPolicy).toContain('recipient accepts');
    expect(quote.providerCapability).toContain('Preview mode');
    expect(quote.acceptanceWindowMinutes).toBe(30);
    expect(quote.quoteValidMinutes).toBe(10);
    expect(quote.etaConfidence).toBe('fast');
    expect(quote.totalCents).toBeGreaterThan(quote.itemSubtotalCents);
    expect(formatGiftMoney(quote.totalCents)).toMatch(/^\$/);
  });

  it('moves delivery to tomorrow after cutoff', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'ruby-roses', productName: 'Ruby Rose Bouquet', priceCents: 4900, recipientId: 'match-a' },
      new Date('2026-07-11T22:30:00-07:00'),
    );
    expect(quote.etaLabel).toContain('Tomorrow');
    expect(quote.providerRecommendation).toContain('same-day');
    expect(quote.etaMinutesMin).toBeGreaterThan(600);
  });

  it('builds a five-step recipient-private fulfillment tracker', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai & Coffee Duo', priceCents: 2200, recipientId: 'match-a' },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    const steps = buildGiftSteps('payment_authorized', quote);
    expect(steps).toHaveLength(5);
    expect(steps[1]?.status).toBe('done');
    expect(steps[2]?.status).toBe('active');
    expect(steps[4]?.body).toContain(quote.etaLabel);
  });

  it('builds provider readiness and status copy for the order UI', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'ruby-roses', productName: 'Ruby Rose Bouquet', priceCents: 4900, recipientId: 'match-a' },
      new Date('2026-07-11T14:00:00-07:00'),
    );
    const plan = buildGiftFulfillmentPlan(quote);
    expect(plan).toHaveLength(4);
    expect(plan[0]?.title).toBe('Recipient consent');
    expect(plan.some((item) => item.owner === 'provider')).toBe(true);
    expect(giftOrderSummary('recipient_pending', quote).headline).toContain('Waiting');
    expect(giftOrderSummary('delivered', quote).tone).toBe('success');
  });
});
