import { describe, expect, it } from 'vitest';
import {
  acceptanceBlockReason,
  computeQuoteTotals,
  issueQuoteShareToken,
  quoteShareTokenHash,
} from '../../src/modules/quotes/quote.js';

describe('quote totals', () => {
  it('recomputes line totals and splits the deposit without floats', () => {
    const totals = computeQuoteTotals(
      [
        { description: 'Full-day coverage', quantity: 1, unitPriceKobo: 45_000_00 },
        { description: 'Second photographer', quantity: 2, unitPriceKobo: 10_000_00 },
      ],
      40,
    );

    expect(totals.subtotalKobo).toBe(65_000_00);
    expect(totals.totalKobo).toBe(65_000_00);
    expect(totals.depositKobo).toBe(26_000_00);
    expect(totals.balanceKobo).toBe(39_000_00);
    expect(totals.depositPercent).toBe(40);
  });

  it('rounds an odd deposit to the nearest kobo and leaves the balance exact', () => {
    const totals = computeQuoteTotals(
      [{ description: 'Session', quantity: 1, unitPriceKobo: 10_001 }],
      33,
    );
    expect(totals.depositKobo).toBe(3300);
    expect(totals.depositKobo + totals.balanceKobo).toBe(totals.totalKobo);
  });

  it('allows a zero deposit and a full deposit', () => {
    const items = [{ description: 'Retainer', quantity: 1, unitPriceKobo: 5_000 }];
    expect(computeQuoteTotals(items, 0)).toMatchObject({ depositKobo: 0, balanceKobo: 5000 });
    expect(computeQuoteTotals(items, 100)).toMatchObject({
      depositKobo: 5000,
      balanceKobo: 0,
    });
  });

  it('rejects an empty quote, bad quantities, and negative prices', () => {
    expect(() => computeQuoteTotals([], 10)).toThrow(/between 1 and/);
    expect(() =>
      computeQuoteTotals([{ description: 'x', quantity: 0, unitPriceKobo: 100 }], 10),
    ).toThrow(/Quantity/);
    expect(() =>
      computeQuoteTotals([{ description: 'x', quantity: 1, unitPriceKobo: -1 }], 10),
    ).toThrow(/Unit price/);
    expect(() =>
      computeQuoteTotals([{ description: 'x', quantity: 1, unitPriceKobo: 100 }], 101),
    ).toThrow(/Deposit percentage/);
  });

  it('rejects line totals outside the safe integer range', () => {
    expect(() =>
      computeQuoteTotals(
        [{ description: 'x', quantity: 10_000, unitPriceKobo: Number.MAX_SAFE_INTEGER }],
        10,
      ),
    ).toThrow(/Line total/);
  });
});

describe('quote share tokens', () => {
  it('issues a URL-safe token and stores only a SHA-256 digest', () => {
    const { token, hash } = issueQuoteShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(quoteShareTokenHash(token)).toBe(hash);
  });

  it('never issues the same token twice', () => {
    const first = issueQuoteShareToken();
    const second = issueQuoteShareToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).not.toBe(second.hash);
  });
});

describe('quote acceptance rules', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const future = new Date('2026-12-05T12:00:00Z');
  const past = new Date('2026-11-27T12:00:00Z');

  function check(overrides: Partial<Parameters<typeof acceptanceBlockReason>[0]>) {
    return acceptanceBlockReason(
      { status: 'sent', version: 2, latestVersion: 2, validUntil: future, ...overrides },
      now,
    );
  }

  it('accepts the latest sent version before expiry', () => {
    expect(check({})).toBeNull();
  });

  it('refuses an older version even when its token is still valid', () => {
    expect(check({ version: 1, latestVersion: 2 })).toMatch(/newer version/);
  });

  it('refuses an expired send', () => {
    expect(check({ validUntil: past })).toMatch(/expired/);
  });

  it('refuses drafts, accepted, declined, expired, and superseded versions', () => {
    expect(check({ status: 'draft' })).toMatch(/not been sent/);
    expect(check({ status: 'accepted' })).toMatch(/already been accepted/);
    expect(check({ status: 'declined' })).toMatch(/declined/);
    expect(check({ status: 'expired' })).toMatch(/expired/);
    expect(check({ status: 'superseded' })).toMatch(/newer version/);
  });
});
