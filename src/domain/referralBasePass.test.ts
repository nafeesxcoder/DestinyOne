import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { membershipPlans } from './monetization';

const app = readFileSync('App.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/030_referral_base_pass.sql', 'utf8');

describe('verified referral Base Pass', () => {
  it('starts paid membership at $45 and keeps annual value explicit', () => {
    const base = membershipPlans.find((plan) => plan.id === 'base');
    expect(base?.monthlyCents).toBe(4500);
    expect(base?.annualCents).toBe(45000);
  });

  it('shows the referral offer only after onboarding completes', () => {
    expect(app.indexOf('setOnboardingComplete(true)')).toBeLessThan(app.indexOf('setReferralOfferOpen(true)'));
    expect(app).toContain('Invite a verified friend. Get Base free for 7 days.');
    expect(app).toContain('Share private invite');
  });

  it('requires verification, profile completion and risk clearance', () => {
    expect(migration).toContain('invitee.verified');
    expect(migration).toContain('invitee.onboarding_complete');
    expect(migration).toContain("r.decision='cleared'");
    expect(migration).not.toContain("exists(select 1 from public.matches where status='mutual'");
  });

  it('grants exactly seven days through an idempotent ledger entry', () => {
    expect(migration).toContain("'base_pass_7d',7,trim(p_idempotency_key)");
    expect(migration).toContain("now()+interval '7 days'");
    expect(migration).toContain('where idempotency_key=trim(p_idempotency_key)');
  });

  it('supports fraud reversal without removing free safety tools', () => {
    expect(migration).toContain("set status='revoked',revoked_at=now()");
    expect(app).toContain('Safety and privacy tools remain free for everyone.');
  });
});
