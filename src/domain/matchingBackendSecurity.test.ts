import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/014_matching_intelligence.sql', 'utf8');

describe('matching intelligence migration contract', () => {
  it('applies reciprocal hard filters before ranking', () => {
    expect(migration).toContain('function public.matching_candidate_eligible');
    expect(migration).toContain("vf.looking_for='women' and ca.gender='woman'");
    expect(migration).toContain("cf.looking_for='women' and va.gender='woman'");
    expect(migration).toContain('cu.vibes @> vf.must_have_vibes');
    expect(migration).toContain("m.status in('mutual','passed','blocked')");
    expect(migration).toContain('not public.is_blocked_pair(viewer,candidate)');
    expect(migration).toContain('This member is not in your current introductions.');
    expect(migration).toContain('Daily match decision limit reached');
  });

  it('uses only consented first-party outcomes and hides internal scores', () => {
    expect(migration).toContain('mf.use_for_matching');
    expect(migration).toContain('rls.active');
    expect(migration).toContain('reasons text[]');
    expect(migration).toContain('grant select(id,user_id,target_id,match_id,recommendation_day,rank,label,reasons,model_version,created_at)');
    expect(migration).not.toContain('grant select on public.daily_match_recommendations');
  });

  it('supports exposure-aware ordering, quality snapshots, and model rollback', () => {
    expect(migration).toContain('daily_match_target_exposure_idx');
    expect(migration).toContain('order by computed_score desc,base.exposure_count asc');
    expect(migration).toContain('function public.activate_matching_model');
    expect(migration).toContain('function public.record_matching_quality_snapshot');
    expect(migration).toContain("update public.matching_model_versions set status='retired'");
    expect(migration).toContain("action in ('activated','quality_snapshot')");
    expect(migration).toContain("current_setting('request.jwt.claim.role',true),'')<>'service_role'");
    expect(migration).toContain("'max_group_exposure_gap'");
  });

  it('keeps religion and community out of the ranking formula', () => {
    const rankingBody = migration.split('create function public.daily_matches')[1]?.split('create or replace function public.submit_match_feedback')[0] ?? '';
    expect(rankingBody).not.toContain('.religion');
    expect(rankingBody).not.toContain('.community');
    expect(rankingBody).not.toContain('score_internal from public.profiles');
    expect(migration).toContain("weights ?| array['gender','religion','community','ethnicity','caste']");
  });
});
