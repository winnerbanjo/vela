import { ConfigError, loadConfig } from '../../platform/config.js';
import { createPrismaClient } from '../../platform/db.js';
import { createLogger } from '../../platform/logger.js';

const HEARTBEAT_MS = 30_000;
const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/**
 * Worker entrypoint. Queue consumers (holds.expire, booking.reminders,
 * payments.reconcile, messaging.outbound) are registered here from Day 3
 * (PLAN.md §4). Until then this process proves the shared database, logger,
 * and shutdown path so the worker is a real deploy target, not a stub file.
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

  logger.info({ heartbeatMs: HEARTBEAT_MS }, 'worker ready');

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
