import { describe, expect, it, vi } from 'vitest';
import { buildGiftConfirmationPlan, buildGiftFulfillmentPlan, buildGiftSteps, estimateGiftOrderQuote, formatGiftMoney, giftOrderSummary } from './gifts';

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
    expect(quote.currency).toBe('USD');
    expect(quote.pricingVersion).toBe('gift-quote-2026-08-v2');
    expect(quote.rushFeeCents).toBeGreaterThan(0);
    expect(quote.exactRoutePending).toBe(true);
    expect(quote.totalCents).toBeGreaterThan(quote.itemSubtotalCents);
    expect(formatGiftMoney(quote.totalCents)).toMatch(/^\$/);
  });

  it('calculates distance, rush, small-order and scheduled-window pricing separately', () => {
    const fast = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai Duo', priceCents: 2200, recipientId: 'match-a', deliveryWindow: 'asap', deliveryCity: 'Fresno, CA', deliveryDistanceMilesEstimate: 8.2 },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    expect(fast.deliveryCity).toBe('Fresno, CA');
    expect(fast.distanceFeeCents).toBe(340);
    expect(fast.rushFeeCents).toBe(299);
    expect(fast.smallOrderFeeCents).toBe(199);
    const scheduled = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai Duo', priceCents: 2200, recipientId: 'match-a', deliveryWindow: 'scheduled' },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    expect(scheduled.rushFeeCents).toBe(0);
    expect(scheduled.etaMinutesMin).toBeGreaterThan(1400);
  });

  it('creates honest sender, recipient and email confirmation contracts', () => {
    const preview = buildGiftConfirmationPlan(true);
    expect(preview.channels).toHaveLength(4);
    expect(preview.channels.find(channel => channel.audience === 'sender' && channel.channel === 'in_app')?.status).toBe('sent');
    expect(preview.channels.filter(channel => channel.channel === 'email').every(channel => channel.status === 'preview_only')).toBe(true);
    expect(preview.emailAdapter).toBe('developer_required');
    const production = buildGiftConfirmationPlan(false);
    expect(production.channels.filter(channel => channel.channel === 'email').every(channel => channel.status === 'queued')).toBe(true);
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
    expect(plan[0]?.title).toBe('Recipient approval');
    expect(plan.some((item) => item.owner === 'provider')).toBe(true);
    expect(giftOrderSummary('recipient_pending', quote).headline).toContain('Waiting');
    expect(giftOrderSummary('delivered', quote).tone).toBe('success');
  });
});
