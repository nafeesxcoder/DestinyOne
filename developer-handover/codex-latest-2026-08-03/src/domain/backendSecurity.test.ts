import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/010_backend_security_hardening.sql',
  'utf8',
);

describe('backend security migration contract', () => {
  it('makes the block graph authoritative for profiles, matches, and messages', () => {
    expect(migration).toContain('members view unblocked profiles');
    expect(migration).toContain('not public.is_blocked_pair(m.user_a, m.user_b)');
    expect(migration).toContain('active participants send messages');
    expect(migration).toContain("set status = 'blocked'");
    expect(migration).toContain('drop policy if exists "participants view messages after icebreaker"');
    expect(migration).toContain('where i.match_id = m.id and i.unlocked_at is not null');
  });

  it('removes direct mutation policies from server-owned relationship actions', () => {
    expect(migration).toContain('drop policy if exists "participants update icebreakers"');
    expect(migration).toContain('drop policy if exists "participants update date proposals"');
    expect(migration).toContain('participants view unblocked matches');
    expect(migration).toContain('members view unblocked relevant decisions');
    expect(migration).toContain('drop policy if exists "members create decisions"');
    expect(migration).toContain('drop policy if exists "members manage own blocks"');
  });

  it('keeps profile media private and scopes chat media to a mutual match', () => {
    expect(migration).toContain('members read approved profile media or own');
    expect(migration).toContain('active participants upload match chat media');
    expect(migration).toContain('(storage.foldername(name))[2] = (select auth.uid())::text');
    expect(migration).not.toContain("values ('profile-media','profile-media',true)");
  });

  it('exposes only authenticated bootstrap and block mutations', () => {
    expect(migration).toContain('revoke all on function public.get_current_member_bootstrap() from public');
    expect(migration).toContain('grant execute on function public.get_current_member_bootstrap() to authenticated');
    expect(migration).toContain('revoke all on function public.block_member(uuid) from public');
    expect(migration).toContain('revoke all on all tables in schema public from anon, authenticated');
    expect(migration).toContain('grant select, insert on public.messages to authenticated');
  });
});
