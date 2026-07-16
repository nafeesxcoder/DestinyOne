import { describe, expect, it } from 'vitest';
import { isEligibleMemberAge, isValidEmail, isValidPassword, isValidPhone } from './validation';

describe('authentication validation', () => {
  it('normalizes formatted phone numbers', () => expect(isValidPhone('+1 (415) 555-0199')).toBe(true));
  it('rejects malformed emails', () => expect(isValidEmail('hello@')).toBe(false));
  it('requires an eight-character password', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
  });
  it('keeps the current audience age gate at 25 to 35', () => {
    expect(isEligibleMemberAge('24')).toBe(false);
    expect(isEligibleMemberAge('25')).toBe(true);
    expect(isEligibleMemberAge('35')).toBe(true);
    expect(isEligibleMemberAge('36')).toBe(false);
  });
});
