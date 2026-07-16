import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase',()=>({
  isSupabaseConfigured:false,
  supabase:{auth:{getSession:vi.fn()}},
}));
import { buildDateReservationSteps, createDateReservationIntent, dateReservationStatusCopy, estimateDateReservationQuote, formatPaymentMoney, paymentsConfigured } from './payments';

describe('date reservation payments',()=>{
  it('stays in safe demo mode without production credentials',()=>{
    expect(paymentsConfigured).toBe(false);
  });

  it('returns a demo reservation without charging a card',async()=>{
    const result=await createDateReservationIntent({venueId:'cafe-1',venueName:'Juniper Coffee House',amountCents:1000,currency:'usd'});
    expect(result.demo).toBe(true);
    expect(result.clientSecret).toBeUndefined();
    expect(result.reservationId).toMatch(/^demo-/);
  });

  it('builds a refundable date hold quote and visible reservation steps',()=>{
    const quote=estimateDateReservationQuote({venueId:'cafe-1',venueName:'Juniper Coffee House',amountCents:1000,currency:'usd'},new Date('2026-07-12T12:00:00.000Z'));
    expect(formatPaymentMoney(quote.amountCents)).toBe('$10');
    expect(quote.holdLabel).toContain('refundable');
    expect(quote.confirmationPolicy).toContain('Both people');
    expect(buildDateReservationSteps('idle')[0]?.status).toBe('active');
    expect(buildDateReservationSteps('reserved')[3]?.status).toBe('active');
    expect(dateReservationStatusCopy('processing',quote)).toContain('Preparing secure checkout');
  });
});
