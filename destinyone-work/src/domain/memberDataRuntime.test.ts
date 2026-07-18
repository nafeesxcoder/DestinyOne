import { describe, expect, it } from 'vitest';
import { canCommitMemberMutation, evaluateMemberDataRuntime, memberMutationFailureMessage } from './memberDataRuntime';

describe('member data runtime policy', () => {
  it('keeps local demo data available only in preview mode', () => {
    expect(evaluateMemberDataRuntime('demo')).toEqual({
      source: 'preview',
      allowsLocalHydration: true,
      allowsLocalPersistence: true,
      allowsMockMatches: true,
      initialCoinBalance: 500,
    });
  });

  it.each(['supabase', 'blocked'] as const)('fails closed in %s mode', mode => {
    expect(evaluateMemberDataRuntime(mode)).toEqual({
      source: 'server',
      allowsLocalHydration: false,
      allowsLocalPersistence: false,
      allowsMockMatches: false,
      initialCoinBalance: 0,
    });
  });

  it('allows an explicitly requested development preview to use local state', () => {
    expect(evaluateMemberDataRuntime('supabase', true)).toMatchObject({
      source: 'preview',
      allowsLocalHydration: true,
      allowsLocalPersistence: true,
      allowsMockMatches: true,
    });
  });

  it('commits preview actions locally but requires backend acknowledgement in server mode', () => {
    const preview = evaluateMemberDataRuntime('demo');
    const server = evaluateMemberDataRuntime('supabase');
    const previewOnly = { saved: false, reason: 'preview_id' as const };
    const backend = { saved: true, reason: 'backend' as const };
    expect(canCommitMemberMutation(preview, previewOnly)).toBe(true);
    expect(canCommitMemberMutation(server, previewOnly)).toBe(false);
    expect(canCommitMemberMutation(server, backend)).toBe(true);
  });

  it('returns specific safe failure copy', () => {
    expect(memberMutationFailureMessage({ saved: false, reason: 'error', error: 'Network unavailable.' }, 'Try again.')).toBe('Network unavailable.');
    expect(memberMutationFailureMessage({ saved: false, reason: 'preview_id' }, 'Try again.')).toContain('verified member');
    expect(memberMutationFailureMessage({ saved: false, reason: 'demo' }, 'Try again.')).toContain('did not confirm');
  });
});
