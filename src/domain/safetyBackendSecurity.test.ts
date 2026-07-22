import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/013_safety_actions_and_live_location.sql',
  'utf8',
);

describe('safety backend security migration contract', () => {
  it('owns reports on the server with idempotency, limits, and severity SLAs', () => {
    expect(migration).toContain('function public.submit_member_report');
    expect(migration).toContain('reports_reporter_client_action_unique');
    expect(migration).toContain("if recent_count >= 10 then raise exception 'Daily report limit reached'");
    expect(migration).toContain("when 'critical' then interval '15 minutes'");
    expect(migration).toContain('revoke insert, update, delete on public.reports from authenticated');
  });

  it('records append-only audit events for safety mutations', () => {
    expect(migration).toContain('create table if not exists public.safety_action_events');
    expect(migration).toContain("'report_submitted'");
    expect(migration).toContain("'member_blocked'");
    expect(migration).toContain("'match_unmatched'");
    expect(migration).toContain("'live_location_started'");
    expect(migration).not.toContain('grant insert on public.safety_action_events');
  });

  it('persists mutual unmatch and terminates active location sharing', () => {
    expect(migration).toContain('function public.unmatch_member');
    expect(migration).toContain("if relation.status <> 'mutual'");
    expect(migration).toContain("update public.matches set status = 'passed'");
    expect(migration).toContain('set live = false, expires_at = least(expires_at, now())');
  });

  it('gates live location behind an active conversation without auditing coordinates', () => {
    expect(migration).toContain('function public.start_live_location_share');
    expect(migration).toContain('public.is_active_match_participant(p_match_id::text, viewer)');
    expect(migration).toContain("if recent_count >= 6 then raise exception 'Live location share limit reached'");
    expect(migration).toContain('if p_duration_minutes not between 5 and 60');
    expect(migration).toContain("jsonb_build_object('duration_minutes', p_duration_minutes)");
    expect(migration).not.toContain("jsonb_build_object('latitude'");
    expect(migration).toContain('revoke insert, update, delete on public.live_location_shares from authenticated');
  });
});
