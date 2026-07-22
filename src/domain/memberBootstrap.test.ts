import { describe, expect, it } from 'vitest';
import { memberNeedsOnboarding, parseMemberBootstrap } from './memberBootstrap';

describe('member bootstrap', () => {
  it('parses the server-owned profile, preferences, and ordered photo metadata', () => {
    const member = parseMemberBootstrap({
      user_id: 'member-1',
      profile: { id: 'member-1', onboarding_complete: true, first_name: 'Maya' },
      preferences: { user_id: 'member-1', intent: 'marriage' },
      matching_preferences: { user_id: 'member-1', looking_for: 'men', min_age: 25, max_age: 35 },
      match_attributes: { user_id: 'member-1', gender: 'woman' },
      photos: [{ id: 'photo-1', storage_path: 'member-1/photo.jpg', position: 0, approved: true }],
    });
    expect(member.userId).toBe('member-1');
    expect(member.photos).toEqual([{ id: 'photo-1', storage_path: 'member-1/photo.jpg', position: 0, approved: true }]);
    expect(member.matchAttributes?.gender).toBe('woman');
    expect(memberNeedsOnboarding(member)).toBe(false);
  });

  it('treats a signed-in member without a complete profile as onboarding', () => {
    const member = parseMemberBootstrap({ user_id: 'member-2', profile: null, preferences: null, photos: [] });
    expect(memberNeedsOnboarding(member)).toBe(true);
  });

  it('rejects malformed server payloads instead of trusting local identity', () => {
    expect(() => parseMemberBootstrap({ profile: {} })).toThrow('invalid member bootstrap');
  });
});
