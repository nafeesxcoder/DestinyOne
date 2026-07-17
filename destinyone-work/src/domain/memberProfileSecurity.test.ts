import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/012_member_profile_mutation_security.sql',
  'utf8',
);

describe('member profile mutation security contract', () => {
  it('moves profile, preference, and photo writes behind one RPC', () => {
    expect(migration).toContain('create or replace function public.save_current_member_profile');
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke select, insert, update, delete on public.profiles from authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.user_preferences from authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.profile_photos from authenticated');
  });

  it('never accepts client-owned verification or approval fields', () => {
    expect(migration).toContain("'first_name','birth_date','city','profession','height_cm','religion'");
    expect(migration).not.toContain("'verified','onboarding_complete'");
    expect(migration).toContain('normalized_community, normalized_bio, false, true, normalized_voice_path');
    expect(migration).toContain('select viewer, path, position - 1, false');
  });

  it('validates age, media ownership, photo count, and preference limits', () => {
    expect(migration).toContain("current_date - interval '18 years'");
    expect(migration).toContain("o.bucket_id = 'profile-media'");
    expect(migration).toContain("path not like viewer::text || '/photo/%'");
    expect(migration).toContain('cardinality(p_photo_paths) > 6');
    expect(migration).toContain('cardinality(normalized_vibes) > 5');
  });

  it('keeps exact birth date owner-private through bootstrap', () => {
    expect(migration).toContain('create or replace function public.get_current_member_bootstrap()');
    expect(migration).toContain('security definer');
    expect(migration).toContain('grant select (');
    expect(migration).not.toMatch(/grant select \([\s\S]*birth_date[\s\S]*\) on public\.profiles/);
  });

  it('makes account deletion server-owned without exposing workflow status writes', () => {
    expect(migration).toContain('create or replace function public.request_account_deletion()');
    expect(migration).toContain('set status = \'requested\', requested_at = now(), completed_at = null');
    expect(migration).toContain('revoke insert, update, delete on public.deletion_requests from authenticated');
    expect(migration).toContain('grant execute on function public.request_account_deletion() to authenticated');
  });
});
