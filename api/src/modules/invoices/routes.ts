import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '../../platform/errors.js';
import { generateOpaqueToken, hashToken } from '../identity/tokens.js';
import { PaystackError } from '../payments/paystack.js';
import { decideSettlement, paystackClientForMode } from '../payments/settlement.js';

/**
 * Invoices. Mounted at /api.
 *
 * The merchant reads and voids invoices; the client pays through a public link
 * whose digest is all the database stores. A payment for an invoice is pinned to
 * the settlement mode at initialize time, exactly like a booking deposit.
 */

const uuid = z.string().uuid();
const publicToken = z
  .string()
  .trim()
  .min(20)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, 'Malformed token');

const paySchema = z
  .object({
    email: z.email().max(320),
    callbackUrl: z.url().max(2048).optional(),
  })
  .strict();

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

type InvoiceRow = {
  id: string;
  merchantId: string;
  quoteVersionId: string | null;
  kind: string;
  status: string;
  number: number;
  currency: string;
  amountKobo: bigint;
  paidKobo: bigint;
  clientName: string;
  description: string;
  dueAt: Date | null;
  issuedAt: Date;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeInvoice(invoice: InvoiceRow) {
  return {
    id: invoice.id,
    number: invoice.number,
    kind: invoice.kind,
    status: invoice.status,
    currency: invoice.currency,
    amountKobo: toSafeNumber(invoice.amountKobo),
    paidKobo: toSafeNumber(invoice.paidKobo),
    clientName: invoice.clientName,
    description: invoice.description,
    quoteVersionId: invoice.quoteVersionId,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    voidedAt: invoice.voidedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
  };
}

export const invoiceRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];
  const publicLimit = { config: { rateLimit: { max: config.rateLimitPublicMax } } };

  app.get('/invoices', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z.enum(['open', 'paid', 'void']).optional(),
        kind: z.enum(['deposit', 'balance', 'full']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const invoices = await app.db.invoice.findMany({
      where: {
        merchantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return { invoices: invoices.map(serializeInvoice) };
  });

  app.get<{ Params: { id: string } }>(
    '/invoices/:id',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const invoice = await app.db.invoice.findFirst({
        where: { id, merchantId },
        include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
      });
      if (!invoice) throw new NotFoundError('Invoice not found');

      return {
        invoice: serializeInvoice(invoice),
        payments: invoice.payments.map((payment) => ({
          id: payment.id,
          reference: payment.reference,
          amountKobo: toSafeNumber(payment.amountKobo),
          status: payment.status,
          createdAt: payment.createdAt.toISOString(),
        })),
      };
    },
  );

  /** Mints (or rotates) the client payment link. The raw token is shown once. */
  app.post<{ Params: { id: string } }>(
    '/invoices/:id/link',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const invoice = await app.db.invoice.findFirst({ where: { id, merchantId } });
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status !== 'open') {
        throw new ConflictError('Only an open invoice can be shared for payment');
      }

      const token = generateOpaqueToken();
      await app.db.invoice.update({
        where: { id },
        data: { publicTokenHash: hashToken(token), publicTokenIssuedAt: new Date() },
      });

      return {
        invoiceId: id,
        publicToken: token,
        sharePath: `/invoice/${token}`,
        amountKobo: toSafeNumber(invoice.amountKobo),
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/invoices/:id/void',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const now = new Date();

      const invoice = await app.db.invoice.findFirst({ where: { id, merchantId } });
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status !== 'open') {
        throw new ConflictError('Only an open invoice can be voided');
      }

      await app.db.$transaction(async (tx) => {
        const claimed = await tx.invoice.updateMany({
          where: { id, merchantId, status: 'open' },
          data: { status: 'void', voidedAt: now },
        });
        if (claimed.count === 0) {
          throw new ConflictError('That invoice changed while you were voiding it');
        }

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'invoice.voided',
          entityType: 'invoice',
          entityId: id,
          before: { status: invoice.status, amountKobo: toSafeNumber(invoice.amountKobo) },
          after: { status: 'void' },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
      });

      const updated = await app.db.invoice.findUniqueOrThrow({ where: { id } });
      return { invoice: serializeInvoice(updated) };
    },
  );

  // -------------------------------------------------------------------------
  // Public client surface (token is the capability)
  // -------------------------------------------------------------------------

  app.get<{ Params: { token: string } }>(
    '/public/invoices/:token',
    publicLimit,
    async (request) => {
      const token = publicToken.parse(request.params.token);

      const invoice = await app.db.invoice.findUnique({
        where: { publicTokenHash: hashToken(token) },
        include: { merchant: { select: { name: true, slug: true } } },
      });
      if (!invoice) throw new NotFoundError('Invoice not found');

      return {
        merchant: { name: invoice.merchant.name, slug: invoice.merchant.slug },
        invoice: {
          number: invoice.number,
          kind: invoice.kind,
          status: invoice.status,
          currency: invoice.currency,
          amountKobo: toSafeNumber(invoice.amountKobo),
          paidKobo: toSafeNumber(invoice.paidKobo),
          clientName: invoice.clientName,
          description: invoice.description,
          dueAt: invoice.dueAt?.toISOString() ?? null,
          issuedAt: invoice.issuedAt.toISOString(),
          paidAt: invoice.paidAt?.toISOString() ?? null,
          canPay: invoice.status === 'open',
        },
      };
    },
  );

  app.post<{ Params: { token: string } }>(
    '/public/invoices/:token/pay',
    publicLimit,
    async (request, reply) => {
      const token = publicToken.parse(request.params.token);
      const body = paySchema.parse(request.body);

      const invoice = await app.db.invoice.findUnique({
        where: { publicTokenHash: hashToken(token) },
      });
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status !== 'open') {
        throw new ConflictError('This invoice is not payable');
      }
      if (invoice.amountKobo <= 0n) {
        throw new ValidationError('This invoice has no payable amount');
      }

      const settings = await app.db.paymentSettings.findUnique({
        where: { merchantId: invoice.merchantId },
      });
      const settlement = decideSettlement(config, settings);
      const client = paystackClientForMode(config, settlement.mode, settings);

      const reference = `INV-${randomBytes(6).toString('hex').toUpperCase()}`;

      const payment = await app.db.payment.create({
        data: {
          merchantId: invoice.merchantId,
          invoiceId: invoice.id,
          reference,
          amountKobo: invoice.amountKobo,
          currency: invoice.currency,
          status: 'pending',
          settlementMode: settlement.mode,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            clientEmail: body.email.toLowerCase(),
          },
        },
      });

      try {
        const initialized = await client.initialize({
          email: body.email,
          amountKobo: toSafeNumber(invoice.amountKobo),
          reference,
          currency: invoice.currency,
          ...(body.callbackUrl ? { callbackUrl: body.callbackUrl } : {}),
          ...(settlement.subaccountCode ? { subaccountCode: settlement.subaccountCode } : {}),
          metadata: { invoiceId: invoice.id, paymentReference: reference },
        });

        const updated = await app.db.payment.update({
          where: { id: payment.id },
          data: {
            authorizationUrl: initialized.authorizationUrl,
            providerReference: initialized.providerReference,
          },
        });

        return reply.status(201).send({
          payment: {
            reference: updated.reference,
            authorizationUrl: updated.authorizationUrl,
            amountKobo: toSafeNumber(updated.amountKobo),
            status: updated.status,
            settlementMode: updated.settlementMode,
          },
          invoice: {
            number: invoice.number,
            kind: invoice.kind,
            amountKobo: toSafeNumber(invoice.amountKobo),
          },
        });
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
};
