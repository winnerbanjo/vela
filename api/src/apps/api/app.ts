import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '../../platform/config.js';
import { createCorsOriginResolver } from '../../platform/cors.js';
import { createPrismaClient } from '../../platform/db.js';
import { registerErrorHandling } from '../../platform/errors.js';
import { loggerOptions } from '../../platform/logger.js';
import { healthRoutes } from './routes/health.js';

/**
 * Builds the API without binding a port, so tests can use `app.inject()` and
 * the entrypoint owns process concerns (signals, exit codes).
 */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions(config),
    trustProxy: config.trustProxy,
    bodyLimit: config.bodyLimitBytes,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    connectionTimeout: 15_000,
  });

  app.decorate('db', await createPrismaClient(config));

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    return payload;
  });

  app.addHook('onClose', async () => {
    await app.db.$disconnect();
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...config.corsOrigins],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    hsts: config.isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  await app.register(cors, {
    origin: createCorsOriginResolver(config.corsRules),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
    strictPreflight: true,
  });

  // In-memory store is acceptable for single-instance local dev only; the
  // Redis-backed limiter lands with the staging deploy (SECURITY.md §9).
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: `Too many requests; retry in ${context.after}`,
      requestId: request.id,
    }),
  });

  await app.register(healthRoutes, { prefix: '/health', version: config.version });

  registerErrorHandling(app);

  return app;
}
