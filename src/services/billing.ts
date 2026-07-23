import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type RestoredEntitlement = { key: string; status: string; units: number; expiresAt?: string | null };
export type PreparedStorePurchase = { purchaseSessionId: string; externalProductId: string; platform: 'apple_iap' | 'google_play'; expiresAt: string };

function requireBillingBackend() {
  if (!isSupabaseConfigured) throw new Error('Secure billing backend is not connected. No entitlement was changed.');
}

export async function loadCurrentEntitlements() {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('get_current_entitlements');
  if (error) throw error;
  return data as { entitlements?: RestoredEntitlement[]; verifiedByServer?: boolean; asOf?: string } | null;
}

export async function restoreStorePurchases() {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('restore_store_purchases');
  if (error) throw error;
  return data as { restored?: RestoredEntitlement[]; receiptVerificationRequired?: boolean; asOf?: string } | null;
}

export async function prepareStorePurchase(productKey: string, platform: 'apple_iap' | 'google_play', idempotencyKey: string) {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('prepare_store_purchase', {
    p_product_key: productKey,
    p_platform: platform,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as PreparedStorePurchase;
}

export async function consumeSparkEntitlement(units: number, idempotencyKey: string) {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('consume_billing_entitlement', {
    p_entitlement_key: 'spark_wallet',
    p_units: units,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as { entitlementKey: 'spark_wallet'; balance: number; consumed: number };
}

export async function sendGoldenSpark(recipientId: string, note: string, idempotencyKey: string) {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('send_golden_spark', {
    p_recipient_id: recipientId,
    p_note: note,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as { id: string; paymentSource: 'daily_free' | 'paid_spark'; balance: number | null; matched: boolean };
}

export async function requestBillingRefund(receiptId: string, reason: string, idempotencyKey: string) {
  requireBillingBackend();
  const { data, error } = await supabase.rpc('request_billing_refund', {
    p_receipt_id: receiptId,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}
