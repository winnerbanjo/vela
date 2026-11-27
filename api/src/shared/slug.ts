import { randomBytes } from 'node:crypto';

/**
 * Public merchant slugs appear in `merchant.vela.ng` and `/p/:slug`. The
 * database enforces the same pattern (`merchants_slug_format`); this module is
 * the single place that produces them.
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** Lowercases, strips unsafe characters, and guarantees a usable length. */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55);

  if (base.length >= 3) {
    return base;
  }

  const suffix = randomBytes(3).toString('hex');
  return `${base || 'shop'}-${suffix}`.slice(0, 63).replace(/-+$/, '');
}
