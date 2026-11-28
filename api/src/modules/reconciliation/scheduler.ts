import type { PrismaClient } from '@prisma/client';
import { runReconciliation } from './run.js';

/**
 * Periodic reconciliation for the worker. Deliberately an in-process timer for
 * now: correctness does not depend on it, and it is the seam where a durable
 * queue takes over once Redis/pg-boss is chosen.
 */
export function startReconciliationScheduler(
  db: PrismaClient,
  options: { intervalMs: number; onError: (error: unknown) => void; onRun?: () => void },
): () => void {
  if (options.intervalMs <= 0) return () => {};

  const tick = (): void => {
    void runReconciliation(db)
      .then(() => options.onRun?.())
      .catch((error: unknown) => options.onError(error));
  };

  const interval = setInterval(tick, options.intervalMs);
  interval.unref();
  return () => clearInterval(interval);
}
