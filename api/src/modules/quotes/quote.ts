import { createHash } from 'node:crypto';
import { generateOpaqueToken } from '../identity/tokens.js';

/**
 * Quote arithmetic and acceptance rules.
 *
 * Totals are never trusted from the client: they are recomputed here from the
 * line items, and the deposit is a percentage of that server-side total. A
 * quote version is immutable once sent, so a revised price is a new version.
 */

export interface QuoteItemInput {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceKobo: number;
}

export interface QuoteTotals {
  readonly subtotalKobo: number;
  readonly totalKobo: number;
  readonly depositPercent: number;
  readonly depositKobo: number;
  readonly balanceKobo: number;
}

export const MAX_QUOTE_ITEMS = 50;
export const MAX_QUANTITY = 10_000;

function assertSafeKobo(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of kobo`);
  }
}

/** Recomputes line totals, subtotal, and the deposit split. */
export function computeQuoteTotals(
  items: readonly QuoteItemInput[],
  depositPercent: number,
): QuoteTotals {
  if (items.length === 0 || items.length > MAX_QUOTE_ITEMS) {
    throw new RangeError(`A quote needs between 1 and ${MAX_QUOTE_ITEMS} line items`);
  }
  if (!Number.isInteger(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    throw new RangeError('Deposit percentage must be an integer between 0 and 100');
  }

  const lines = items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      throw new RangeError(`Quantity must be between 1 and ${MAX_QUANTITY}`);
    }
    assertSafeKobo(item.unitPriceKobo, 'Unit price');
    const totalKobo = item.unitPriceKobo * item.quantity;
    assertSafeKobo(totalKobo, 'Line total');
    return totalKobo;
  });

  const subtotalKobo = lines.reduce((sum, line) => sum + line, 0);
  assertSafeKobo(subtotalKobo, 'Quote subtotal');
  const depositKobo = Math.round((subtotalKobo * depositPercent) / 100);
  assertSafeKobo(depositKobo, 'Deposit');

  return {
    subtotalKobo,
    totalKobo: subtotalKobo,
    depositPercent,
    depositKobo,
    balanceKobo: subtotalKobo - depositKobo,
  };
}

/** A fresh bearer token for the client, plus the digest that is stored. */
export function issueQuoteShareToken(): { readonly token: string; readonly hash: string } {
  const token = generateOpaqueToken();
  return { token, hash: quoteShareTokenHash(token) };
}

export function quoteShareTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export interface AcceptanceState {
  readonly status: string;
  readonly version: number;
  readonly latestVersion: number;
  readonly validUntil: Date;
}

/**
 * Returns the client-safe reason a version cannot be accepted, or null when it
 * can. Only the latest sent version before its expiry is acceptable: a token
 * for an older version must not beat a revised quote.
 */
export function acceptanceBlockReason(state: AcceptanceState, now: Date): string | null {
  if (state.version !== state.latestVersion) {
    return 'This quote has been replaced by a newer version';
  }

  switch (state.status) {
    case 'accepted':
      return 'This quote has already been accepted';
    case 'declined':
      return 'This quote was declined';
    case 'superseded':
      return 'This quote has been replaced by a newer version';
    case 'expired':
      return 'This quote has expired';
    case 'draft':
      return 'This quote has not been sent yet';
    case 'sent':
      return state.validUntil <= now ? 'This quote has expired' : null;
    default:
      return 'This quote cannot be accepted';
  }
}
