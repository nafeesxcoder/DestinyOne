export type DoorDashCredentials = { developerId: string; keyId: string; signingSecret: string };
export type DoorDashAddress = { line1: string; line2?: string | null; city: string; region: string; postalCode: string; countryCode: string };

export type CreateDeliveryInput = {
  externalDeliveryId: string;
  pickupAddress: DoorDashAddress;
  pickupBusinessName: string;
  pickupPhoneNumber: string;
  pickupInstructions?: string;
  dropoffAddress: DoorDashAddress;
  dropoffPhoneNumber: string;
  dropoffInstructions?: string;
  dropoffContactGivenName?: string;
  orderValueCents: number;
  tipCents?: number;
  items?: { name: string; quantity: number }[];
};

export type DoorDashDelivery = { external_delivery_id: string; delivery_id: string; delivery_status: string; tracking_url?: string; fee?: number };

// Wraps a Uint8Array's bytes in a fresh, plain ArrayBuffer so it satisfies
// the strict BufferSource type the WebCrypto API expects.
function asBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function signDriveJwt(credentials: DoorDashCredentials): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT', 'dd-ver': 'DD-JWT-V1' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = { aud: 'doordash', iss: credentials.developerId, kid: credentials.keyId, exp: nowSeconds + 300, iat: nowSeconds };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey('raw', asBuffer(base64UrlDecodeToBytes(credentials.signingSecret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, asBuffer(new TextEncoder().encode(signingInput)));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function formatAddress(address: DoorDashAddress): string {
  const line2 = address.line2 ? `, ${address.line2}` : '';
  return `${address.line1}${line2}, ${address.city}, ${address.region} ${address.postalCode}, ${address.countryCode}`;
}

export function doordashCredentialsFromEnv(env: (key: string) => string | undefined): DoorDashCredentials | null {
  const developerId = env('DOORDASH_DEVELOPER_ID');
  const keyId = env('DOORDASH_KEY_ID');
  const signingSecret = env('DOORDASH_SIGNING_SECRET');
  if (!developerId || !keyId || !signingSecret) return null;
  return { developerId, keyId, signingSecret };
}

const DRIVE_BASE_URL = 'https://openapi.doordash.com/drive/v1';

export class DoorDashApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message); }
}

async function driveRequest<T>(credentials: DoorDashCredentials, method: string, path: string, body?: unknown): Promise<T> {
  const jwt = await signDriveJwt(credentials);
  const response = await fetch(`${DRIVE_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DoorDashApiError(typeof payload?.message === 'string' ? payload.message : `DoorDash Drive request failed (${response.status})`, response.status, payload);
  }
  return payload as T;
}

export async function createDoorDashDelivery(credentials: DoorDashCredentials, input: CreateDeliveryInput): Promise<DoorDashDelivery> {
  return driveRequest<DoorDashDelivery>(credentials, 'POST', '/deliveries', {
    external_delivery_id: input.externalDeliveryId,
    pickup_address: formatAddress(input.pickupAddress),
    pickup_business_name: input.pickupBusinessName,
    pickup_phone_number: input.pickupPhoneNumber,
    pickup_instructions: input.pickupInstructions,
    dropoff_address: formatAddress(input.dropoffAddress),
    dropoff_phone_number: input.dropoffPhoneNumber,
    dropoff_instructions: input.dropoffInstructions,
    dropoff_contact_given_name: input.dropoffContactGivenName,
    order_value: input.orderValueCents,
    tip: input.tipCents,
    items: input.items,
    contactless_dropoff: true,
  });
}

export async function cancelDoorDashDelivery(credentials: DoorDashCredentials, externalDeliveryId: string): Promise<void> {
  await driveRequest(credentials, 'PUT', `/deliveries/${externalDeliveryId}/cancel`, {});
}

export async function getDoorDashDelivery(credentials: DoorDashCredentials, externalDeliveryId: string): Promise<DoorDashDelivery> {
  return driveRequest<DoorDashDelivery>(credentials, 'GET', `/deliveries/${externalDeliveryId}`);
}

export async function verifyDoorDashWebhookSignature(rawBody: string, signatureHeader: string | null, webhookSecret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey('raw', asBuffer(new TextEncoder().encode(webhookSecret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, asBuffer(new TextEncoder().encode(rawBody)));
  const expected = base64UrlEncodeStandard(new Uint8Array(signature));
  return timingSafeEqual(expected, signatureHeader) || timingSafeEqual(hex(new Uint8Array(signature)), signatureHeader);
}

function base64UrlEncodeStandard(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}