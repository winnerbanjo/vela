import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeAudit } from '../../platform/audit.js';
import { createAuthGuards } from '../../platform/auth.js';
import type { AppConfig } from '../../platform/config.js';
import { InternalError, NotFoundError } from '../../platform/errors.js';

/**
 * Platform-admin read surfaces. Mounted at /api/admin.
 *
 * Every route requires the `admin` role, and admins are the only accounts
 * without a merchant (enforced by a CHECK constraint in the foundation
 * migration), so a tenant owner can never reach this surface. Responses carry
 * money as integer kobo and never include merchant Paystack secrets or full
 * payout account numbers.
 */

const uuid = z.string().uuid();

const pagination = {
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
};

function toSafeNumber(value: bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

export const adminRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const adminOnly = guards.requireRole('admin');

  app.get('/admin/overview', { preHandler: adminOnly }, async () => {
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      merchantStatuses,
      bookingStatuses,
      collected,
      refunded,
      reviewsOpen,
      newMerchants,
      openInvoices,
    ] = await Promise.all([
      app.db.merchant.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      app.db.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { createdAt: { gte: since30 } },
      }),
      app.db.ledgerEntry.aggregate({
        _sum: { amountKobo: true },
        where: { kind: 'charge', createdAt: { gte: since30 } },
      }),
      app.db.ledgerEntry.aggregate({
        _sum: { amountKobo: true },
        where: { kind: 'refund', createdAt: { gte: since30 } },
      }),
      app.db.payment.count({ where: { failureReason: { not: null }, reviewedAt: null } }),
      app.db.merchant.count({ where: { createdAt: { gte: since7 }, deletedAt: null } }),
      app.db.invoice.aggregate({ _count: { _all: true }, where: { status: 'open' } }),
    ]);

    const merchants = Object.fromEntries(
      merchantStatuses.map((row) => [row.status, row._count._all]),
    );
    const bookings = Object.fromEntries(
      bookingStatuses.map((row) => [row.status, row._count._all]),
    );
    const collectedKobo = toSafeNumber(collected._sum.amountKobo);
    // Refund rows are negative; expose both the gross and the repaid amount.
    const refundedKobo = Math.abs(toSafeNumber(refunded._sum.amountKobo));

    return {
      merchants: {
        total: Object.values(merchants).reduce((sum, count) => sum + count, 0),
        active: merchants.active ?? 0,
        onboarding: merchants.onboarding ?? 0,
        suspended: merchants.suspended ?? 0,
        newLast7Days: newMerchants,
      },
      bookingsLast30Days: {
        total: Object.values(bookings).reduce((sum, count) => sum + count, 0),
        confirmed: bookings.confirmed ?? 0,
        cancelled: bookings.cancelled ?? 0,
        completed: bookings.completed ?? 0,
        noShow: bookings.no_show ?? 0,
      },
      moneyLast30Days: {
        collectedKobo,
        refundedKobo,
        netKobo: collectedKobo - refundedKobo,
      },
      openInvoices: openInvoices._count._all,
      reviewsOpen,
    };
  });

  app.get('/admin/merchants', { preHandler: adminOnly }, async (request) => {
    const query = z
      .object({
        status: z.enum(['onboarding', 'active', 'suspended', 'closed']).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        ...pagination,
      })
      .parse(request.query ?? {});

    const where: Prisma.MerchantWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [merchants, total] = await Promise.all([
      app.db.merchant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: { _count: { select: { users: true, bookings: true, jobs: true } } },
      }),
      app.db.merchant.count({ where }),
    ]);

    return {
      total,
      merchants: merchants.map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        trade: merchant.trade,
        status: merchant.status,
        createdAt: merchant.createdAt.toISOString(),
        publishedAt: merchant.publishedAt?.toISOString() ?? null,
        counts: merchant._count,
      })),
    };
  });

  app.get<{ Params: { id: string } }>(
    '/admin/merchants/:id',
    { preHandler: adminOnly },
    async (request) => {
      const id = uuid.parse(request.params.id);

      const merchant = await app.db.merchant.findFirst({
        where: { id, deletedAt: null },
        include: {
          _count: { select: { users: true, bookings: true, jobs: true, invoices: true } },
          paymentSettings: true,
        },
      });
      if (!merchant) throw new NotFoundError('Merchant not found');

      const [collected, refunded] = await Promise.all([
        app.db.ledgerEntry.aggregate({
          _sum: { amountKobo: true },
          where: { merchantId: id, kind: 'charge' },
        }),
        app.db.ledgerEntry.aggregate({
          _sum: { amountKobo: true },
          where: { merchantId: id, kind: 'refund' },
        }),
      ]);

      return {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          slug: merchant.slug,
          trade: merchant.trade,
          status: merchant.status,
          timezone: merchant.timezone,
          currency: merchant.currency,
          createdAt: merchant.createdAt.toISOString(),
          publishedAt: merchant.publishedAt?.toISOString() ?? null,
          counts: merchant._count,
          paymentSettings: merchant.paymentSettings
            ? {
                mode: merchant.paymentSettings.mode,
                status: merchant.paymentSettings.status,
                bankName: merchant.paymentSettings.bankName,
                accountName: merchant.paymentSettings.accountName,
                accountNumberLast4: merchant.paymentSettings.accountNumberLast4,
                providerVerifiedAt:
                  merchant.paymentSettings.providerVerifiedAt?.toISOString() ?? null,
                bankVerifiedAt: merchant.paymentSettings.bankVerifiedAt?.toISOString() ?? null,
              }
            : null,
          money: {
            collectedKobo: toSafeNumber(collected._sum.amountKobo),
            refundedKobo: Math.abs(toSafeNumber(refunded._sum.amountKobo)),
          },
        },
      };
    },
  );

  app.get('/admin/providers', { preHandler: adminOnly }, async (request) => {
    const query = z.object({ limit: pagination.limit }).parse(request.query ?? {});

    const connections = await app.db.paymentSettings.findMany({
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      include: { merchant: { select: { id: true, name: true, slug: true, status: true } } },
    });

    return {
      platform: { provider: 'paystack', mode: config.paystackMode },
      connections: connections.map((connection) => ({
        merchantId: connection.merchantId,
        merchantName: connection.merchant.name,
        merchantSlug: connection.merchant.slug,
        merchantStatus: connection.merchant.status,
        mode: connection.mode,
        status: connection.status,
        secretKeyLast4: connection.secretKeyLast4,
        subaccountCode: connection.subaccountCode,
        bankName: connection.bankName,
        accountName: connection.accountName,
        accountNumberLast4: connection.accountNumberLast4,
        providerVerifiedAt: connection.providerVerifiedAt?.toISOString() ?? null,
        bankVerifiedAt: connection.bankVerifiedAt?.toISOString() ?? null,
        updatedAt: connection.updatedAt.toISOString(),
      })),
    };
  });

  app.get('/admin/bookings', { preHandler: adminOnly }, async (request) => {
    const query = z
      .object({
        merchantId: uuid.optional(),
        status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        ...pagination,
      })
      .parse(request.query ?? {});

    const where: Prisma.BookingWhereInput = {
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [bookings, total] = await Promise.all([
      app.db.booking.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          merchant: { select: { id: true, name: true, slug: true } },
          service: { select: { name: true } },
        },
      }),
      app.db.booking.count({ where }),
    ]);

    return {
      total,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        merchant: booking.merchant,
        serviceName: booking.service.name,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        status: booking.status,
        source: booking.source,
        priceKobo: toSafeNumber(booking.priceKobo),
        depositKobo: toSafeNumber(booking.depositKobo),
        createdAt: booking.createdAt.toISOString(),
      })),
    };
  });

  app.get('/admin/transactions', { preHandler: adminOnly }, async (request) => {
    const query = z
      .object({
        merchantId: uuid.optional(),
        status: z.enum(['pending', 'succeeded', 'failed', 'abandoned', 'refunded']).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        ...pagination,
      })
      .parse(request.query ?? {});

    const where: Prisma.PaymentWhereInput = {
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      app.db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: { merchant: { select: { id: true, name: true, slug: true } } },
      }),
      app.db.payment.count({ where }),
    ]);

    return {
      total,
      transactions: payments.map((payment) => ({
        id: payment.id,
        reference: payment.reference,
        providerReference: payment.providerReference,
        merchant: payment.merchant,
        amountKobo: toSafeNumber(payment.amountKobo),
        currency: payment.currency,
        status: payment.status,
        settlementMode: payment.settlementMode,
        channel: payment.channel,
        failureReason: payment.failureReason,
        target: payment.invoiceId
          ? { type: 'invoice', id: payment.invoiceId }
          : payment.bookingId
            ? { type: 'booking', id: payment.bookingId }
            : payment.holdId
              ? { type: 'hold', id: payment.holdId }
              : null,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  });

  /** Payments the webhook could not settle on its own. */
  app.get('/admin/verifications', { preHandler: adminOnly }, async (request) => {
    const query = z.object({ limit: pagination.limit }).parse(request.query ?? {});

    const payments = await app.db.payment.findMany({
      where: { failureReason: { not: null }, reviewedAt: null },
      orderBy: { createdAt: 'asc' },
      take: query.limit,
      include: { merchant: { select: { id: true, name: true, slug: true } } },
    });

    return {
      verifications: payments.map((payment) => ({
        id: payment.id,
        reference: payment.reference,
        merchant: payment.merchant,
        amountKobo: toSafeNumber(payment.amountKobo),
        currency: payment.currency,
        status: payment.status,
        reason: payment.failureReason,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  });

  app.post<{ Params: { id: string } }>(
    '/admin/verifications/:id/review',
    { preHandler: adminOnly },
    async (request) => {
      const id = uuid.parse(request.params.id);
      const body = z
        .object({
          resolution: z.enum(['resolved', 'dismissed']),
          note: z.string().trim().max(500).optional(),
        })
        .strict()
        .parse(request.body ?? {});

      const payment = await app.db.payment.findFirst({ where: { id } });
      if (!payment) throw new NotFoundError('Payment not found');
      if (!payment.failureReason) throw new NotFoundError('Nothing to review for this payment');

      const reviewedAt = new Date();
      const updated = await app.db.payment.updateMany({
        where: { id, reviewedAt: null },
        data: { reviewedAt, reviewedBy: request.auth?.userId ?? null },
      });
      if (updated.count === 0) {
        throw new NotFoundError('That review was already completed');
      }

      await writeAudit(app.db, {
        merchantId: payment.merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'payment.reviewed',
        entityType: 'payment',
        entityId: payment.id,
        after: {
          resolution: body.resolution,
          note: body.note ?? null,
          reason: payment.failureReason,
        },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return {
        review: {
          paymentId: payment.id,
          resolution: body.resolution,
          reviewedAt: reviewedAt.toISOString(),
          reviewedBy: request.auth?.userId ?? null,
        },
      };
    },
  );

  app.get('/admin/audit', { preHandler: adminOnly }, async (request) => {
    const query = z
      .object({
        merchantId: uuid.optional(),
        action: z.string().trim().min(1).max(80).optional(),
        ...pagination,
      })
      .parse(request.query ?? {});

    const where: Prisma.AuditLogWhereInput = {
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const [logs, total] = await Promise.all([
      app.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          merchant: { select: { id: true, name: true, slug: true } },
          actor: { select: { id: true, email: true, name: true } },
        },
      }),
      app.db.auditLog.count({ where }),
    ]);

    return {
      total,
      entries: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        merchant: log.merchant,
        actor: log.actor,
        actorRole: log.actorRole,
        after: log.after,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  });
};
