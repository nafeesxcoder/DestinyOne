import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/032_couple_account_pairing.sql', 'utf8');

describe('couple phone pairing backend security', () => {
  it('uses exact E.164 verified-phone lookup without public or partial search', () => {
    expect(migration).toContain("normalized_phone!~'^\\+[1-9][0-9]{7,14}$'");
    expect(migration).toContain('u.phone=normalized_phone');
    expect(migration).toContain('u.phone_confirmed_at is not null');
    expect(migration).not.toMatch(/u\.phone\s+(ilike|like)/i);
  });

  it('rate limits search and stores only a phone hash in its audit trail', () => {
    expect(migration).toContain("created_at>now()-interval '1 hour'");
    expect(migration).toContain('target_phone_hash');
    expect(migration).toContain("encode(digest(normalized_phone,'sha256'),'hex')");
    expect(migration).not.toMatch(/couple_phone_search_audit[^;]+phone_e164/is);
  });

  it('requires Couple Mode, blocks self-pairing, and requires recipient acceptance', () => {
    expect(migration).toContain("em.mode='couple'");
    expect(migration).toContain("p_recipient_id=actor then raise exception 'You cannot request your own account'");
    expect(migration).toContain('recipient_id=actor for update');
    expect(migration).toContain('if not p_accept then');
  });

  it('removes both connected accounts from server matching eligibility', () => {
    expect(migration).toContain("em.user_id in(viewer,candidate) and em.mode='couple'");
    expect(migration).toContain('delete from public.daily_match_recommendations');
  });
});

