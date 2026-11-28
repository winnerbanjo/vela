import { ConfigError, loadConfig } from '../../platform/config.js';
import { createPrismaClient } from '../../platform/db.js';
import { createLogger } from '../../platform/logger.js';
import { startReconciliationScheduler } from '../../modules/reconciliation/scheduler.js';

const HEARTBEAT_MS = 30_000;
const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/**
 * Worker entrypoint. Durable queue consumers still wait on the Redis/pg-boss
 * decision, but reconciliation runs here on a timer so a paid discrepancy is
 * found by a process that is not serving traffic. The timer is a skeleton: the
 * same `runReconciliation` function works unchanged under a real queue.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config, 'vela-worker');
  const prisma = await createPrismaClient(config);

  try {
    await prisma.$queryRaw`select 1`;
  } catch (error) {
    logger.fatal({ err: error }, 'worker cannot reach the database');
    await prisma.$disconnect();
    process.exit(1);
  }

  const stopReconciliation = startReconciliationScheduler(prisma, {
    intervalMs: config.reconciliationIntervalMinutes * 60_000,
    onError: (error) => logger.error({ err: error }, 'reconciliation run failed'),
    onRun: () => logger.info('reconciliation run completed'),
  });

  logger.info(
    {
      heartbeatMs: HEARTBEAT_MS,
      reconciliationIntervalMinutes: config.reconciliationIntervalMinutes,
    },
    'worker ready',
  );

  const heartbeat = setInterval(() => {
    prisma.$queryRaw`select 1`.then(
      () => logger.debug('worker heartbeat'),
      (error: unknown) => logger.error({ err: error }, 'worker heartbeat failed'),
    );
  }, HEARTBEAT_MS);
  heartbeat.unref();

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'worker shutting down');
    clearInterval(heartbeat);
    stopReconciliation();
    await prisma.$disconnect();
    process.exit(0);
  };

  for (const signal of SIGNALS) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled promise rejection');
    process.exit(1);
  });
}

void main().catch((error: unknown) => {
  const message =
    error instanceof ConfigError
      ? error.message
      : 'Worker failed to start. Check the configuration and database logs.';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
