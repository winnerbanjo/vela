import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { hashPassword } from '../../src/modules/identity/password.js';
import { createSession } from '../../src/modules/identity/session.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

describe.skipIf(!hasDatabase)('admin read surfaces and dashboard summary', () => {
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
    return { user, headers: { authorization: `Bearer ${accessToken}` } };
  }

  async function seedBooking(account: TestAccount) {
    const service = await app.db.service.create({
      data: {
        merchantId: account.merchantId,
        name: 'Signature cut',
        durationMinutes: 30,
        priceKobo: 1_000_000n,
        depositKobo: 200_000n,
      },
    });
    return app.db.booking.create({
      data: {
        merchantId: account.merchantId,
        serviceId: service.id,
        resourceId: randomUUID(),
        reference: `BK-${randomUUID().slice(0, 8)}`,
        clientName: 'Ada Obi',
        clientEmail: 'ada@example.com',
        startsAt: new Date(Date.now() + 60_000),
        endsAt: new Date(Date.now() + 31 * 60_000),
        priceKobo: 1_000_000n,
        depositKobo: 200_000n,
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

  async function seedInvoice(account: TestAccount, number = 1) {
    return app.db.invoice.create({
      data: {
        merchantId: account.merchantId,
        kind: 'deposit',
        number,
        amountKobo: 100_000n,
        clientName: 'Ada Obi',
        description: 'Deposit',
      },
    });
  }

  it('rejects anonymous and owner access to admin routes', async () => {
    const account = await createAccount(app);

    const anonymous = await app.inject({ method: 'GET', url: '/api/admin/overview' });
    expect(anonymous.statusCode).toBe(401);

    const owner = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: { cookie: account.cookie, origin: TEST_ORIGIN },
    });
    expect(owner.statusCode).toBe(403);
  });

  it('summarizes merchants, bookings, money, and open reviews', async () => {
    const admin = await createAdmin();
    const account = await createAccount(app);
    await seedBooking(account);
    const invoice = await seedInvoice(account);
    await seedPayment(account, invoice.id, { failureReason: 'amount_mismatch' });
    await app.db.ledgerEntry.create({
      data: {
        merchantId: account.merchantId,
        kind: 'charge',
        amountKobo: 250_000n,
        memo: 'Charge',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: admin.headers,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.merchants.total).toBe(1);
    expect(body.merchants.active).toBe(0);
    expect(body.bookingsLast30Days.confirmed).toBe(1);
    expect(body.moneyLast30Days.collectedKobo).toBe(250_000);
    expect(body.moneyLast30Days.refundedKobo).toBe(0);
    expect(body.moneyLast30Days.netKobo).toBe(250_000);
    expect(body.reviewsOpen).toBe(1);
  });

  it('lists merchants and returns a tenant detail without secrets', async () => {
    const admin = await createAdmin();
    const account = await createAccount(app);
    await app.db.paymentSettings.create({
      data: {
        merchantId: account.merchantId,
        mode: 'direct',
        status: 'active',
        secretKeyCiphertext: 'ciphertext-should-never-leak',
        secretKeyLast4: '1234',
        accountNumberCiphertext: 'ciphertext-account-must-not-leak',
        accountNumberLast4: '5678',
        bankName: 'GTBank',
        accountName: 'Studio Teni',
      },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/merchants?q=studio',
      headers: admin.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);
    expect(list.json().merchants[0].slug).toBe(account.slug);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/admin/merchants/${account.merchantId}`,
      headers: admin.headers,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().merchant.paymentSettings.accountNumberLast4).toBe('5678');
    expect(detail.body).not.toContain('ciphertext-');

    const providers = await app.inject({
      method: 'GET',
      url: '/api/admin/providers',
      headers: admin.headers,
    });
    expect(providers.statusCode).toBe(200);
    expect(providers.json().connections).toHaveLength(1);
    expect(providers.json().connections[0].secretKeyLast4).toBe('1234');
    expect(providers.body).not.toContain('ciphertext-');
  });

  it('lists bookings and transactions across tenants', async () => {
    const admin = await createAdmin();
    const account = await createAccount(app);
    const booking = await seedBooking(account);
    const invoice = await seedInvoice(account);
    const payment = await seedPayment(account, invoice.id, { status: 'pending', paidAt: null });

    const bookings = await app.inject({
      method: 'GET',
      url: `/api/admin/bookings?merchantId=${account.merchantId}`,
      headers: admin.headers,
    });
    expect(bookings.statusCode).toBe(200);
    expect(bookings.json().total).toBe(1);
    expect(bookings.json().bookings[0].id).toBe(booking.id);
    expect(bookings.json().bookings[0].priceKobo).toBe(1_000_000);

    const transactions = await app.inject({
      method: 'GET',
      url: '/api/admin/transactions?status=pending',
      headers: admin.headers,
    });
    expect(transactions.statusCode).toBe(200);
    expect(transactions.json().total).toBe(1);
    expect(transactions.json().transactions[0].id).toBe(payment.id);
    expect(transactions.json().transactions[0].target).toEqual({
      type: 'invoice',
      id: invoice.id,
    });
  });

  it('moves flagged payments through the verification queue with an audit row', async () => {
    const admin = await createAdmin();
    const account = await createAccount(app);
    const invoice = await seedInvoice(account);
    const payment = await seedPayment(account, invoice.id, {
      failureReason: 'paid_but_unscheduled',
    });

    const queue = await app.inject({
      method: 'GET',
      url: '/api/admin/verifications',
      headers: admin.headers,
    });
    expect(queue.statusCode).toBe(200);
    expect(queue.json().verifications).toHaveLength(1);
    expect(queue.json().verifications[0].reason).toBe('paid_but_unscheduled');

    const owner = await app.inject({
      method: 'POST',
      url: `/api/admin/verifications/${payment.id}/review`,
      headers: { cookie: account.cookie, origin: TEST_ORIGIN },
      payload: { resolution: 'resolved' },
    });
    expect(owner.statusCode).toBe(403);

    const reviewed = await app.inject({
      method: 'POST',
      url: `/api/admin/verifications/${payment.id}/review`,
      headers: admin.headers,
      payload: { resolution: 'resolved', note: 'Booked manually' },
    });
    expect(reviewed.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: '/api/admin/verifications',
      headers: admin.headers,
    });
    expect(after.json().verifications).toHaveLength(0);

    const audit = await app.inject({
      method: 'GET',
      url: '/api/admin/audit?action=payment.reviewed',
      headers: admin.headers,
    });
    expect(audit.json().total).toBe(1);
    expect(audit.json().entries[0].actor.email).toBe(admin.user.email);
  });

  it('serves the merchant dashboard summary in tenant time instead of UTC', async () => {
    const account = await createAccount(app);
    await seedBooking(account);
    await seedInvoice(account);
    await app.db.ledgerEntry.create({
      data: {
        merchantId: account.merchantId,
        kind: 'charge',
        amountKobo: 500_000n,
        memo: 'Charge',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/dashboard/summary',
      headers: { cookie: account.cookie, origin: TEST_ORIGIN },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.today.bookings).toBe(1);
    expect(body.invoices.open).toBe(1);
    expect(body.invoices.openAmountKobo).toBe(100_000);
    expect(body.revenue.netKobo).toBe(500_000);

    // A platform admin has no merchant, so the tenant summary is not theirs.
    const admin = await createAdmin();
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/dashboard/summary',
      headers: admin.headers,
    });
    expect(forbidden.statusCode).toBe(403);
  });
});
