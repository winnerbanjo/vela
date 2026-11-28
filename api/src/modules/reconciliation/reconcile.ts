import type { ReconciliationExceptionKind } from '@prisma/client';

/**
 * Pure reconciliation rules over payments and the append-only ledger.
 *
 * The job reports discrepancies; it never writes a ledger row or changes a
 * payment. A human decides what a mismatch means.
 */

export interface ReconciliationPayment {
  readonly id: string;
  readonly status: 'pending' | 'succeeded' | 'failed' | 'abandoned' | 'refunded';
  readonly amountKobo: number;
  readonly failureReason: string | null;
  readonly reference: string;
  readonly createdAt: Date;
}

export interface ReconciliationLedgerEntry {
  readonly paymentId: string | null;
  readonly kind: 'charge' | 'refund';
  readonly amountKobo: number;
}

export interface ReconciliationFinding {
  readonly paymentId: string;
  readonly kind: ReconciliationExceptionKind;
  readonly detail: string;
  readonly amountKobo: number;
}

const STUCK_PENDING_MS = 24 * 60 * 60 * 1000;

function kobo(value: number): string {
  return `NGN ${(value / 100).toFixed(2)}`;
}

export function reconcilePayments(
  payments: readonly ReconciliationPayment[],
  ledger: readonly ReconciliationLedgerEntry[],
  now: Date = new Date(),
): ReconciliationFinding[] {
  const byPayment = new Map<string, ReconciliationLedgerEntry[]>();
  for (const entry of ledger) {
    if (!entry.paymentId) continue;
    const rows = byPayment.get(entry.paymentId) ?? [];
    rows.push(entry);
    byPayment.set(entry.paymentId, rows);
  }

  const findings: ReconciliationFinding[] = [];

  for (const payment of payments) {
    const rows = byPayment.get(payment.id) ?? [];
    const charges = rows.filter((row) => row.kind === 'charge');
    const refunds = rows.filter((row) => row.kind === 'refund');
    const charged = charges.reduce((sum, row) => sum + row.amountKobo, 0);
    const refunded = refunds.reduce((sum, row) => sum + row.amountKobo, 0);

    const seen = new Set<ReconciliationExceptionKind>();
    const add = (kind: ReconciliationExceptionKind, detail: string) => {
      if (seen.has(kind)) return;
      seen.add(kind);
      findings.push({ paymentId: payment.id, kind, detail, amountKobo: payment.amountKobo });
    };

    if (payment.status === 'succeeded' || payment.status === 'refunded') {
      if (charged !== payment.amountKobo) {
        add(
          'ledger_mismatch',
          `Charge rows total ${kobo(charged)} but the payment is ${kobo(payment.amountKobo)}`,
        );
      }
    } else if (charges.length > 0) {
      add(
        'ledger_mismatch',
        `A ${payment.status} payment has ${kobo(charged)} of charge rows in the ledger`,
      );
    }

    if (payment.status === 'refunded') {
      if (refunded !== -payment.amountKobo) {
        add(
          'refund_mismatch',
          `Refund rows total ${kobo(refunded)} but the payment was ${kobo(payment.amountKobo)}`,
        );
      }
    } else if (refunds.length > 0) {
      add(
        'refund_mismatch',
        `A ${payment.status} payment has refund rows without a refunded status`,
      );
    }

    if (payment.failureReason === 'amount_mismatch') {
      add(
        'amount_mismatch',
        `Provider amount did not match the expected ${kobo(payment.amountKobo)}`,
      );
    }
    if (payment.failureReason === 'paid_but_unscheduled') {
      add(
        'paid_without_target',
        'Money was received after the hold expired, so no booking or job was created',
      );
    }

    if (
      payment.status === 'pending' &&
      now.getTime() - payment.createdAt.getTime() > STUCK_PENDING_MS
    ) {
      add('stuck_pending', 'Payment has stayed pending for more than 24 hours');
    }
  }

  return findings;
}
