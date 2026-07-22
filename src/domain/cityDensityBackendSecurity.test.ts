import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/015_city_density_and_waitlist.sql', 'utf8');

describe('city density backend security contract', () => {
  it('keeps member state private and operational metrics service-only', () => {
    expect(migration).toContain('alter table public.city_liquidity_snapshots enable row level security');
    expect(migration).toContain('alter table public.city_cohort_snapshots enable row level security');
    expect(migration).not.toContain('grant select on public.city_liquidity_snapshots');
    expect(migration).not.toContain('grant select on public.city_cohort_snapshots');
    expect(migration).toContain('(select auth.uid()) = user_id');
    expect(migration).toContain('(select auth.uid()) = inviter_id');
  });

  it('routes writes through validated authenticated RPCs', () => {
    expect(migration).toContain('function public.join_city_waitlist');
    expect(migration).toContain('function public.create_city_referral');
    expect(migration).toContain('function public.apply_city_ambassador');
    expect(migration).toContain("raise exception 'Sign in required'");
    expect(migration).toContain("raise exception 'Monthly referral limit reached'");
    expect(migration).toContain("raise exception 'Verified profile required'");
    expect(migration).toContain('revoke all on public.city_launch_markets');
  });

  it('prevents waitlist spam and self-referral rewards', () => {
    expect(migration).toContain('unique(user_id,city_key)');
    expect(migration).toContain('redeemed_by <> inviter_id');
    expect(migration).toContain("created_at>now()-interval '30 days'");
    expect(migration).toContain("status in ('created','opened','joined','verified','expired','revoked')");
    expect(migration).toContain("reward_status in ('locked','eligible','granted','reversed')");
  });
});
