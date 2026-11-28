import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeAudit } from '../../platform/audit.js';
import { createAuthGuards } from '../../platform/auth.js';
import type { AppConfig } from '../../platform/config.js';
import { NotFoundError } from '../../platform/errors.js';
import { runReconciliation } from './run.js';

/**
 * Owner-facing reconciliation. Mounted at /api/reconciliation.
 *
 * Running the job is a read of the tenant's money; resolving a finding only
 * marks it reviewed. Neither route can move money, and every resolve is audited.
 */

const uuid = z.string().uuid();

function toSafeNumber(value: bigint): number {
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value);
}

function serializeRun(run: {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  paymentsChecked: number;
  exceptionsFound: number;
}) {
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    paymentsChecked: run.paymentsChecked,
    exceptionsFound: run.exceptionsFound,
  };
}

export const reconciliationRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];

  app.post('/reconciliation/run', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const run = await runReconciliation(app.db, { merchantId });

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'reconciliation.run',
      entityType: 'reconciliation_run',
      entityId: run.id,
      after: {
        paymentsChecked: run.paymentsChecked,
        exceptionsFound: run.exceptionsFound,
      },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return { run: serializeRun(run) };
  });

  app.get('/reconciliation/runs', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
      .parse(request.query ?? {});

    const runs = await app.db.reconciliationRun.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return { runs: runs.map(serializeRun) };
  });

  app.get('/reconciliation/exceptions', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z.enum(['open', 'resolved']).default('open'),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const exceptions = await app.db.reconciliationException.findMany({
      where: { merchantId, status: query.status },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: { payment: { select: { reference: true, status: true } } },
    });

    return {
      exceptions: exceptions.map((exception) => ({
        id: exception.id,
        kind: exception.kind,
        status: exception.status,
        detail: exception.detail,
        amountKobo: toSafeNumber(exception.amountKobo),
        payment: exception.payment
          ? { reference: exception.payment.reference, status: exception.payment.status }
          : null,
        resolvedAt: exception.resolvedAt?.toISOString() ?? null,
        createdAt: exception.createdAt.toISOString(),
      })),
    };
  });

  app.post<{ Params: { id: string } }>(
    '/reconciliation/exceptions/:id/resolve',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = z
        .object({ note: z.string().trim().max(500).optional() })
        .strict()
        .parse(request.body ?? {});

      const resolvedAt = new Date();
      const updated = await app.db.reconciliationException.updateMany({
        where: { id, merchantId, status: 'open' },
        data: {
          status: 'resolved',
          resolvedAt,
          resolvedBy: request.auth?.userId ?? null,
        },
      });
      if (updated.count === 0) throw new NotFoundError('Open exception not found');

      await writeAudit(app.db, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'reconciliation.exception_resolved',
        entityType: 'reconciliation_exception',
        entityId: id,
        after: { note: body.note ?? null },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return { exception: { id, status: 'resolved', resolvedAt: resolvedAt.toISOString() } };
    },
  );
};
