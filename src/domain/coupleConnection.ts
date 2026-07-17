import type { Json } from '../types/database';

export type CouplePartnerSummary = {
  memberId: string;
  displayName: string;
  city: string;
  profession: string;
  verified: boolean;
};

export type CoupleConnectionRequest = {
  requestId: string;
  member: CouplePartnerSummary;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
};

export type CouplePairingConnection = {
  connectionId: string;
  partnerMemberId: string;
  partnerDisplayName: string;
};

export type CoupleConnectionHub = {
  experienceMode: 'seeking' | 'couple';
  connection: CouplePairingConnection | null;
  incomingRequests: CoupleConnectionRequest[];
  outgoingRequests: CoupleConnectionRequest[];
};

export type CoupleModeProfileInput = {
  firstName: string;
  age: string;
  city: string;
  profession: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error('The partner connection response was incomplete.');
  return value.trim();
}

function parsePartner(value: unknown): CouplePartnerSummary {
  if (!isRecord(value)) throw new Error('The partner profile could not be read.');
  return {
    memberId: requiredText(value, 'member_id'),
    displayName: requiredText(value, 'display_name'),
    city: requiredText(value, 'city'),
    profession: requiredText(value, 'profession'),
    verified: value.verified === true,
  };
}

function parseConnection(value: unknown): CouplePairingConnection | null {
  if (!isRecord(value)) return null;
  return {
    connectionId: requiredText(value, 'connection_id'),
    partnerMemberId: requiredText(value, 'partner_member_id'),
    partnerDisplayName: requiredText(value, 'partner_display_name'),
  };
}

function parseRequest(value: unknown): CoupleConnectionRequest {
  if (!isRecord(value)) throw new Error('A partner request could not be read.');
  const status = value.status;
  if (!['pending', 'accepted', 'declined', 'cancelled', 'expired'].includes(String(status))) throw new Error('A partner request had an invalid status.');
  return {
    requestId: requiredText(value, 'request_id'),
    member: parsePartner(value.member),
    status: status as CoupleConnectionRequest['status'],
    createdAt: requiredText(value, 'created_at'),
    expiresAt: requiredText(value, 'expires_at'),
  };
}

export function parseCoupleConnectionHub(value: Json | unknown): CoupleConnectionHub {
  if (!isRecord(value)) throw new Error('The couple connection response could not be read.');
  const experienceMode = value.experience_mode === 'couple' ? 'couple' : 'seeking';
  return {
    experienceMode,
    connection: parseConnection(value.connection),
    incomingRequests: Array.isArray(value.incoming_requests) ? value.incoming_requests.map(parseRequest) : [],
    outgoingRequests: Array.isArray(value.outgoing_requests) ? value.outgoing_requests.map(parseRequest) : [],
  };
}

export function parseCouplePartnerSummary(value: Json | unknown): CouplePartnerSummary {
  return parsePartner(value);
}

export function parseCoupleConnectionRequest(value: Json | unknown): CoupleConnectionRequest {
  return parseRequest(value);
}

export function isCoupleSearchMiss(value: unknown) {
  return isRecord(value) && value.found === false;
}
