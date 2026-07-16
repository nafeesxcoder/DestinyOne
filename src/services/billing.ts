import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type RestoredEntitlement = { key: string; status: string; units: number; expiresAt?: string | null };

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
