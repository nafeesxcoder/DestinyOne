import { appEnvironment, isSupabaseConfigured, requiresRealBackend, supabase } from '../lib/supabase';
import { buildRuntimeCapabilities } from '../domain/runtimeCapabilities';

export type DateReservationIntent = {
  orderId?: string;
  venueId: string;
  venueName: string;
  amountCents: number;
  currency: 'usd';
};

export type DateReservationStatus = 'idle' | 'processing' | 'reserved';

export type PaymentIntentResponse = {
  clientSecret?: string;
  demo: boolean;
  reservationId: string;
};

export type DateReservationQuote = {
  quoteId: string;
  venueId: string;
  venueName: string;
  amountCents: number;
  currency: 'usd';
  holdLabel: string;
  providerLabel: string;
  refundPolicy: string;
  safetyPolicy: string;
  confirmationPolicy: string;
  expiresAt: string;
};

export type DateReservationStep = {
  label: string;
  body: string;
  status: 'done' | 'active' | 'pending';
};

export const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
export const paymentsApiUrl = process.env.EXPO_PUBLIC_PAYMENTS_API_URL?.replace(/\/$/, '') ?? '';
export const paymentsConfigured = Boolean(stripePublishableKey && paymentsApiUrl);
export const dateReservationMode = buildRuntimeCapabilities({
  appEnvironment,
  requiresRealBackend,
  paymentsConfigured,
  giftOrderingConfigured: false,
  storeBillingConnected: false,
  verifiedVouchRewardsConnected: false,
}).dateReservations;

export function formatPaymentMoney(cents: number, currency: 'usd' = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

export function estimateDateReservationQuote(input: DateReservationIntent, now = new Date()): DateReservationQuote {
  return {
    quoteId: `date-quote-${input.venueId}-${now.getTime()}`,
    venueId: input.venueId,
    venueName: input.venueName,
    amountCents: input.amountCents,
    currency: input.currency,
    holdLabel: `${formatPaymentMoney(input.amountCents, input.currency)} refundable venue hold`,
    providerLabel: dateReservationMode === 'live'
      ? 'Stripe + Apple Pay ready'
      : dateReservationMode === 'demo'
        ? 'Demo reservation preview'
        : 'Reservations unavailable',
    refundPolicy: 'Hold is refundable if the match declines, venue cannot confirm, or the date is cancelled before cutoff.',
    safetyPolicy: 'Only public-place reservations are allowed. Exact live location is never shared without permission.',
    confirmationPolicy: 'Both people should accept the date plan before any real venue hold is captured.',
    expiresAt: new Date(now.getTime() + 12 * 60 * 1000).toISOString(),
  };
}

export function buildDateReservationSteps(status: DateReservationStatus): DateReservationStep[] {
  const activeIndex = status === 'reserved' ? 3 : status === 'processing' ? 1 : 0;
  return [
    { label: 'Suggest', body: 'Send public date idea', status: activeIndex > 0 ? 'done' : 'active' },
    { label: 'Accept', body: 'Both people agree', status: activeIndex > 1 ? 'done' : activeIndex === 1 ? 'active' : 'pending' },
    { label: 'Hold', body: 'Refundable venue hold', status: activeIndex > 2 ? 'done' : 'pending' },
    { label: 'Check-in', body: 'Safety reminder after date', status: activeIndex === 3 ? 'active' : 'pending' },
  ];
}

export function dateReservationStatusCopy(status: DateReservationStatus, quote: DateReservationQuote) {
  if (dateReservationMode === 'blocked') return 'Live reservations are unavailable until the verified payment and venue provider connection is active.';
  if (status === 'reserved') return `Reservation preview confirmed for ${quote.venueName}. Production will attach receipt, refund rules and calendar reminder.`;
  if (status === 'processing') return `Preparing secure checkout for ${quote.holdLabel}.`;
  return `${quote.holdLabel}. ${quote.confirmationPolicy}`;
}

/**
 * The production endpoint must authenticate the user, look up the venue price
 * server-side, create the Stripe PaymentIntent, and return only its client secret.
 * Never trust an amount supplied by the mobile client.
 */
export async function createDateReservationIntent(input: DateReservationIntent): Promise<PaymentIntentResponse> {
  if (dateReservationMode === 'blocked') {
    throw new Error('Live reservations are unavailable. No payment or reservation was created.');
  }
  if (!paymentsConfigured) {
    await new Promise((resolve)=>setTimeout(resolve, 650));
    return {demo:true,reservationId:`demo-${Date.now()}`};
  }

  if(!isSupabaseConfigured)throw new Error('Sign in is required for secure checkout.');
  const {data}=await supabase.auth.getSession();
  const accessToken=data.session?.access_token;
  if(!accessToken)throw new Error('Your session expired. Please sign in again.');

  const response=await fetch(`${paymentsApiUrl}/create-date-reservation-intent`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},
    body:JSON.stringify({orderId:input.orderId}),
  });
  if(!response.ok)throw new Error('Secure checkout is temporarily unavailable.');
  const payload=await response.json() as {clientSecret?:string;reservationId?:string};
  if(!payload.clientSecret||!payload.reservationId)throw new Error('The payment server returned an incomplete response.');
  return {clientSecret:payload.clientSecret,reservationId:payload.reservationId,demo:false};
}
