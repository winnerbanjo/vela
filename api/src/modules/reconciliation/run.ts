import type { Prisma, PrismaClient } from '@prisma/client';
import { reconcilePayments } from './reconcile.js';

/**
 * Runs reconciliation for one merchant or every live merchant.
 *
 * Each call creates a run row, writes findings with `skipDuplicates` against the
 * open-finding unique index, and finishes the run with counts. Failures mark the
 * run `failed` so a stuck job is visible instead of silently disappearing.
 */

export interface RunReconciliationOptions {
  readonly merchantId?: string | null;
  readonly now?: Date;
}

export async function runReconciliation(db: PrismaClient, options: RunReconciliationOptions = {}) {
  const now = options.now ?? new Date();
  const merchantId = options.merchantId ?? null;

  const run = await db.reconciliationRun.create({
    data: { merchantId, status: 'running' },
  });

  try {
    const merchants = merchantId
      ? await db.merchant.findMany({
          where: { id: merchantId, deletedAt: null },
          select: { id: true },
        })
      : await db.merchant.findMany({
          where: { deletedAt: null, status: { in: ['active', 'onboarding'] } },
          select: { id: true },
        });

    let paymentsChecked = 0;
    let exceptionsFound = 0;
    const summary: Array<{
      merchantId: string;
      payments: number;
      findings: number;
    }> = [];

    for (const merchant of merchants) {
      const [payments, ledger] = await Promise.all([
        db.payment.findMany({
          where: { merchantId: merchant.id },
          select: {
            id: true,
            status: true,
            amountKobo: true,
            failureReason: true,
            reference: true,
            createdAt: true,
          },
        }),
        db.ledgerEntry.findMany({
          where: { merchantId: merchant.id },
          select: { paymentId: true, kind: true, amountKobo: true },
        }),
      ]);

      const findings = reconcilePayments(
        payments.map((payment) => ({
          id: payment.id,
          status: payment.status,
          amountKobo: Number(payment.amountKobo),
          failureReason: payment.failureReason,
          reference: payment.reference,
          createdAt: payment.createdAt,
        })),
        ledger.map((entry) => ({
          paymentId: entry.paymentId,
          kind: entry.kind,
          amountKobo: Number(entry.amountKobo),
        })),
        now,
      );

      paymentsChecked += payments.length;
      exceptionsFound += findings.length;

      if (findings.length > 0) {
        await db.reconciliationException.createMany({
          data: findings.map((finding) => ({
            runId: run.id,
            merchantId: merchant.id,
            paymentId: finding.paymentId,
            kind: finding.kind,
            detail: finding.detail,
            amountKobo: BigInt(finding.amountKobo),
          })),
          skipDuplicates: true,
        });
      }

      summary.push({
        merchantId: merchant.id,
        payments: payments.length,
        findings: findings.length,
      });
    }

    return db.reconciliationRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        paymentsChecked,
        exceptionsFound,
        summary: summary as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await db.reconciliationRun.update({
      where: { id: run.id },
      data: { status: 'failed', finishedAt: new Date() },
    });
    throw error;
  }
}
