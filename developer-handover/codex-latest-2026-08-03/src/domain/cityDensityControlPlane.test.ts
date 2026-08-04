import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/026_city_density_control_plane.sql', 'utf8');

describe('city density control plane', () => {
  it('records recent weekly metrics with provenance and idempotency', () => {
    expect(migration).toContain('create table if not exists public.city_metric_runs');
    expect(migration).toContain('consent_policy_version text not null');
    expect(migration).toContain('unique(source_name,source_job_id)');
    expect(migration).toContain("extract(isodow from p_snapshot_week)<>1");
    expect(migration).toContain("grant execute on function public.record_city_density_week");
  });

  it('suppresses small cohorts before operational storage', () => {
    expect(migration).toContain("(cohort->>'eligible_active_members')::integer<20 then 0");
    expect(migration).toContain("(cohort->>'eligible_active_members')::integer<20);");
    expect(migration).toContain('delete from public.city_cohort_snapshots');
  });

  it('requires eight fresh consecutive healthy weeks for expansion', () => {
    expect(migration).toContain('recent_count=8 and healthy_count=8 and week_span=49');
    expect(migration).toContain('latest.snapshot_week>=current_date-10');
    expect(migration).toContain("p_to_state='open'");
    expect(migration).toContain("raise exception 'Eight consecutive healthy weeks are required'");
  });

  it('requires two active reviewers including a safety lead', () => {
    expect(migration).toContain("p_primary_reviewer_id=p_secondary_reviewer_id");
    expect(migration).toContain("where id=p_primary_reviewer_id and status='active'");
    expect(migration).toContain("primary_row.role<>'safety_lead' and secondary_row.role<>'safety_lead'");
    expect(migration).toContain("decision_status:=case when to_rank<from_rank then 'rolled_back'");
  });

  it('enforces city state and pilot activation inside matching eligibility', () => {
    expect(migration).toContain('create or replace function public.city_discovery_pair_allowed');
    expect(migration).toContain("market.discovery_state in('controlled_pilot','healthy_pilot')");
    expect(migration).toContain("w.status='activated'");
    expect(migration).toContain('alter function public.matching_candidate_eligible(uuid,uuid) rename');
    expect(migration).toContain('and public.matching_candidate_eligible_without_city_gate(viewer,candidate)');
  });

  it('keeps metric, reviewer and decision records service-only', () => {
    for (const table of ['city_metric_runs', 'city_ops_reviewers', 'city_expansion_decisions']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('revoke all on public.city_metric_runs,public.city_ops_reviewers,public.city_expansion_decisions from public,anon,authenticated');
  });
});
