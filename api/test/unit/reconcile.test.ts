import { describe, expect, it } from 'vitest';
import {
  reconcilePayments,
  type ReconciliationLedgerEntry,
  type ReconciliationPayment,
} from '../../src/modules/reconciliation/reconcile.js';

const now = new Date('2026-11-28T12:00:00Z');

function payment(overrides: Partial<ReconciliationPayment> = {}): ReconciliationPayment {
  return {
    id: 'pay-1',
    status: 'succeeded',
    amountKobo: 250_000,
    failureReason: null,
    reference: 'ref-1',
    createdAt: new Date('2026-11-27T12:00:00Z'),
    ...overrides,
  };
}

function charge(overrides: Partial<ReconciliationLedgerEntry> = {}): ReconciliationLedgerEntry {
  return { paymentId: 'pay-1', kind: 'charge', amountKobo: 250_000, ...overrides };
}

describe('reconciliation rules', () => {
  it('reports nothing for a balanced charge', () => {
    expect(reconcilePayments([payment()], [charge()], now)).toEqual([]);
  });

  it('reports a missing or wrong charge', () => {
    const missing = reconcilePayments([payment()], [], now);
    expect(missing.map((finding) => finding.kind)).toEqual(['ledger_mismatch']);

    const wrong = reconcilePayments([payment()], [charge({ amountKobo: 200_000 })], now);
    expect(wrong[0]?.kind).toBe('ledger_mismatch');
    expect(wrong[0]?.detail).toContain('2500.00');
  });

  it('reports a refund row that does not reverse the charge', () => {
    const findings = reconcilePayments(
      [payment({ status: 'refunded' })],
      [charge(), { paymentId: 'pay-1', kind: 'refund', amountKobo: -200_000 }],
      now,
    );
    expect(findings.map((finding) => finding.kind)).toEqual(['refund_mismatch']);
  });

  it('flags a stale pending payment and unexpected refund rows', () => {
    const findings = reconcilePayments(
      [payment({ status: 'pending', createdAt: new Date('2026-11-26T12:00:00Z') })],
      [{ paymentId: 'pay-1', kind: 'refund', amountKobo: -1 }],
      now,
    );
    expect(findings.map((finding) => finding.kind).sort()).toEqual([
      'refund_mismatch',
      'stuck_pending',
    ]);
  });

  it('carries webhook exceptions into the same queue', () => {
    const mismatch = reconcilePayments(
      [payment({ status: 'pending', failureReason: 'amount_mismatch' })],
      [],
      now,
    );
    expect(mismatch.map((finding) => finding.kind)).toContain('amount_mismatch');

    const unscheduled = reconcilePayments(
      [payment({ failureReason: 'paid_but_unscheduled' })],
      [charge()],
      now,
    );
    expect(unscheduled.map((finding) => finding.kind)).toContain('paid_without_target');
  });
});
