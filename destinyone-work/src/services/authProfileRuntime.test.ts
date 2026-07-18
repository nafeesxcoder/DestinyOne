import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../lib/supabase');
});

async function loadBackend() {
  const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn();
  vi.doMock('../lib/supabase', () => ({
    backendReadinessError: '',
    backendRuntime: { mode: 'supabase', allowsDemoOtp: false },
    isSupabaseConfigured: true,
    supabase: {
      auth: { signInWithOtp, verifyOtp, updateUser },
      rpc,
      storage: { from: vi.fn() },
    },
  }));
  const backend = await import('./backend');
  return { backend, signInWithOtp, verifyOtp, updateUser, rpc };
}

describe('production Auth and profile-media runtime', () => {
  it('sends canonical E.164 phone values to Supabase', async () => {
    const { backend, signInWithOtp, verifyOtp } = await loadBackend();
    await backend.beginAuthentication({ mode: 'phone', phone: '(415) 555-0199' });
    await backend.verifyAuthentication('+1 (415) 555-0199', '123987');
    expect(signInWithOtp).toHaveBeenCalledWith({ phone: '+14155550199' });
    expect(verifyOtp).toHaveBeenCalledWith({ phone: '+14155550199', token: '123987', type: 'sms' });
  });

  it('requires a strong password and attaches it only after real email OTP verification', async () => {
    const { backend, signInWithOtp, verifyOtp, updateUser } = await loadBackend();
    await expect(backend.beginAuthentication({ mode: 'email', email: 'member@example.com', password: 'weakpass' })).rejects.toThrow('uppercase');
    await backend.beginAuthentication({ mode: 'email', email: 'Member@Example.com ', password: 'Destiny123' });
    await backend.verifyAuthentication('Member@Example.com ', '654321', 'Destiny123');
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'member@example.com' }));
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'member@example.com', token: '654321', type: 'email' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'Destiny123' });
  });

  it('turns provider and rate-limit failures into clear member-facing messages', async () => {
    const { backend, signInWithOtp } = await loadBackend();
    signInWithOtp.mockResolvedValueOnce({ error: new Error('over_email_send_rate_limit') });
    await expect(backend.beginAuthentication({ mode: 'email', email: 'member@example.com', password: 'Destiny123' }))
      .rejects.toThrow('Too many email codes');
    signInWithOtp.mockResolvedValueOnce({ error: new Error('SMS provider is not enabled') });
    await expect(backend.beginAuthentication({ mode: 'phone', phone: '+1 415 555 0199' }))
      .rejects.toThrow('Phone verification is not available yet');
  });

  it('rejects empty, oversized, or unsupported profile media before upload', async () => {
    const { backend } = await loadBackend();
    expect(backend.validateProfileMediaUpload('photo', { size: 1024, type: 'image/jpeg' }, 'photo.jpg')).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
    expect(backend.validateProfileMediaUpload('voice', { size: 1024, type: '' }, 'intro.m4a')).toEqual({ contentType: 'audio/mp4', extension: 'm4a' });
    expect(() => backend.validateProfileMediaUpload('photo', { size: 0, type: 'image/jpeg' }, 'photo.jpg')).toThrow('empty');
    expect(() => backend.validateProfileMediaUpload('photo', { size: 11 * 1024 * 1024, type: 'image/jpeg' }, 'photo.jpg')).toThrow('10 MB');
    expect(() => backend.validateProfileMediaUpload('photo', { size: 1024, type: 'application/pdf' }, 'profile.pdf')).toThrow('JPEG');
  });

  it('parses only bounded, actionable matching pool status', async () => {
    const { backend, rpc } = await loadBackend();
    rpc.mockResolvedValueOnce({ data: { status: 'sparse', eligible_count: 3, daily_limit: 5, repeat_cooldown_days: 14, suggestions: ['More verified members are joining', 42] }, error: null });
    await expect(backend.fetchMatchingPoolStatus()).resolves.toEqual({
      status: 'sparse', eligibleCount: 3, dailyLimit: 5, repeatCooldownDays: 14, suggestions: ['More verified members are joining'],
    });
    rpc.mockResolvedValueOnce({ data: { status: 'internal_score', eligible_count: 9 }, error: null });
    await expect(backend.fetchMatchingPoolStatus()).rejects.toThrow('invalid status');
  });
});
