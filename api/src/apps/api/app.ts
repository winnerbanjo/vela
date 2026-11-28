import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '../../platform/config.js';
import { createCorsOriginResolver } from '../../platform/cors.js';
import { createPrismaClient } from '../../platform/db.js';
import { registerErrorHandling } from '../../platform/errors.js';
import { loggerOptions } from '../../platform/logger.js';
import { startHoldSweeper } from '../../modules/schedule/holds.js';
import { catalogueRoutes } from '../../modules/catalogue/routes.js';
import { identityRoutes } from '../../modules/identity/routes.js';
import { invoiceRoutes } from '../../modules/invoices/routes.js';
import { jobRoutes } from '../../modules/jobs/routes.js';
import { merchantRoutes } from '../../modules/merchant/routes.js';
import { paymentConnectionRoutes } from '../../modules/payments/connections.js';
import { paymentRoutes, paystackWebhookRoutes } from '../../modules/payments/routes.js';
import { quoteRoutes } from '../../modules/quotes/routes.js';
import { scheduleRoutes } from '../../modules/schedule/routes.js';
import { staffRoutes } from '../../modules/staff/routes.js';
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
  app.decorateRequest('auth');

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    return payload;
  });

  // Expired holds must free their allocation even if nobody asks for slots.
  // Requests also sweep opportunistically; this is the backstop.
  const stopHoldSweeper = startHoldSweeper(app.db, {
    onError: (error) => app.log.error({ err: error }, 'hold sweep failed'),
  });

  app.addHook('onClose', async () => {
    stopHoldSweeper();
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

  // Must be registered before route plugins: Fastify only applies an error
  // handler to plugins registered after it on the same instance.
  registerErrorHandling(app);

  await app.register(cookie);
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { iss: config.jwtIssuer, aud: config.jwtAudience, expiresIn: '15m' },
    verify: { allowedIss: config.jwtIssuer, allowedAud: config.jwtAudience },
  });

  await app.register(identityRoutes, { prefix: '/api/auth', config });
  await app.register(merchantRoutes, { prefix: '/api/merchant', config });
  await app.register(catalogueRoutes, { prefix: '/api', config });
  await app.register(scheduleRoutes, { prefix: '/api', config });
  await app.register(quoteRoutes, { prefix: '/api', config });
  await app.register(invoiceRoutes, { prefix: '/api', config });
  await app.register(jobRoutes, { prefix: '/api', config });
  await app.register(paymentRoutes, { prefix: '/api', config });
  await app.register(paymentConnectionRoutes, { prefix: '/api', config });
  await app.register(paystackWebhookRoutes, { prefix: '/api/webhooks', config });
  await app.register(staffRoutes, { prefix: '/api/staff', config });
  await app.register(healthRoutes, { prefix: '/health', version: config.version });

  return app;
}
