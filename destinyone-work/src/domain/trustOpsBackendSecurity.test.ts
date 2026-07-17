import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/025_trust_ops_case_management.sql', 'utf8');

describe('Trust Ops backend security contract', () => {
  it('creates a private moderation case and immutable event from every report', () => {
    expect(migration).toContain('create trigger reports_create_moderation_case');
    expect(migration).toContain('after insert on public.reports');
    expect(migration).toContain("'case_created'");
    expect(migration).toContain('unique(case_id,idempotency_key)');
  });

  it('keeps staff, cases, events, enforcement and appeals outside member table access', () => {
    for (const table of ['trust_ops_reviewers', 'moderation_cases', 'moderation_case_events', 'member_enforcement_states', 'moderation_appeals']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('revoke all on public.trust_ops_reviewers,public.moderation_cases,public.moderation_case_events,public.member_enforcement_states,public.moderation_appeals from public,anon,authenticated');
  });

  it('enforces bounded freezes on every sensitive member surface', () => {
    for (const trigger of [
      'messages_enforce_safety_freeze',
      'likes_enforce_safety_freeze',
      'gifts_enforce_safety_freeze',
      'gift_orders_enforce_safety_freeze',
      'date_proposals_enforce_safety_freeze',
      'billing_sessions_enforce_safety_freeze',
    ]) expect(migration).toContain(`create trigger ${trigger}`);
    expect(migration).toContain("scope not in('discovery','chat','gifts','payments','dates')");
    expect(migration).toContain('expiry_hours not between 1 and 72');
  });

  it('requires active qualified reviewers and elevated review for critical decisions', () => {
    expect(migration).toContain("where id=p_reviewer_id and status='active'");
    expect(migration).toContain("case_row.severity='critical' and p_action in('resolve','dismiss')");
    expect(migration).toContain("reviewer_row.role not in('lead','legal')");
    expect(migration).toContain("role in('lead','legal')");
    expect(migration).toContain("current_setting('request.jwt.claim.role',true),'')<>'service_role'");
  });

  it('limits appeals to the affected signed-in member and service-owned resolution', () => {
    expect(migration).toContain('viewer uuid:=auth.uid()');
    expect(migration).toContain('where id=p_case_id and subject_id=viewer');
    expect(migration).toContain("case_row.status not in('frozen','resolved','dismissed')");
    expect(migration).toContain('grant execute on function public.submit_moderation_appeal(uuid,text,text) to authenticated');
    expect(migration).toContain('grant execute on function public.resolve_moderation_appeal(uuid,text,uuid,text,text) to service_role');
  });
});
