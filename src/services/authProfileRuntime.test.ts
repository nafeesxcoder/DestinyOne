import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../lib/supabase');
});

async function loadBackend() {
  const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  vi.doMock('../lib/supabase', () => ({
    backendReadinessError: '',
    backendRuntime: { mode: 'supabase', allowsDemoOtp: false },
    isSupabaseConfigured: true,
    supabase: {
      auth: { signInWithOtp, verifyOtp, updateUser },
      rpc: vi.fn(),
      storage: { from: vi.fn() },
    },
  }));
  const backend = await import('./backend');
  return { backend, signInWithOtp, verifyOtp, updateUser };
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

  it('rejects empty, oversized, or unsupported profile media before upload', async () => {
    const { backend } = await loadBackend();
    expect(backend.validateProfileMediaUpload('photo', { size: 1024, type: 'image/jpeg' }, 'photo.jpg')).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
    expect(backend.validateProfileMediaUpload('voice', { size: 1024, type: '' }, 'intro.m4a')).toEqual({ contentType: 'audio/mp4', extension: 'm4a' });
    expect(() => backend.validateProfileMediaUpload('photo', { size: 0, type: 'image/jpeg' }, 'photo.jpg')).toThrow('empty');
    expect(() => backend.validateProfileMediaUpload('photo', { size: 11 * 1024 * 1024, type: 'image/jpeg' }, 'photo.jpg')).toThrow('10 MB');
    expect(() => backend.validateProfileMediaUpload('photo', { size: 1024, type: 'application/pdf' }, 'profile.pdf')).toThrow('JPEG');
  });
});
