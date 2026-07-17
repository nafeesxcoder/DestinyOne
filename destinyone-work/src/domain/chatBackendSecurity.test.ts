import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/011_chat_mutation_and_rpc_privileges.sql',
  'utf8',
);

describe('server-owned chat mutation contract', () => {
  it('removes direct message writes and exposes the authenticated RPC', () => {
    expect(migration).toContain('drop policy if exists "active participants send messages"');
    expect(migration).toContain('revoke insert on public.messages from authenticated');
    expect(migration).toContain('create or replace function public.send_match_message');
    expect(migration).toContain('grant execute on function public.send_match_message');
  });

  it('enforces conversation trust boundaries and match-scoped media paths', () => {
    expect(migration).toContain('public.is_active_match_participant(p_match_id::text, viewer)');
    expect(migration).toContain("required_path_prefix := p_match_id::text || '/' || viewer::text || '/'");
    expect(migration).toContain("where i.match_id = m.id and i.unlocked_at is not null");
    expect(migration).toContain("p_member_id = auth.uid() or auth.role() = 'service_role'");
  });

  it('is idempotent and rate limits serialized sends', () => {
    expect(migration).toContain('messages_sender_client_message_id_unique');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('if found then return to_jsonb(saved_message); end if');
    expect(migration).toContain('if minute_count >= 15');
    expect(migration).toContain('if day_count >= 500');
  });

  it('locks default function execution and restores account deletion access', () => {
    expect(migration).toContain('grant select, insert, update on public.deletion_requests to authenticated');
    expect(migration).toContain('revoke all on function public.process_relationship_reminders(integer)');
    expect(migration).toContain('grant execute on function public.process_relationship_reminders(integer) to service_role');
    expect(migration).toContain('alter default privileges in schema public revoke execute on functions from public');
  });
});
