import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { hashPassword } from '../../src/modules/identity/password.js';
import { createSession } from '../../src/modules/identity/session.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

describe.skipIf(!hasDatabase)('reconciliation runs and exceptions', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig({ CORS_ORIGINS: TEST_ORIGIN, RATE_LIMIT_PUBLIC_MAX: '5000' }));
  });

  beforeEach(async () => {
    await resetDatabase(app.db);
  });

  afterAll(async () => {
    await app.close();
  });

  function auth(account: TestAccount) {
    return { cookie: account.cookie, origin: TEST_ORIGIN };
  }

  async function seedInvoice(account: TestAccount, number = 1) {
    return app.db.invoice.create({
      data: {
        merchantId: account.merchantId,
        kind: 'deposit',
        number,
        amountKobo: 250_000n,
        clientName: 'Ada Obi',
        description: 'Deposit',
      },
    });
  }

  async function seedPayment(
    account: TestAccount,
    invoiceId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return app.db.payment.create({
      data: {
        merchantId: account.merchantId,
        invoiceId,
        reference: `ref-${randomUUID()}`,
        amountKobo: 250_000n,
        status: 'succeeded',
        paidAt: new Date(),
        ...overrides,
      },
    });
  }

  async function createAdmin() {
    const user = await app.db.user.create({
      data: {
        email: `ops-${randomUUID().slice(0, 8)}@example.com`,
        name: 'Platform Ops',
        role: 'admin',
        status: 'active',
        passwordHash: await hashPassword('correct horse battery staple'),
        emailVerifiedAt: new Date(),
      },
    });
    const session = await createSession(app.db, user.id);
    const accessToken = app.jwt.sign(
      { sub: user.id, sid: session.sessionId, role: user.role, merchantId: null },
      { expiresIn: '15m' },
    );
    return { authorization: `Bearer ${accessToken}` };
  }

  it('requires a merchant owner to run or read reconciliation', async () => {
    const account = await createAccount(app);
    const anonymous = await app.inject({ method: 'POST', url: '/api/reconciliation/run' });
    expect(anonymous.statusCode).toBe(401);

    const admin = await createAdmin();
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/reconciliation/run',
      headers: admin,
    });
    expect(forbidden.statusCode).toBe(403);

    const staffRead = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/exceptions',
      headers: auth(account),
    });
    expect(staffRead.statusCode).toBe(200);
  });

  it('finds ledger and pending discrepancies, then avoids reopening them', async () => {
    const account = await createAccount(app);
    const invoice = await seedInvoice(account);
    await seedPayment(account, invoice.id);
    await seedPayment(account, invoice.id, {
      reference: `ref-${randomUUID()}`,
      status: 'pending',
      paidAt: null,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      amountKobo: 100_000n,
    });

    const first = await app.inject({
      method: 'POST',
      url: '/api/reconciliation/run',
      headers: auth(account),
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().run.status).toBe('completed');
    expect(first.json().run.paymentsChecked).toBe(2);
    expect(first.json().run.exceptionsFound).toBe(2);

    const open = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/exceptions',
      headers: auth(account),
    });
    const kinds = open
      .json()
      .exceptions.map((entry: { kind: string }) => entry.kind)
      .sort();
    expect(kinds).toEqual(['ledger_mismatch', 'stuck_pending']);
    expect(open.json().exceptions[0].amountKobo).toBeGreaterThan(0);

    const second = await app.inject({
      method: 'POST',
      url: '/api/reconciliation/run',
      headers: auth(account),
    });
    expect(second.statusCode).toBe(200);

    const stillOpen = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/exceptions',
      headers: auth(account),
    });
    expect(stillOpen.json().exceptions).toHaveLength(2);

    const runs = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/runs',
      headers: auth(account),
    });
    expect(runs.json().runs).toHaveLength(2);
  });

  it('leaves balanced money out of the queue', async () => {
    const account = await createAccount(app);
    const invoice = await seedInvoice(account);
    const payment = await seedPayment(account, invoice.id);
    await app.db.ledgerEntry.create({
      data: {
        merchantId: account.merchantId,
        paymentId: payment.id,
        kind: 'charge',
        amountKobo: 250_000n,
        memo: 'Charge',
      },
    });

    const run = await app.inject({
      method: 'POST',
      url: '/api/reconciliation/run',
      headers: auth(account),
    });
    expect(run.json().run.exceptionsFound).toBe(0);
  });

  it('resolves only inside the tenant and writes an audit row', async () => {
    const first = await createAccount(app);
    const second = await createAccount(app);
    const invoice = await seedInvoice(first);
    await seedPayment(first, invoice.id);

    await app.inject({
      method: 'POST',
      url: '/api/reconciliation/run',
      headers: auth(first),
    });
    const open = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/exceptions',
      headers: auth(first),
    });
    const exceptionId = open.json().exceptions[0].id as string;

    const foreign = await app.inject({
      method: 'POST',
      url: `/api/reconciliation/exceptions/${exceptionId}/resolve`,
      headers: auth(second),
    });
    expect(foreign.statusCode).toBe(404);

    const resolved = await app.inject({
      method: 'POST',
      url: `/api/reconciliation/exceptions/${exceptionId}/resolve`,
      headers: auth(first),
      payload: { note: 'Matched in Paystack dashboard' },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().exception.status).toBe('resolved');

    const stillOpen = await app.inject({
      method: 'GET',
      url: '/api/reconciliation/exceptions',
      headers: auth(first),
    });
    expect(stillOpen.json().exceptions).toHaveLength(0);

    const audit = await app.db.auditLog.findFirst({
      where: {
        merchantId: first.merchantId,
        action: 'reconciliation.exception_resolved',
      },
    });
    expect(audit).not.toBeNull();
  });
});
