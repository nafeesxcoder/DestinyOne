import { backendRuntime, supabase } from '../lib/supabase';
import { normalizeAuthPhone } from '../domain/validation';
import { isCoupleSearchMiss, parseCoupleConnectionHub, parseCoupleConnectionRequest, parseCouplePartnerSummary, type CoupleConnectionHub, type CoupleConnectionRequest, type CoupleModeProfileInput, type CouplePartnerSummary } from '../domain/coupleConnection';
export type { CoupleConnectionHub, CoupleConnectionRequest, CoupleModeProfileInput, CouplePartnerSummary } from '../domain/coupleConnection';

const emptyHub = (): CoupleConnectionHub => ({ experienceMode: 'seeking', connection: null, incomingRequests: [], outgoingRequests: [] });
let previewHub = emptyHub();

const requestId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function ensurePairingBackend() {
  if (backendRuntime.mode === 'blocked') throw new Error(backendRuntime.blockingReason || 'The secure partner connection is unavailable.');
}

export async function saveCoupleModeMemberProfile(input: CoupleModeProfileInput) {
  ensurePairingBackend();
  const age = Number.parseInt(input.age, 10);
  if (input.firstName.trim().length < 2) throw new Error('Add your first name.');
  if (!Number.isFinite(age) || age < 18 || age > 90) throw new Error('Enter your correct age. Couple Mode is for adults 18+.');
  if (input.city.trim().length < 2) throw new Error('Add your city.');
  if (input.profession.trim().length < 2) throw new Error('Add your profession.');
  if (backendRuntime.mode === 'demo') return;
  const birthDate = `${new Date().getFullYear() - age}-01-01`;
  const { error } = await supabase.rpc('save_couple_mode_profile', {
    p_first_name: input.firstName.trim().split(/\s+/)[0] ?? input.firstName.trim(),
    p_birth_date: birthDate,
    p_city: input.city.trim(),
    p_profession: input.profession.trim(),
  });
  if (error) throw error;
}

export async function setServerCoupleMode(enabled: boolean) {
  ensurePairingBackend();
  if (backendRuntime.mode === 'demo') { previewHub = { ...previewHub, experienceMode: enabled ? 'couple' : 'seeking' }; return; }
  const { error } = await supabase.rpc('set_couple_mode_enabled', { p_enabled: enabled });
  if (error) throw error;
}

export async function searchCouplePartnerByPhone(phone: string): Promise<CouplePartnerSummary> {
  ensurePairingBackend();
  const normalizedPhone = normalizeAuthPhone(phone);
  if (!normalizedPhone) throw new Error('Enter the complete phone number with country code.');
  if (backendRuntime.mode === 'demo') {
    return { memberId: `preview-${normalizedPhone.slice(-4)}`, displayName: 'Preview Partner', city: 'Toronto, ON', profession: 'Verified professional', verified: true };
  }
  const { data, error } = await supabase.rpc('search_couple_partner_by_phone', {
    p_phone_e164: normalizedPhone,
    p_client_request_id: requestId('couple-search'),
  });
  if (error) throw error;
  if (isCoupleSearchMiss(data)) throw new Error('No eligible Couple Mode account was found for that exact number.');
  return parseCouplePartnerSummary(data);
}

export async function sendCoupleConnectionRequest(member: CouplePartnerSummary): Promise<CoupleConnectionRequest> {
  ensurePairingBackend();
  if (backendRuntime.mode === 'demo') {
    const createdAt = new Date().toISOString();
    const pending: CoupleConnectionRequest = {
      requestId: requestId('preview-request'), member, status: 'pending', createdAt,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    previewHub = { ...previewHub, experienceMode: 'couple', outgoingRequests: [pending] };
    return pending;
  }
  const { data, error } = await supabase.rpc('send_couple_connection_request', {
    p_recipient_id: member.memberId,
    p_client_request_id: requestId('couple-request'),
  });
  if (error) throw error;
  return parseCoupleConnectionRequest(data);
}

export async function respondToCoupleConnectionRequest(requestIdValue: string, accept: boolean): Promise<CoupleConnectionHub> {
  ensurePairingBackend();
  if (backendRuntime.mode === 'demo') {
    const incoming = previewHub.incomingRequests.find(request => request.requestId === requestIdValue);
    if (!incoming) return previewHub;
    previewHub = accept
      ? { experienceMode: 'couple', connection: { connectionId: requestId('preview-couple'), partnerMemberId: incoming.member.memberId, partnerDisplayName: incoming.member.displayName }, incomingRequests: [], outgoingRequests: [] }
      : { ...previewHub, incomingRequests: previewHub.incomingRequests.filter(request => request.requestId !== requestIdValue) };
    return previewHub;
  }
  const { data, error } = await supabase.rpc('respond_couple_connection_request', {
    p_request_id: requestIdValue,
    p_accept: accept,
    p_client_request_id: requestId('couple-response'),
  });
  if (error) throw error;
  return parseCoupleConnectionHub(data);
}

export async function fetchCurrentCoupleConnectionHub(): Promise<CoupleConnectionHub> {
  ensurePairingBackend();
  if (backendRuntime.mode === 'demo') return previewHub;
  const { data, error } = await supabase.rpc('get_couple_connection_hub');
  if (error) throw error;
  return parseCoupleConnectionHub(data);
}
