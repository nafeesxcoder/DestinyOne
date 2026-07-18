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

export function evaluateMemberDataRuntime(mode: BackendRuntimeMode, forcePreview = false): MemberDataRuntimePolicy {
  // forcePreview is supplied only by the development-only auth preview gate.
  // It makes the entire experience consistent: local profile and mock actions
  // should not attempt authenticated mutations when sign-in is intentionally skipped.
  const isPreview = mode === 'demo' || forcePreview;
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
