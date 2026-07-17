import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = `${readFileSync('supabase/migrations/014_matching_intelligence.sql', 'utf8')}\n${readFileSync('supabase/migrations/022_matching_quality_v2.sql', 'utf8')}`;
const v2 = readFileSync('supabase/migrations/022_matching_quality_v2.sql', 'utf8');
const evaluationGate = readFileSync('supabase/migrations/024_matching_evaluation_gate.sql', 'utf8');
const backend = readFileSync('src/services/backend.ts', 'utf8');
const persistence = readFileSync('src/services/appPersistence.ts', 'utf8');
const app = readFileSync('App.tsx', 'utf8');

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
    expect(v2).toContain('and (cf.family_priority=\'any\' or va.family_priority=cf.family_priority)');
    expect(v2).toContain('and (cf.children=\'any\' or va.children_intent=cf.children)');
    expect(v2).toContain('and public.matching_location_eligible(cf.distance_preference');
    expect(v2).toContain('p.verified');
    expect(v2).toContain('where l.sender_id=viewer and l.recipient_id=candidate');
    expect(v2).toContain('r.recommendation_day>=current_date-14');
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
    expect(v2).toContain('matching_model_guardrails');
    expect(v2).toContain("'rollback_required'");
    expect(v2).toContain('function public.rollback_matching_model');
    expect(v2).toContain("grant execute on function public.rollback_matching_model(text,text,text) to service_role");
  });

  it('keeps religion and community out of the ranking formula', () => {
    const rankingBody = v2.split('create or replace function public.rank_matching_candidates')[1]?.split('drop function if exists public.daily_matches')[0] ?? '';
    expect(rankingBody).not.toContain('.religion');
    expect(rankingBody).not.toContain('.community');
    expect(rankingBody).not.toContain('score_internal from public.profiles');
    expect(migration).toContain("weights ?| array['gender','religion','community','ethnicity','caste']");
    expect(rankingBody).toContain("mf.feedback in('promising','met_in_person')");
    expect(rankingBody).not.toContain("mf.feedback='not_aligned'");
    expect(rankingBody).toContain("weights->>'exposure_penalty'");
    expect(rankingBody).toContain("weights->>'shared_language'");
  });

  it('requires recent privacy-safe offline and shadow evidence before model promotion', () => {
    expect(evaluationGate).toContain('create table if not exists public.matching_evaluation_runs');
    expect(evaluationGate).toContain("evaluation_kind in ('offline', 'shadow')");
    expect(evaluationGate).toContain("not (p_metrics ?& array['precision_at_5','eligible_coverage_rate','safety_exclusion_recall','max_group_exposure_gap'])");
    expect(evaluationGate).toContain("key not in(\n       'precision_at_5','eligible_coverage_rate','safety_exclusion_recall','max_group_exposure_gap','score_drift'");
    expect(evaluationGate).toContain("count(distinct evaluation_kind)");
    expect(evaluationGate).toContain("created_at>=now()-interval '14 days'");
    expect(evaluationGate).toContain("passed_evaluation_kinds<>2");
    expect(evaluationGate).toContain('Recent passing offline and shadow evaluations are required');
  });

  it('wires explicit-consent outcome feedback from the member UI to the server RPC', () => {
    expect(backend).toContain("supabase.rpc('submit_match_feedback'");
    expect(persistence).toContain('submitMatchFeedback(matchId, feedback, useForMatching');
    expect(app).toContain('useFeedbackForMatching,setUseFeedbackForMatching]=useState(false)');
    expect(app).toContain('Use this outcome to improve my future introductions');
    expect(app).toContain('It is never shown to {match.name}');
  });
});
