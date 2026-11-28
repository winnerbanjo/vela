import type { FastifyPluginAsync } from 'fastify';
import { createAuthGuards } from '../../platform/auth.js';
import type { AppConfig } from '../../platform/config.js';
import { NotFoundError } from '../../platform/errors.js';
import {
  localDateLabel,
  localMonthLabel,
  startOfDayInZone,
  startOfMonthInZone,
} from '../../shared/time.js';

/**
 * The owner's landing summary. Mounted at /api/dashboard.
 *
 * "Today" and "this month" are resolved in the merchant's timezone, never the
 * server's, and every number is computed from the tenant's own rows. Money is
 * integer kobo.
 */

function toSafeNumber(value: bigint | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export const dashboardRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);

  app.get('/dashboard/summary', { preHandler: guards.requireMerchant }, async (request) => {
    const merchantId = request.auth?.merchantId as string;

    const merchant = await app.db.merchant.findFirst({
      where: { id: merchantId, deletedAt: null },
      select: { id: true, name: true, timezone: true, currency: true },
    });
    if (!merchant) throw new NotFoundError('Merchant not found');

    const now = new Date();
    const dayStart = startOfDayInZone(merchant.timezone, now);
    const nextDayStart = startOfDayInZone(
      merchant.timezone,
      new Date(dayStart.getTime() + 36 * 60 * 60 * 1000),
    );
    const monthStart = startOfMonthInZone(merchant.timezone, now);

    const [
      bookingsToday,
      upcoming,
      openInvoices,
      quotesAwaiting,
      activeJobs,
      intakePending,
      charges,
      refunds,
    ] = await Promise.all([
      app.db.booking.count({
        where: {
          merchantId,
          status: 'confirmed',
          startsAt: { gte: dayStart, lt: nextDayStart },
        },
      }),
      app.db.booking.findMany({
        where: { merchantId, status: 'confirmed', startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        include: { service: { select: { name: true } } },
      }),
      app.db.invoice.aggregate({
        _count: { _all: true },
        _sum: { amountKobo: true },
        where: { merchantId, status: 'open' },
      }),
      app.db.quote.count({ where: { merchantId, status: 'sent' } }),
      app.db.job.count({
        where: { merchantId, status: { in: ['intake_pending', 'in_progress'] } },
      }),
      app.db.job.count({ where: { merchantId, status: 'intake_pending' } }),
      app.db.ledgerEntry.aggregate({
        _sum: { amountKobo: true },
        where: { merchantId, kind: 'charge', createdAt: { gte: monthStart } },
      }),
      app.db.ledgerEntry.aggregate({
        _sum: { amountKobo: true },
        where: { merchantId, kind: 'refund', createdAt: { gte: monthStart } },
      }),
    ]);

    const collectedKobo = toSafeNumber(charges._sum.amountKobo);
    const refundedKobo = Math.abs(toSafeNumber(refunds._sum.amountKobo));

    return {
      merchant,
      today: {
        date: localDateLabel(merchant.timezone, now),
        bookings: bookingsToday,
      },
      upcomingBookings: upcoming.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        clientName: booking.clientName,
        serviceName: booking.service.name,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      })),
      invoices: {
        open: openInvoices._count._all,
        openAmountKobo: toSafeNumber(openInvoices._sum.amountKobo),
      },
      quotes: { awaitingAcceptance: quotesAwaiting },
      jobs: { active: activeJobs, intakePending },
      revenue: {
        month: localMonthLabel(merchant.timezone, now),
        collectedKobo,
        refundedKobo,
        netKobo: collectedKobo - refundedKobo,
      },
    };
  });
};
