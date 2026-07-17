import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { buildConsentedGrowthEvent, type GrowthFunnelEvent } from '../domain/growthEngine';

function requireGrowthBackend() {
  if (!isSupabaseConfigured) throw new Error('Growth backend is not configured.');
}

export async function recordGrowthFunnelEvent(input: {
  analyticsConsent: boolean;
  eventId: string;
  sessionId: string;
  eventName: GrowthFunnelEvent;
  properties?: Record<string, unknown>;
}) {
  const event = buildConsentedGrowthEvent(input);
  if (!event) return { recorded: false, reason: 'consent_required' as const };
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('record_growth_event', {
    p_event_id: event.eventId,
    p_session_id: input.sessionId,
    p_event_name: event.eventName,
    p_properties: event.properties,
  });
  if (error) throw error;
  return { recorded: data === true, reason: data === true ? undefined : 'server_rejected' as const };
}

export async function recordGrowthAttributionTouch(input: { touchId: string; channel: string; campaignKey?: string; cityKey?: string }) {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('record_growth_attribution_touch', {
    p_touch_id: input.touchId,
    p_channel: input.channel,
    p_campaign_key: input.campaignKey,
    p_city_key: input.cityKey,
  });
  if (error) throw error;
  return data === true;
}

export async function redeemGrowthReferral(inviteCode: string, idempotencyKey: string) {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('redeem_growth_referral', { p_invite_code: inviteCode, p_idempotency_key: idempotencyKey });
  if (error) throw error;
  return data;
}

export async function getCurrentReferralPass() {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('get_current_referral_pass');
  if (error) throw error;
  return data as { status: 'none' | 'active' | 'expired' | 'revoked'; plan?: 'base'; startsAt?: string; expiresAt?: string; days?: 7 };
}

export async function getGrowthExperimentAssignment(experimentKey: string) {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('assign_growth_experiment', { p_experiment_key: experimentKey });
  if (error) throw error;
  return data;
}

export async function recordGrowthExperimentExposure(experimentKey: string, variantKey: string) {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('record_growth_experiment_exposure', {
    p_experiment_key: experimentKey,
    p_variant_key: variantKey,
  });
  if (error) throw error;
  return data === true;
}

export async function withdrawGrowthAnalyticsConsent() {
  requireGrowthBackend();
  const { data, error } = await supabase.rpc('withdraw_growth_analytics_consent');
  if (error) throw error;
  return data === true;
}
