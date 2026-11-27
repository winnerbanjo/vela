import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  InternalError,
  NotFoundError,
  NotImplementedError,
  PayloadTooLargeError,
  UnauthorizedError,
  ValidationError,
} from '../../platform/errors.js';
import { verifyPassword } from '../identity/password.js';
import { confirmHold } from '../schedule/bookings.js';
import {
  createPaystackClient,
  eventIdFor,
  PaystackError,
  verifyWebhookSignature,
  webhookSecret,
  type PaystackClient,
  type PaystackConfig,
} from './paystack.js';

/**
 * Payments and the Paystack webhook. Mounted at /api (webhook at /api/webhooks).
 *
 * Order of trust: a pending payment is created only from a live hold, the
 * amount comes from the database, and nothing is marked paid until an
 * HMAC-verified webhook says so. A repeated delivery is stored once (unique
 * event id) and produces at most one booking and one ledger row.
 */

const uuid = z.string().uuid();

const initializeSchema = z
  .object({
    holdId: uuid,
    email: z.email().max(320),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(1000).optional(),
    callbackUrl: z.url().max(2048).optional(),
  })
  .strict();

const refundSchema = z
  .object({
    password: z.string().min(1).max(128),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

function serializePayment(payment: {
  id: string;
  reference: string;
  providerReference: string | null;
  amountKobo: bigint;
  currency: string;
  status: string;
  channel: string | null;
  failureReason: string | null;
  authorizationUrl: string | null;
  holdId: string | null;
  bookingId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    reference: payment.reference,
    providerReference: payment.providerReference,
    amountKobo: toSafeNumber(payment.amountKobo),
    currency: payment.currency,
    status: payment.status,
    channel: payment.channel,
    failureReason: payment.failureReason,
    authorizationUrl: payment.authorizationUrl,
    holdId: payment.holdId,
    bookingId: payment.bookingId,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function paystackConfigFor(config: AppConfig): PaystackConfig {
  return {
    mode: config.paystackMode,
    secretKey: config.paystackSecretKey,
    apiBase: config.paystackApiBase,
  };
}

export const paymentRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];
  const client: PaystackClient = createPaystackClient(paystackConfigFor(config));

  app.post(
    '/payments/initialize',
    { config: { rateLimit: { max: config.rateLimitPublicMax, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (config.paystackMode === 'disabled') {
        throw new NotImplementedError('Payments are not configured');
      }

      const body = initializeSchema.parse(request.body);
      const now = new Date();

      const hold = await app.db.bookingHold.findUnique({
        where: { id: body.holdId },
        include: { service: true },
      });
      if (!hold) throw new NotFoundError('Hold not found');
      if (hold.status !== 'active') throw new ConflictError('That hold is no longer active');
      if (hold.expiresAt <= now) throw new ConflictError('That hold has expired');

      const merchant = await app.db.merchant.findUniqueOrThrow({
        where: { id: hold.merchantId },
        select: { currency: true },
      });

      // Deposit if one is configured, otherwise the full price. Never the client's.
      const amountKobo =
        hold.service.depositKobo > 0n ? hold.service.depositKobo : hold.service.priceKobo;
      if (amountKobo <= 0n) {
        throw new ValidationError('This service has no payable amount');
      }

      const reference = `VELA-${randomBytes(6).toString('hex').toUpperCase()}`;

      const payment = await app.db.payment.create({
        data: {
          merchantId: hold.merchantId,
          holdId: hold.id,
          reference,
          amountKobo,
          currency: merchant.currency,
          status: 'pending',
          metadata: {
            clientName: body.name,
            clientEmail: body.email.toLowerCase(),
            clientPhone: body.phone ?? null,
            notes: body.notes ?? null,
          },
        },
      });

      try {
        const initialized = await client.initialize({
          email: body.email,
          amountKobo: toSafeNumber(amountKobo),
          reference,
          currency: merchant.currency,
          ...(body.callbackUrl ? { callbackUrl: body.callbackUrl } : {}),
          metadata: { holdId: hold.id, paymentReference: reference },
        });

        const updated = await app.db.payment.update({
          where: { id: payment.id },
          data: {
            authorizationUrl: initialized.authorizationUrl,
            providerReference: initialized.providerReference,
          },
        });

        return reply.status(201).send({ payment: serializePayment(updated) });
      } catch (error) {
        await app.db.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            failureReason:
              error instanceof PaystackError ? error.message.slice(0, 200) : 'initialize_failed',
          },
        });

        if (error instanceof PaystackError && error.retryable) {
          throw new ConflictError('The payment provider is unavailable; try again shortly');
        }
        throw error;
      }
    },
  );

  app.get('/payments', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z.enum(['pending', 'succeeded', 'failed', 'abandoned', 'refunded']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const payments = await app.db.payment.findMany({
      where: { merchantId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return { payments: payments.map(serializePayment) };
  });

  app.get<{ Params: { reference: string } }>(
    '/payments/:reference',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const reference = z.string().trim().min(1).max(64).parse(request.params.reference);

      const payment = await app.db.payment.findFirst({ where: { reference, merchantId } });
      if (!payment) throw new NotFoundError('Payment not found');

      return { payment: serializePayment(payment) };
    },
  );

  /**
   * Refunds require the owner's password again: a stolen session alone must not
   * be able to move money out.
   */
  app.post<{ Params: { id: string } }>(
    '/payments/:id/refund',
    { preHandler: ownerOnly },
    async (request) => {
      if (config.paystackMode === 'disabled') {
        throw new NotImplementedError('Payments are not configured');
      }

      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = refundSchema.parse(request.body ?? {});

      const actor = await app.db.user.findUnique({ where: { id: request.auth?.userId as string } });
      if (!actor?.passwordHash) throw new UnauthorizedError('Password confirmation failed');
      if (!(await verifyPassword(actor.passwordHash, body.password))) {
        throw new UnauthorizedError('Password confirmation failed');
      }

      const payment = await app.db.payment.findFirst({ where: { id, merchantId } });
      if (!payment) throw new NotFoundError('Payment not found');
      if (payment.status !== 'succeeded') {
        throw new ConflictError('Only a succeeded payment can be refunded');
      }
      if (!payment.providerReference) {
        throw new ConflictError('This payment has no provider reference to refund');
      }

      let refunded;
      try {
        refunded = await client.refund({
          providerReference: payment.providerReference,
          amountKobo: toSafeNumber(payment.amountKobo),
        });
      } catch (error) {
        if (error instanceof PaystackError && error.retryable) {
          throw new ConflictError('The payment provider is unavailable; try again shortly');
        }
        throw error;
      }

      const updated = await app.db.$transaction(async (tx) => {
        const result = await tx.payment.updateMany({
          where: { id, merchantId, status: 'succeeded' },
          data: { status: 'refunded', failureReason: body.reason ?? null },
        });
        if (result.count === 0) {
          throw new ConflictError('That payment changed while you were refunding it');
        }

        await tx.ledgerEntry.create({
          data: {
            merchantId,
            paymentId: payment.id,
            kind: 'refund',
            amountKobo: -payment.amountKobo,
            currency: payment.currency,
            memo: `Refund ${refunded.providerReference}${body.reason ? `: ${body.reason}` : ''}`.slice(
              0,
              200,
            ),
          },
        });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'payment.refunded',
          entityType: 'payment',
          entityId: payment.id,
          before: { status: payment.status, amountKobo: toSafeNumber(payment.amountKobo) },
          after: { status: 'refunded', providerReference: refunded.providerReference },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });

        return tx.payment.findUniqueOrThrow({ where: { id } });
      });

      return { payment: serializePayment(updated) };
    },
  );

  app.get('/payments/ledger/entries', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const entries = await app.db.ledgerEntry.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        paymentId: entry.paymentId,
        kind: entry.kind,
        amountKobo: toSafeNumber(entry.amountKobo),
        currency: entry.currency,
        memo: entry.memo,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  });
};

