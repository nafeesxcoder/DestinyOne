import { describe, expect, it } from 'vitest';
import { canSendGift, spendCoins } from './commerce';

describe('gift wallet', () => {
  it('allows affordable positive-cost gifts', () => expect(canSendGift(100, 40)).toBe(true));
  it('rejects insufficient and invalid purchases', () => {
    expect(canSendGift(20, 40)).toBe(false);
    expect(canSendGift(100, 0)).toBe(false);
  });
  it('never creates a negative balance', () => {
    expect(spendCoins(20, 40)).toBe(20);
    expect(spendCoins(100, 40)).toBe(60);
  });
});

