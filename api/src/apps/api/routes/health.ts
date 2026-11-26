import type { FastifyPluginAsync } from 'fastify';

export interface HealthRoutesOptions {
  readonly version: string;
}

const READY_TIMEOUT_MS = 2_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('readiness check timed out')), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (app, options) => {
  app.get('/live', { config: { rateLimit: false } }, async () => ({
    status: 'ok',
    version: options.version,
    uptimeSeconds: Math.round(process.uptime()),
  }));

  app.get('/ready', { config: { rateLimit: false } }, async (request, reply) => {
    const startedAt = process.hrtime.bigint();

    try {
      await withTimeout(app.db.$queryRaw`select 1`, READY_TIMEOUT_MS);
      const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      return {
        status: 'ok',
        version: options.version,
        checks: { database: 'up' },
        latencyMs: Math.round(latencyMs * 100) / 100,
      };
    } catch (error) {
      request.log.error({ err: error }, 'readiness check failed');

      return reply.status(503).send({
        status: 'degraded',
        version: options.version,
        checks: { database: 'down' },
      });
    }
  });
};
