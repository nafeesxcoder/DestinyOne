import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/016_marketplace_booking_operations.sql', 'utf8');
const paymentFunction = readFileSync('supabase/functions/create-date-reservation-intent/index.ts', 'utf8');

describe('marketplace backend security contracts', () => {
  it('keeps operational inventory private and exposes member writes only through RPCs', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.marketplace_partners');
    expect(migration).toContain('create or replace function public.create_marketplace_quote');
    expect(migration).toContain('create or replace function public.prepare_marketplace_payment');
  });

  it('requires active match participation, fresh availability, both acceptances, and idempotency', () => {
    expect(migration).toContain('public.is_active_match_participant');
    expect(migration).toContain("provider_synced_at < now()-interval '15 minutes'");
    expect(migration).toContain('cardinality(o.accepted_by)<>2');
    expect(migration).toContain('unique (member_id, idempotency_key)');
  });

  it('validates the bearer token and uses only the server-owned order total for Stripe', () => {
    expect(paymentFunction).toContain('/auth/v1/user');
    expect(paymentFunction).toContain('/rest/v1/rpc/prepare_marketplace_payment');
    expect(paymentFunction).toContain("'Idempotency-Key':`destinyone-date-${orderId}`");
    expect(paymentFunction).not.toContain('supportedVenues');
  });
});