/**
 * The webhook needs the exact bytes Paystack signed, so JSON is parsed from a
 * raw buffer inside this encapsulated plugin only. Every other route keeps the
 * normal parser.
 */
export const paystackWebhookRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const secret = webhookSecret(paystackConfigFor(config));

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 256 * 1024 },
    (request, body, done) => {
      const raw = body as Buffer;
      (request as RawBodyRequest).rawBody = raw;
      try {
        done(null, raw.length === 0 ? {} : JSON.parse(raw.toString('utf8')));
      } catch {
        done(new ValidationError('Webhook body is not valid JSON'), undefined);
      }
    },
  );

  app.post(
    '/paystack',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const rawBody = (request as RawBodyRequest).rawBody ?? Buffer.alloc(0);
      if (rawBody.length > 256 * 1024) {
        throw new PayloadTooLargeError();
      }

      const signature = request.headers['x-paystack-signature'];
      if (
        !verifyWebhookSignature(
          rawBody,
          typeof signature === 'string' ? signature : undefined,
          secret,
        )
      ) {
        // Deliberately a 401 without touching the database: an unauthenticated
        // delivery must not be able to fill the event table.
        throw new UnauthorizedError('Invalid webhook signature');
      }

      const payload = request.body as {
        event?: unknown;
        data?: {
          id?: unknown;
          reference?: unknown;
          amount?: unknown;
          currency?: unknown;
          channel?: unknown;
          paid_at?: unknown;
        };
      };
      const type = typeof payload.event === 'string' ? payload.event : 'unknown';
      const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
      const eventId = eventIdFor(type, data.id, rawBody);

      const inserted = await app.db.paymentEvent.createMany({
        data: [{ eventId, type, payload: payload as never, signatureVerified: true }],
        skipDuplicates: true,
      });

      if (inserted.count === 0) {
        return reply.status(200).send({ received: true, duplicate: true });
      }

      const reference = typeof data.reference === 'string' ? data.reference : null;
      const payment = reference ? await app.db.payment.findUnique({ where: { reference } }) : null;

      if (!payment) {
        await app.db.paymentEvent.updateMany({
          where: { eventId },
          data: { processedAt: new Date(), note: 'unknown_reference' },
        });
        return reply.status(200).send({ received: true });
      }

      await app.db.paymentEvent.updateMany({ where: { eventId }, data: { paymentId: payment.id } });

      if (type !== 'charge.success') {
        await app.db.paymentEvent.updateMany({
          where: { eventId },
          data: { processedAt: new Date(), note: 'ignored_type' },
        });
        return reply.status(200).send({ received: true });
      }

      if (payment.status !== 'pending') {
        await app.db.paymentEvent.updateMany({
          where: { eventId },
          data: { processedAt: new Date(), note: `already_${payment.status}` },
        });
        return reply.status(200).send({ received: true, duplicate: true });
      }

      const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount);
      const currency = typeof data.currency === 'string' ? data.currency : null;
      if (
        !Number.isInteger(amount) ||
        amount !== toSafeNumber(payment.amountKobo) ||
        currency !== payment.currency
      ) {
        await app.db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { failureReason: 'amount_mismatch' },
          });
          await tx.paymentEvent.updateMany({
            where: { eventId },
            data: { processedAt: new Date(), note: 'amount_mismatch' },
          });
          await writeAudit(tx, {
            merchantId: payment.merchantId,
            actorId: null,
            actorRole: 'provider',
            action: 'payment.amount_mismatch',
            entityType: 'payment',
            entityId: payment.id,
            after: {
              expectedKobo: toSafeNumber(payment.amountKobo),
              receivedKobo: Number.isFinite(amount) ? amount : null,
              currency,
            },
            requestId: request.id,
          });
        });

        // Acknowledge so Paystack stops retrying; the exception is now ours.
        return reply.status(200).send({ received: true });
      }

      const paidAt =
        typeof data.paid_at === 'string' && !Number.isNaN(Date.parse(data.paid_at))
          ? new Date(data.paid_at)
          : new Date();

      await app.db.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: 'pending' },
          data: {
            status: 'succeeded',
            paidAt,
            channel: typeof data.channel === 'string' ? data.channel.slice(0, 32) : null,
          },
        });
        if (claimed.count === 0) return;

        await tx.ledgerEntry.create({
          data: {
            merchantId: payment.merchantId,
            paymentId: payment.id,
            kind: 'charge',
            amountKobo: payment.amountKobo,
            currency: payment.currency,
            memo: `Charge ${payment.reference}`,
          },
        });

        await writeAudit(tx, {
          merchantId: payment.merchantId,
          actorId: null,
          actorRole: 'provider',
          action: 'payment.succeeded',
          entityType: 'payment',
          entityId: payment.id,
          after: { reference: payment.reference, amountKobo: toSafeNumber(payment.amountKobo) },
          requestId: request.id,
        });
      });

      // The hold may have expired while the customer was paying. The money is
      // still recorded above; the missing booking becomes an owner exception.
      let bookingId: string | null = null;
      if (payment.holdId) {
        const metadata = (payment.metadata ?? {}) as {
          clientName?: string;
          clientEmail?: string;
          clientPhone?: string;
          notes?: string;
        };

        try {
          const booking = await confirmHold(
            app.db,
            {
              holdId: payment.holdId,
              clientName: metadata.clientName ?? 'Guest',
              clientEmail: metadata.clientEmail ?? null,
              clientPhone: metadata.clientPhone ?? null,
              notes: metadata.notes ?? null,
            },
            { requestId: request.id },
          );
          bookingId = booking.id;
          // A payment targets one row, never both: linking the booking releases
          // the hold reference in the same statement.
          await app.db.payment.update({
            where: { id: payment.id },
            data: { bookingId: booking.id, holdId: null },
          });
        } catch (error) {
          if (!(error instanceof ConflictError)) throw error;

          await app.db.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { failureReason: 'paid_but_unscheduled' },
            });
            await writeAudit(tx, {
              merchantId: payment.merchantId,
              actorId: null,
              actorRole: 'provider',
              action: 'payment.exception_unscheduled',
              entityType: 'payment',
              entityId: payment.id,
              after: { reason: 'hold_expired_before_payment' },
              requestId: request.id,
            });
          });
        }
      }

      await app.db.paymentEvent.updateMany({
        where: { eventId },
        data: {
          processedAt: new Date(),
          note: bookingId ? 'booking_confirmed' : 'payment_recorded',
        },
      });

      return reply.status(200).send({ received: true });
    },
  );
};
