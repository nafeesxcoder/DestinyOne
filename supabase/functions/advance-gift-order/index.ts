// @ts-nocheck
import { createDoorDashDelivery, doordashCredentialsFromEnv, DoorDashApiError } from '../_shared/doordash.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const pickupBusinessName = Deno.env.get('DOORDASH_PICKUP_BUSINESS_NAME') ?? 'DestinyOne Gifting Partner';
const pickupPhoneNumber = Deno.env.get('DOORDASH_PICKUP_PHONE') ?? '';
const pickupAddress = {
  line1: Deno.env.get('DOORDASH_PICKUP_LINE1') ?? '',
  city: Deno.env.get('DOORDASH_PICKUP_CITY') ?? '',
  region: Deno.env.get('DOORDASH_PICKUP_REGION') ?? '',
  postalCode: Deno.env.get('DOORDASH_PICKUP_POSTAL_CODE') ?? '',
  countryCode: Deno.env.get('DOORDASH_PICKUP_COUNTRY') ?? 'US',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Authentication required' }, 401);
  if (!supabaseUrl || !serviceKey) return json({ error: 'Gift ordering is not configured' }, 503);

  try {
    const { orderId } = (await req.json()) as { orderId?: string };
    const orderUuid = normalizeOrderId(orderId);
    if (!orderUuid) return json({ error: 'orderId is required' }, 400);

    const caller = await resolveCallerId(authHeader);
    if (!caller) return json({ error: 'Your session expired. Please sign in again.' }, 401);

    const participant = await isOrderParticipant(orderUuid, caller);
    if (!participant) return json({ error: 'Gift order unavailable' }, 404);

    const authorized = await rpc('record_gift_payment_authorized', { p_order_id: orderUuid });
    if (!authorized.ok) return json({ error: 'Payment could not be authorized for this order.' }, 409);

    const credentials = doordashCredentialsFromEnv((key) => Deno.env.get(key));
    if (!credentials || !pickupAddress.line1) {
      return json({ status: 'payment_authorized', dispatched: false });
    }

    const dispatch = await rpc('get_gift_order_for_dispatch', { p_order_id: orderUuid });
    if (!dispatch.ok) return json({ error: 'Order is not ready for dispatch.' }, 409);
    const order = dispatch.data as GiftOrderForDispatch;

    try {
      const delivery = await createDoorDashDelivery(credentials, {
        externalDeliveryId: orderUuid,
        pickupAddress,
        pickupBusinessName,
        pickupPhoneNumber,
        dropoffAddress: {
          line1: order.address.line1,
          line2: order.address.line2 ?? undefined,
          city: order.address.city,
          region: order.address.region,
          postalCode: order.address.postal_code,
          countryCode: order.address.country_code,
        },
        dropoffPhoneNumber: order.address.dropoff_phone ?? pickupPhoneNumber,
        dropoffInstructions: order.address.dropoff_instructions ?? undefined,
        orderValueCents: order.total_cents,
        tipCents: order.service_level === 'on_demand' ? 500 : undefined,
      });
      await rpc('record_gift_provider_submitted', {
        p_order_id: orderUuid,
        p_doordash_delivery_id: delivery.delivery_id,
        p_doordash_external_delivery_id: delivery.external_delivery_id,
        p_tracking_url: delivery.tracking_url ?? null,
      });
      return json({ status: 'merchant_preparing', dispatched: true });
    } catch (error) {
      const reason = error instanceof DoorDashApiError ? error.message : 'DoorDash Drive request failed';
      await rpc('record_gift_provider_failed', { p_order_id: orderUuid, p_reason: reason });
      return json({ status: 'failed', dispatched: false, error: reason }, 502);
    }
  } catch (error) {
    console.error('advance-gift-order error', error);
    return json({ error: 'Could not advance this gift order.' }, 400);
  }
});

type GiftOrderForDispatch = { total_cents: number; service_level: 'on_demand' | 'same_day' | 'scheduled'; address: { line1: string; line2?: string | null; city: string; region: string; postal_code: string; country_code: string; dropoff_phone?: string | null; dropoff_instructions?: string | null } };

function normalizeOrderId(orderId?: string): string | null {
  if (!orderId) return null;
  const stripped = orderId.startsWith('gift-') ? orderId.slice(5) : orderId;
  return /^[0-9a-f-]{36}$/i.test(stripped) ? stripped : null;
}

async function rpc(name: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown }> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) { console.error(`${name} failed`, await response.text()); return { ok: false }; }
  return { ok: true, data: await response.json() };
}

async function isOrderParticipant(orderUuid: string, callerId: string): Promise<boolean> {
  const response = await fetch(`${supabaseUrl}/rest/v1/gift_orders?id=eq.${orderUuid}&select=sender_id,recipient_id`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey! },
  });
  if (!response.ok) return false;
  const rows = (await response.json()) as { sender_id: string; recipient_id: string }[];
  const order = rows[0];
  return Boolean(order && (order.sender_id === callerId || order.recipient_id === callerId));
}

async function resolveCallerId(authHeader: string): Promise<string | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: serviceKey! } });
    if (!response.ok) return null;
    const user = (await response.json()) as { id?: string };
    return user.id ?? null;
  } catch { return null; }
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}