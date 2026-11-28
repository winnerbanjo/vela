import { describe, expect, it } from 'vitest';
import { assertKobo, splitDeposit, toKobo } from '../../src/shared/money.js';

describe('money', () => {
  it('converts naira to integer kobo', () => {
    expect(toKobo(4500)).toBe(450_000);
    expect(toKobo(0)).toBe(0);
    expect(toKobo(19.999)).toBe(2000);
    expect(Number.isInteger(toKobo(0.1 + 0.2))).toBe(true);
  });

  it('rejects non-finite and out-of-range amounts', () => {
    expect(() => toKobo(Number.NaN)).toThrow(RangeError);
    expect(() => toKobo(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toKobo(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it('guards kobo invariants', () => {
    expect(assertKobo(0)).toBe(0);
    expect(() => assertKobo(-1)).toThrow(RangeError);
    expect(() => assertKobo(10.5)).toThrow(RangeError);
  });

  it('splits the PRD quote example without losing a kobo', () => {
    const total = 450_000 * 100;
    const { depositKobo, balanceKobo } = splitDeposit(total, 40);

    expect(depositKobo).toBe(18_000_000);
    expect(balanceKobo).toBe(27_000_000);
    expect(depositKobo + balanceKobo).toBe(total);
  });

  it('keeps the sum exact for awkward percentages', () => {
    for (const percent of [0, 1, 33, 50, 99, 100]) {
      const { depositKobo, balanceKobo } = splitDeposit(99_999, percent);
      expect(depositKobo + balanceKobo).toBe(99_999);
      expect(Number.isInteger(depositKobo)).toBe(true);
    }
  });

  it('rejects invalid percentages', () => {
    expect(() => splitDeposit(1000, 101)).toThrow(RangeError);
    expect(() => splitDeposit(1000, -1)).toThrow(RangeError);
    expect(() => splitDeposit(1000, 33.3)).toThrow(RangeError);
  });
});
