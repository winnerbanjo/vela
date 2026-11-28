import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { writeAudit } from '../../platform/audit.js';
import { createAuthGuards } from '../../platform/auth.js';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../platform/errors.js';
import { credentialKey, credentialLast4, encryptCredential } from '../payments/credentials.js';
import { sendThreadMessage } from './outbound.js';
import { isOptOut, parseInboundWebhook, verifyWhatsAppSignature } from './whatsapp.js';

/**
 * Merchant messaging surface and the WhatsApp webhook. Mounted at /api
 * (webhook at /api/webhooks/whatsapp).
 *
 * The webhook is the only unauthenticated entry point; it verifies the raw-byte
 * signature when an app secret exists, maps the receiving number to a merchant,
 * dedupes provider message ids, and honours STOP immediately.
 */

const uuid = z.string().uuid();

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

const settingsBody = z
  .object({
    whatsappEnabled: z.boolean().optional(),
    agentEnabled: z.boolean().optional(),
    whatsappPhoneNumberId: z.string().trim().min(1).max(64).nullable().optional(),
    accessToken: z.string().trim().min(20).max(500).optional(),
    agentMonthlyDraftLimit: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

const replyBody = z.object({ body: z.string().trim().min(1).max(4096) }).strict();

function serializeThread(thread: {
  id: string;
  waId: string;
  clientName: string | null;
  lastMessageAt: Date;
  optedOutAt: Date | null;
  messages?: Array<{ body: string; direction: string; createdAt: Date }>;
}) {
  return {
    id: thread.id,
    waId: thread.waId,
    clientName: thread.clientName,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    optedOut: thread.optedOutAt !== null,
    optedOutAt: thread.optedOutAt?.toISOString() ?? null,
    preview: thread.messages?.[0]
      ? {
          body: thread.messages[0].body.slice(0, 160),
          direction: thread.messages[0].direction,
          at: thread.messages[0].createdAt.toISOString(),
        }
      : null,
  };
}

function serializeMessage(message: {
  id: string;
  direction: string;
  status: string;
  body: string;
  providerMessageId: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    direction: message.direction,
    status: message.status,
    body: message.body,
    providerMessageId: message.providerMessageId,
    error: message.error,
    sentAt: message.sentAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

export const messagingRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];

  app.get('/messaging/settings', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const integration = await app.db.merchantIntegration.findUnique({ where: { merchantId } });

    return {
      settings: {
        whatsappEnabled: integration?.whatsappEnabled ?? false,
        agentEnabled: integration?.agentEnabled ?? false,
        whatsappPhoneNumberId: integration?.whatsappPhoneNumberId ?? null,
        accessTokenLast4: integration?.whatsappTokenLast4 ?? null,
        agentMonthlyDraftLimit: integration?.agentMonthlyDraftLimit ?? 200,
        messagingMode: config.messagingMode,
        agentMode: config.agentMode,
      },
    };
  });

  app.put('/messaging/settings', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const body = settingsBody.parse(request.body ?? {});
    const before = await app.db.merchantIntegration.findUnique({ where: { merchantId } });

    const phoneNumberId =
      body.whatsappPhoneNumberId !== undefined
        ? body.whatsappPhoneNumberId
        : (before?.whatsappPhoneNumberId ?? null);
    const whatsappEnabled = body.whatsappEnabled ?? before?.whatsappEnabled ?? false;
    const agentEnabled = body.agentEnabled ?? before?.agentEnabled ?? false;

    if (whatsappEnabled && !phoneNumberId) {
      throw new ValidationError('A WhatsApp phone number id is required before enabling messaging');
    }
    if (agentEnabled && !whatsappEnabled) {
      throw new ConflictError('Enable WhatsApp before enabling the agent');
    }

    const key = credentialKey(config);
    const data = {
      whatsappEnabled,
      agentEnabled,
      whatsappPhoneNumberId: phoneNumberId,
      ...(body.agentMonthlyDraftLimit !== undefined
        ? { agentMonthlyDraftLimit: body.agentMonthlyDraftLimit }
        : {}),
      ...(body.accessToken
        ? {
            whatsappTokenCiphertext: encryptCredential(body.accessToken, key),
            whatsappTokenLast4: credentialLast4(body.accessToken),
          }
        : {}),
    };

    const integration = await app.db.merchantIntegration.upsert({
      where: { merchantId },
      create: { merchantId, ...data },
      update: data,
    });

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'messaging.settings_updated',
      entityType: 'merchant_integration',
      entityId: integration.id,
      before: {
        whatsappEnabled: before?.whatsappEnabled ?? false,
        agentEnabled: before?.agentEnabled ?? false,
        whatsappPhoneNumberId: before?.whatsappPhoneNumberId ?? null,
      },
      after: {
        whatsappEnabled: integration.whatsappEnabled,
        agentEnabled: integration.agentEnabled,
        whatsappPhoneNumberId: integration.whatsappPhoneNumberId,
        tokenChanged: Boolean(body.accessToken),
      },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return {
      settings: {
        whatsappEnabled: integration.whatsappEnabled,
        agentEnabled: integration.agentEnabled,
        whatsappPhoneNumberId: integration.whatsappPhoneNumberId,
        accessTokenLast4: integration.whatsappTokenLast4,
        agentMonthlyDraftLimit: integration.agentMonthlyDraftLimit,
        messagingMode: config.messagingMode,
        agentMode: config.agentMode,
      },
    };
  });

  app.get('/messaging/threads', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(50) })
      .parse(request.query ?? {});

    const threads = await app.db.whatsappThread.findMany({
      where: { merchantId },
      orderBy: { lastMessageAt: 'desc' },
      take: query.limit,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return { threads: threads.map(serializeThread) };
  });

  app.get<{ Params: { id: string } }>(
    '/messaging/threads/:id',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const thread = await app.db.whatsappThread.findFirst({
        where: { id, merchantId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } },
      });
      if (!thread) throw new NotFoundError('Conversation not found');

      return {
        thread: {
          ...serializeThread(thread),
          messages: thread.messages.map(serializeMessage),
        },
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/messaging/threads/:id/reply',
    { preHandler: staffOnly },
    async (request, reply) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = replyBody.parse(request.body ?? {});

      const [thread, merchant] = await Promise.all([
        app.db.whatsappThread.findFirst({ where: { id, merchantId } }),
        app.db.merchant.findFirst({ where: { id: merchantId }, select: { timezone: true } }),
      ]);
      if (!thread) throw new NotFoundError('Conversation not found');
      if (!merchant) throw new NotFoundError('Merchant not found');

      const integration = await app.db.merchantIntegration.findUnique({
        where: { merchantId },
      });

      const message = await sendThreadMessage({
        db: app.db,
        config,
        merchant,
        integration,
        thread,
        body: body.body,
      });

      await writeAudit(app.db, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'messaging.reply_sent',
        entityType: 'whatsapp_thread',
        entityId: thread.id,
        after: { messageId: message.id, characters: body.body.length },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return reply.status(201).send({ message: serializeMessage(message) });
    },
  );
};

