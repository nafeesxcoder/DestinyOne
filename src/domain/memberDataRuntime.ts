import type { BackendRuntimeMode } from './backendRuntime';

export type MemberDataRuntimePolicy = {
  source: 'preview' | 'server';
  allowsLocalHydration: boolean;
  allowsLocalPersistence: boolean;
  allowsMockMatches: boolean;
  initialCoinBalance: number;
};

export function evaluateMemberDataRuntime(mode: BackendRuntimeMode): MemberDataRuntimePolicy {
  const isPreview = mode === 'demo';
  return {
    source: isPreview ? 'preview' : 'server',
    allowsLocalHydration: isPreview,
    allowsLocalPersistence: isPreview,
    allowsMockMatches: isPreview,
    initialCoinBalance: isPreview ? 500 : 0,
  };
}
