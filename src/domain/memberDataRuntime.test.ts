import { describe, expect, it } from 'vitest';
import { evaluateMemberDataRuntime } from './memberDataRuntime';

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
});
