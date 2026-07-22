import type { BackendRuntimeMode } from './backendRuntime';

export type MemberDataRuntimePolicy = {
  source: 'preview' | 'server';
  allowsLocalHydration: boolean;
  allowsLocalPersistence: boolean;
  allowsMockMatches: boolean;
  initialCoinBalance: number;
};

export type MemberMutationResult = {
  saved: boolean;
  reason: 'backend' | 'preview_id' | 'demo' | 'error';
  error?: string;
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

export function canCommitMemberMutation(policy: MemberDataRuntimePolicy, result: MemberMutationResult) {
  if (policy.source === 'preview') return true;
  return result.saved && result.reason === 'backend';
}

export function memberMutationFailureMessage(result: MemberMutationResult, fallback: string) {
  if (result.reason === 'error' && result.error) return result.error;
  if (result.reason === 'preview_id') return 'This action is not linked to a verified member record.';
  if (result.reason === 'demo') return 'The secure server did not confirm this action.';
  return fallback;
}
