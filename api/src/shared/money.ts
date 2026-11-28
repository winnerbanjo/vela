/**
 * Money is always an integer number of kobo. Floats never reach the database,
 * and formatting belongs to the client, so this module only converts and
 * guards.
 */
export const KOBO_PER_NAIRA = 100;

/** Converts a naira amount to kobo, rounding half away from zero. */
export function toKobo(naira: number): number {
  if (!Number.isFinite(naira)) {
    throw new RangeError('Amount must be a finite number');
  }
  const kobo = Math.round(naira * KOBO_PER_NAIRA);
  if (!Number.isSafeInteger(kobo)) {
    throw new RangeError('Amount is outside the safe integer range');
  }
  return kobo;
}

/** Asserts a value is a non-negative integer kobo amount. */
export function assertKobo(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Amount must be a non-negative integer number of kobo');
  }
  return value;
}

/** Splits an invoice total into deposit and balance without float math. */
export function splitDeposit(
  totalKobo: number,
  depositPercent: number,
): {
  readonly depositKobo: number;
  readonly balanceKobo: number;
} {
  assertKobo(totalKobo);
  if (!Number.isInteger(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    throw new RangeError('Deposit percentage must be an integer between 0 and 100');
  }
  const depositKobo = Math.round((totalKobo * depositPercent) / 100);
  return { depositKobo, balanceKobo: totalKobo - depositKobo };
}
