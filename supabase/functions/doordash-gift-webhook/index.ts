// @ts-nocheck
import { verifyDoorDashWebhookSignature } from '../_shared/doordash.ts';

const json = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const webhookSecret = Deno.env.get('DOORDASH_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!webhookSecret || !supabaseUrl || !serviceKey) return json({ error: 'Webhook is not configured' }, 503);

  const raw = await req.text();
  const signature = req.headers.get('x-dd-signature');
  if (!(await verifyDoorDashWebhookSignature(raw, signature, webhookSecret))) return json({ error: 'Invalid signature' }, 401);

  let event: { event_id?: string; event_category?: string; delivery_id?: string; external_delivery_id?: string; event_name?: string; tracking_url?: string };
  try { event = JSON.parse(raw); } catch { return json({ error: 'Invalid payload' }, 400); }
  const externalDeliveryId = event.external_delivery_id;
  const eventName = event.event_name ?? event.event_category;
  const eventId = event.event_id ?? `${externalDeliveryId}-${eventName}-${req.headers.get('x-dd-timestamp') ?? Date.now()}`;
  if (!externalDeliveryId || !eventName) return json({ error: 'Invalid event' }, 400);

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/process_gift_delivery_webhook`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_provider: 'doordash_drive',
      p_provider_event_id: eventId,
      p_external_delivery_id: externalDeliveryId,
      p_event_type: eventName,
      p_tracking_url: event.tracking_url ?? null,
    }),
  });
  if (!response.ok) { console.error('process_gift_delivery_webhook failed', await response.text()); return json({ error: 'Webhook processing failed' }, 502); }
  return json({ received: true, processed: await response.json() });
});