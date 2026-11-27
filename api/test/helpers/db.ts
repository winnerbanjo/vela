import type { PrismaClient } from '@prisma/client';

const TABLES = [
  'audit_logs',
  'login_attempts',
  'portfolio_items',
  'services',
  'otp_codes',
  'sessions',
  'users',
  'merchants',
].join(', ');

/** Truncates tenant tables between tests. Never runs against production. */
export async function resetDatabase(db: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset a production database');
  }
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
}

/** Returns the first Set-Cookie value as a request `cookie` header. */
export function cookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== 'string') {
    throw new Error('No session cookie was set');
  }
  return first.split(';')[0] ?? '';
}
