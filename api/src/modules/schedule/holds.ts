import type { PrismaClient } from '@prisma/client';

/**
 * Expired holds must stop blocking the calendar, not just read as expired.
 * Sweeping deletes the allocation row (which is what the exclusion constraint
 * sees) and marks the hold, in one transaction.
 *
 * Sweeping also runs opportunistically before any slot read or hold attempt,
 * so a stale row can never make a free slot look taken even when the interval
 * timer has not fired yet.
 */
export async function expireHolds(
  db: PrismaClient,
  now: Date = new Date(),
  merchantId?: string,
): Promise<number> {
  const expired = await db.bookingHold.findMany({
    where: {
      status: 'active',
      expiresAt: { lte: now },
      ...(merchantId === undefined ? {} : { merchantId }),
    },
    select: { id: true },
    take: 500,
  });

  if (expired.length === 0) return 0;

  const ids = expired.map((hold) => hold.id);
  await db.$transaction(async (tx) => {
    await tx.resourceAllocation.deleteMany({ where: { holdId: { in: ids } } });
    await tx.bookingHold.updateMany({
      where: { id: { in: ids }, status: 'active' },
      data: { status: 'expired' },
    });
  });

  return ids.length;
}

export const HOLD_SWEEP_INTERVAL_MS = 30_000;

/**
 * Starts the in-process sweeper. pg-boss takes over once the worker owns
 * background jobs; until then this keeps a single instance honest without a
 * new dependency. The timer is unref'd so it never holds the process open.
 */
export function startHoldSweeper(
  db: PrismaClient,
  options: {
    intervalMs?: number;
    onError?: (error: unknown) => void;
    now?: () => Date;
  } = {},
): () => void {
  const interval = setInterval(() => {
    expireHolds(db, options.now ? options.now() : new Date()).catch((error: unknown) => {
      options.onError?.(error);
    });
  }, options.intervalMs ?? HOLD_SWEEP_INTERVAL_MS);

  interval.unref();

  return () => clearInterval(interval);
}
