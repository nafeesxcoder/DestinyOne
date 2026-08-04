import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/028_growth_operations_control_plane.sql', 'utf8');

describe('growth operations control plane', () => {
  it('accepts funnel outcomes only when backed by authoritative product records', () => {
    expect(migration).toContain('growth_outcome_is_verified(viewer,p_event_name)');
    expect(migration).toContain("count(*)>=6 and count(distinct msg.sender_id)=2");
    expect(migration).toContain("d.status in('accepted','completed')");
    expect(migration).toContain("source,verified_at");
  });

  it('requires active matching campaigns for non-direct attribution', () => {
    expect(migration).toContain('create table if not exists public.growth_campaigns');
    expect(migration).toContain("c.channel=normalized_channel and c.status='active'");
    expect(migration).toContain("Direct or organic touch cannot claim a campaign");
  });

  it('requires distinct product, data and safety approvals before rollout', () => {
    expect(migration).toContain('create table if not exists public.growth_experiment_approvals');
    expect(migration).toContain('count(distinct a.reviewer_role)');
    expect(migration).toContain('count(distinct a.reviewer_id)');
    expect(migration).toContain('growth_experiment_control_guard');
  });

  it('records exposure and automatically pauses breached experiments', () => {
    expect(migration).toContain('record_growth_experiment_exposure');
    expect(migration).toContain('create table if not exists public.growth_experiment_metric_snapshots');
    expect(migration).toContain("set status='paused',kill_switch=true");
    expect(migration).toContain("p_decision='ship' and coalesce(sample,0)<experiment.minimum_sample_size");
  });

  it('grants referral value only after risk review and supports ledger reversal', () => {
    expect(migration).toContain('create table if not exists public.growth_referral_risk_reviews');
    expect(migration).toContain("r.decision='cleared'");
    expect(migration).toContain("'verified_referral_reward'");
    expect(migration).toContain("'referral_reward_reversed'");
  });

  it('records cohort economics with immutable ingestion provenance', () => {
    expect(migration).toContain('create table if not exists public.growth_cohort_ingestion_runs');
    expect(migration).toContain('payload_hash');
    expect(migration).toContain("raise exception 'Cohort funnel counts are inconsistent'");
    expect(migration).toContain('contribution_margin_cents');
  });

  it('honors analytics withdrawal without deleting financial fraud records', () => {
    expect(migration).toContain('withdraw_growth_analytics_consent');
    expect(migration).toContain('delete from public.growth_experiment_assignments where user_id=viewer');
    expect(migration).toContain('delete from public.growth_attribution_touches where user_id=viewer');
    expect(migration).toContain('delete from public.growth_events where user_id=viewer');
    expect(migration).not.toContain('delete from public.growth_reward_ledger where user_id=viewer');
  });
});