/** Webhook plugin: raw body, signature, and provider envelope. */
export const whatsappWebhookRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_request: FastifyRequest, raw: Buffer, done) => {
      (_request as RawBodyRequest).rawBody = raw;
      try {
        done(null, raw.length === 0 ? {} : JSON.parse(raw.toString('utf8')));
      } catch {
        done(new ValidationError('Webhook body is not valid JSON'), undefined);
      }
    },
  );

  app.get('/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    if (
      query['hub.mode'] !== 'subscribe' ||
      !config.whatsappVerifyToken ||
      query['hub.verify_token'] !== config.whatsappVerifyToken
    ) {
      return reply.status(401).send({ error: 'Verification failed' });
    }
    return reply.type('text/plain').send(query['hub.challenge'] ?? '');
  });

  app.post(
    '/whatsapp',
    { config: { rateLimit: { max: 600, timeWindow: '1 minute' } } },
    async (request) => {
      const raw = (request as RawBodyRequest).rawBody;
      if (!raw) throw new ValidationError('Webhook body is missing');

      if (config.whatsappAppSecret) {
        const signature = request.headers['x-hub-signature-256'];
        if (
          !verifyWhatsAppSignature(
            raw,
            Array.isArray(signature) ? signature[0] : signature,
            config.whatsappAppSecret,
          )
        ) {
          throw new UnauthorizedError('Invalid webhook signature');
        }
      } else if (config.isProduction) {
        // Production must never accept unsigned inbound messages.
        throw new UnauthorizedError('Webhook signature is not configured');
      }

      const messages = parseInboundWebhook(request.body);
      let processed = 0;

      for (const message of messages) {
        const integration = message.phoneNumberId
          ? await app.db.merchantIntegration.findFirst({
              where: {
                whatsappPhoneNumberId: message.phoneNumberId,
                whatsappEnabled: true,
              },
              select: { merchantId: true },
            })
          : null;
        if (!integration) continue;

        const now = new Date();
        const thread = await app.db.whatsappThread.upsert({
          where: {
            merchantId_waId: { merchantId: integration.merchantId, waId: message.waId },
          },
          create: {
            merchantId: integration.merchantId,
            waId: message.waId,
            clientName: message.clientName,
            lastInboundAt: now,
            lastMessageAt: now,
          },
          update: {
            lastInboundAt: now,
            lastMessageAt: now,
            ...(message.clientName ? { clientName: message.clientName } : {}),
          },
        });

        try {
          await app.db.whatsappMessage.create({
            data: {
              merchantId: integration.merchantId,
              threadId: thread.id,
              direction: 'inbound',
              status: 'received',
              providerMessageId: message.providerMessageId,
              body: message.body,
            },
          });
        } catch (error) {
          // A duplicate delivery is a success, not a failure.
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: string }).code === 'P2002'
          ) {
            continue;
          }
          throw error;
        }

        if (isOptOut(message.body)) {
          await app.db.whatsappThread.update({
            where: { id: thread.id },
            data: { optedOutAt: now },
          });
        }

        processed += 1;
      }

      return { received: true, processed };
    },
  );
};
