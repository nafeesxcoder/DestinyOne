import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/017_growth_engine_and_experiments.sql', 'utf8');

describe('growth engine backend security', () => {
  it('gates event and attribution writes on analytics consent and allowlisted properties', () => {
    expect(migration).toContain('analytics_consent');
    expect(migration).toContain("raise exception 'property not allowed'");
    expect(migration).toContain('on conflict(user_id,id) do nothing');
  });

  it('prevents self referral and grants rewards only through a service role processor', () => {
    expect(migration).toContain("raise exception 'self referral unavailable'");
    expect(migration).toContain("auth.role()<>'service_role'");
    expect(migration).toContain('invitee.verified');
    expect(migration).toContain("exists(select 1 from public.matches where status='mutual'");
    expect(migration).toContain('idempotency_key text not null unique');
  });

  it('keeps cohort snapshots and experiment definitions unavailable to members', () => {
    expect(migration).toContain('public.growth_daily_cohort_snapshots');
    expect(migration).toContain('revoke all on public.growth_attribution_touches');
    expect(migration).not.toContain('grant select on public.growth_experiments');
  });
});
