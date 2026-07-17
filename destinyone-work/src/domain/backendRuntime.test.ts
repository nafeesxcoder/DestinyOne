import { describe, expect, it } from 'vitest';
import { evaluateBackendRuntime } from './backendRuntime';

const realConfig = {
  supabaseUrl: 'https://destinyone.supabase.co',
  supabaseAnonKey: 'sb_publishable_12345678901234567890',
};

describe('backend runtime policy', () => {
  it('keeps a local preview usable when no backend is requested', () => {
    expect(evaluateBackendRuntime({ appEnvironment: 'development' })).toMatchObject({
      mode: 'demo',
      allowsDemoOtp: true,
      isSupabaseConfigured: false,
    });
  });

  it('uses Supabase in development while allowing the explicit preview OTP fallback', () => {
    expect(evaluateBackendRuntime({ ...realConfig, appEnvironment: 'development' })).toMatchObject({
      mode: 'supabase',
      allowsDemoOtp: true,
      isSupabaseConfigured: true,
    });
  });

  it('fails closed when only half of the Supabase configuration is present', () => {
    const policy = evaluateBackendRuntime({ supabaseUrl: realConfig.supabaseUrl });
    expect(policy.mode).toBe('blocked');
    expect(policy.blockingReason).toContain('both');
  });

  it('requires an explicit real-backend lock and release environment values in production', () => {
    expect(evaluateBackendRuntime({ ...realConfig, appEnvironment: 'production' }).mode).toBe('blocked');
    expect(evaluateBackendRuntime({
      ...realConfig,
      appEnvironment: 'production',
      requiresRealBackend: true,
    }).mode).toBe('blocked');

    expect(evaluateBackendRuntime({
      ...realConfig,
      appEnvironment: 'production',
      requiresRealBackend: true,
      hasExplicitSupabaseUrl: true,
      hasExplicitSupabaseAnonKey: true,
    })).toMatchObject({ mode: 'supabase', allowsDemoOtp: false, blockingReason: '' });
  });

  it('never accepts malformed URLs or secret-like arbitrary keys', () => {
    const policy = evaluateBackendRuntime({
      appEnvironment: 'production',
      requiresRealBackend: true,
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'service-role-secret-that-should-not-ship',
      hasExplicitSupabaseUrl: true,
      hasExplicitSupabaseAnonKey: true,
    });
    expect(policy.mode).toBe('blocked');
    expect(policy.isSupabaseConfigured).toBe(false);
  });
});
