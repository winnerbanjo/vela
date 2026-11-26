import type { Prisma, PrismaClient } from '@prisma/client';
import type { AppConfig } from './config.js';

export type TxClient = Prisma.TransactionClient;

export interface TenantContext {
  readonly merchantId: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The import is deliberately dynamic: `@prisma/client` loads a local `.env`
 * file as a side effect of being imported. A static import here would let a
 * stray `.env` populate `process.env` before `loadConfig()` runs, silently
 * defeating the fail-closed secret check. Config is always parsed first.
 */
export async function createPrismaClient(config: AppConfig): Promise<PrismaClient> {
  const { PrismaClient: PrismaClientConstructor } = await import('@prisma/client');

  return new PrismaClientConstructor({
    datasourceUrl: config.databaseUrl,
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
    errorFormat: config.isProduction ? 'minimal' : 'pretty',
  });
}

/**
 * Tenant IDs come from a verified session, never from a request body. This is
 * the last line of defence before a query runs: a missing or malformed id is a
 * bug, so it throws instead of falling back to "all merchants".
 */
export function assertMerchantId(merchantId: string): string {
  if (typeof merchantId !== 'string' || !UUID_PATTERN.test(merchantId)) {
    throw new Error('A valid merchant id is required for tenant-scoped access');
  }
  return merchantId;
}

export function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: TxClient) => Promise<T>,
  options: { timeoutMs?: number; maxWaitMs?: number } = {},
): Promise<T> {
  return prisma.$transaction(fn, {
    timeout: options.timeoutMs ?? 10_000,
    maxWait: options.maxWaitMs ?? 5_000,
  });
}

/**
 * Runs `fn` inside a transaction whose `app.merchant_id` setting is pinned to
 * the session's merchant. Every query in the callback therefore inherits the
 * tenant, and the same setting is ready for Postgres RLS in week 2.
 */
export async function withTenant<T>(
  prisma: PrismaClient,
  merchantId: string,
  fn: (tx: TxClient, ctx: TenantContext) => Promise<T>,
): Promise<T> {
  const id = assertMerchantId(merchantId);

  return withTransaction(prisma, async (tx) => {
    await tx.$queryRaw`select set_config('app.merchant_id', ${id}::text, true)`;
    return fn(tx, { merchantId: id });
  });
}
