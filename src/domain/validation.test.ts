import { describe, expect, it } from 'vitest';
import { isEligibleMemberAge, isValidEmail, isValidPassword, isValidPhone, normalizeAuthPhone } from './validation';

describe('authentication validation', () => {
  it('normalizes formatted phone numbers to E.164', () => {
    expect(normalizeAuthPhone('(415) 555-0199')).toBe('+14155550199');
    expect(normalizeAuthPhone('+1 (415) 555-0199')).toBe('+14155550199');
    expect(normalizeAuthPhone('12345')).toBeNull();
    expect(isValidPhone('+1 (415) 555-0199')).toBe(true);
  });
  it('rejects malformed emails', () => expect(isValidEmail('hello@')).toBe(false));
  it('requires a ten-character mixed password', () => {
    expect(isValidPassword('1234567890')).toBe(false);
    expect(isValidPassword('Destiny123')).toBe(true);
  });
  it('keeps the current audience age gate at 25 to 35', () => {
    expect(isEligibleMemberAge('24')).toBe(false);
    expect(isEligibleMemberAge('25')).toBe(true);
    expect(isEligibleMemberAge('35')).toBe(true);
    expect(isEligibleMemberAge('36')).toBe(false);
  });
});
