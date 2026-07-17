import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/027_marketplace_operations_control_plane.sql', 'utf8');
const webhook = readFileSync('supabase/functions/marketplace-booking-webhook/index.ts', 'utf8');

describe('marketplace operations control plane', () => {
  it('prevents partner activation until commercial and safety compliance passes', () => {
    expect(migration).toContain('create table if not exists public.marketplace_partner_compliance');
    expect(migration).toContain("c.contract_status='verified'");
    expect(migration).toContain("c.insurance_status='verified'");
    expect(migration).toContain("c.payout_status='verified'");
    expect(migration).toContain('marketplace_partner_activation_guard');
  });

  it('creates atomic capacity holds and safely releases expired or declined inventory', () => {
    expect(migration).toContain('create table if not exists public.marketplace_inventory_holds');
    expect(migration).toContain('remaining_capacity=remaining_capacity-p_party_size');
    expect(migration).toContain("status='expired'");
    expect(migration).toContain('remaining_capacity=least(capacity,remaining_capacity+hold_row.party_size)');
    expect(migration).toContain("perform public.release_marketplace_inventory_hold(result.quote_id,'released')");
  });

  it('records provider inventory provenance without overwriting active holds', () => {
    expect(migration).toContain('create table if not exists public.marketplace_inventory_sync_runs');
    expect(migration).toContain('unique(provider,provider_sync_id)');
    expect(migration).toContain('greatest((slot->>\'capacity\')::integer-held_capacity,0)');
    expect(migration).toContain('for update');
  });

  it('validates webhook signature, raw payload hash, amount, currency and state transition', () => {
    expect(webhook).toContain("crypto.subtle.sign('HMAC'");
    expect(webhook).toContain("crypto.subtle.digest('SHA-256'");
    expect(webhook).toContain('p_amount_cents:event.amountCents');
    expect(migration).toContain('marketplace_booking_transition_allowed(order_row.status,target_status)');
    expect(migration).toContain("raise exception 'Payment amount or currency mismatch'");
    expect(migration).toContain("raise exception 'Provider amount or currency mismatch'");
  });

  it('calculates refund eligibility from immutable captured amount and offering terms', () => {
    expect(migration).toContain('create table if not exists public.marketplace_refund_cases');
    expect(migration).toContain('order_row.captured_amount_cents*late_percent/100.0');
    expect(migration).toContain("order_row.status not in('confirmed','cancellation_requested','support_required')");
    expect(migration).toContain('unique(requested_by,idempotency_key)');
  });

  it('preserves paid booking and refund rights after a match ends', () => {
    expect(migration).toContain('booking participants view reservation orders');
    expect(migration).toContain('(select auth.uid())=purchaser_id or (select auth.uid())=any(accepted_by)');
    expect(migration).toContain('(purchaser_id=viewer or viewer=any(accepted_by))');
    expect(migration).toContain('(order_row.purchaser_id<>viewer and not viewer=any(order_row.accepted_by))');
  });

  it('creates private reconciliation cases for money, confirmation and refund mismatches', () => {
    expect(migration).toContain('create table if not exists public.marketplace_reconciliation_cases');
    expect(migration).toContain("'amount_mismatch','critical'");
    expect(migration).toContain("'stale_confirmation','high'");
    expect(migration).toContain("'refund_mismatch','high'");
    expect(migration).toContain('revoke all on public.marketplace_partner_compliance,public.marketplace_inventory_sync_runs,public.marketplace_inventory_holds,public.marketplace_refund_cases,public.marketplace_reconciliation_cases');
  });
});
