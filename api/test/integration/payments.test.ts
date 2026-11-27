import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { SANDBOX_SECRET_KEY, signWebhookPayload } from '../../src/modules/payments/paystack.js';
import { addDays, instantToZonedMinute } from '../../src/modules/schedule/time.js';
import { createAccount, TEST_ORIGIN, TEST_PASSWORD, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

const TZ = 'Africa/Lagos';
const PRICE_KOBO = 1_000_000;
const DEPOSIT_KOBO = 200_000;

describe.skipIf(!hasDatabase)('payments and the paystack webhook', () => {
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

  function auth(cookie: string) {
    return { cookie, origin: TEST_ORIGIN };
  }

  async function setupStudio(): Promise<{
    account: TestAccount;
    serviceId: string;
    date: string;
  }> {
    const account = await createAccount(app);

    const service = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(account.cookie),
      payload: {
        name: 'Signature Haircut',
        durationMinutes: 45,
        bufferMinutes: 10,
        priceKobo: PRICE_KOBO,
        depositKobo: DEPOSIT_KOBO,
      },
    });
    expect(service.statusCode).toBe(201);

    const rules = await app.inject({
      method: 'PUT',
      url: '/api/availability/rules',
      headers: auth(account.cookie),
      payload: {
        rules: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        })),
      },
    });
    expect(rules.statusCode).toBe(200);

    const today = instantToZonedMinute(new Date(), TZ).date;
    return { account, serviceId: service.json().service.id as string, date: addDays(today, 3) };
  }

  async function createHold(account: TestAccount, serviceId: string, date: string) {
    const slots = await app.inject({
      method: 'GET',
      url: `/api/availability/slots?slug=${account.slug}&serviceId=${serviceId}&date=${date}`,
    });
    const startsAt = (slots.json().slots as { startsAt: string }[])[0]?.startsAt;

    const hold = await app.inject({
      method: 'POST',
      url: '/api/holds',
      headers: { origin: TEST_ORIGIN },
      payload: { slug: account.slug, serviceId, startsAt },
    });
    expect(hold.statusCode).toBe(201);
    return hold.json().hold as { id: string; startsAt: string; expiresAt: string };
  }

  async function initialize(holdId: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/payments/initialize',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, email: 'amaka@example.com', name: 'Amaka Obi', ...overrides },
    });
  }

  function chargePayload(
    payment: { reference: string; amountKobo: number },
    overrides: Record<string, unknown> = {},
  ) {
    return {
      event: 'charge.success',
      data: {
        id: 90210,
        reference: payment.reference,
        amount: payment.amountKobo,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
        customer: { email: 'amaka@example.com' },
        ...overrides,
      },
    };
  }

  async function deliver(payload: unknown, signature?: string) {
    const raw = Buffer.from(JSON.stringify(payload));
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/paystack',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': signature ?? signWebhookPayload(raw, SANDBOX_SECRET_KEY),
      },
      payload: raw,
    });
  }

  it('initializes a payment from a live hold for the server-side deposit amount', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);

    const created = await initialize(hold.id);
    expect(created.statusCode).toBe(201);

    const payment = created.json().payment;
    expect(payment).toMatchObject({
      status: 'pending',
      amountKobo: DEPOSIT_KOBO,
      currency: 'NGN',
      holdId: hold.id,
      providerReference: expect.stringMatching(/^sandbox_VELA-[0-9A-F]{12}$/),
      authorizationUrl: expect.stringContaining('https://sandbox.paystack.test/checkout/'),
    });

    // The amount is computed from the service, never accepted from the caller.
    const smuggled = await initialize(hold.id, { amountKobo: 1 });
    expect(smuggled.statusCode).toBe(400);
  });

  it('rejects a webhook whose signature does not match and stores nothing', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;

    const forged = await deliver(chargePayload(payment), 'ab'.repeat(64));
    expect(forged.statusCode).toBe(401);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/webhooks/paystack',
      headers: { 'content-type': 'application/json' },
      payload: Buffer.from(JSON.stringify(chargePayload(payment))),
    });
    expect(missing.statusCode).toBe(401);

    expect(await app.db.paymentEvent.count()).toBe(0);
    expect(await app.db.payment.count({ where: { status: 'succeeded' } })).toBe(0);
  });

  it('confirms one booking and one ledger charge from three identical deliveries', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;
    const payload = chargePayload(payment);

    const first = await deliver(payload);
    const second = await deliver(payload);
    const third = await deliver(payload);

    expect([first.statusCode, second.statusCode, third.statusCode]).toEqual([200, 200, 200]);
    expect(await app.db.paymentEvent.count()).toBe(1);

    const stored = await app.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stored.status).toBe('succeeded');
    expect(stored.paidAt).toBeInstanceOf(Date);
    expect(stored.bookingId).toBeTruthy();

    expect(await app.db.booking.count({ where: { merchantId: account.merchantId } })).toBe(1);

    const ledger = await app.db.ledgerEntry.findMany({ where: { paymentId: payment.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ kind: 'charge', amountKobo: BigInt(DEPOSIT_KOBO) });

    const allocation = await app.db.resourceAllocation.findFirst({
      where: { bookingId: stored.bookingId as string },
    });
    expect(allocation?.kind).toBe('booking');

    const booking = await app.db.booking.findUniqueOrThrow({
      where: { id: stored.bookingId as string },
    });
    expect(booking.clientName).toBe('Amaka Obi');
    expect(booking.priceKobo).toBe(BigInt(PRICE_KOBO));
    expect(booking.depositKobo).toBe(BigInt(DEPOSIT_KOBO));
  });

  it('records an amount mismatch without confirming the booking', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;

    const response = await deliver(chargePayload(payment, { amount: DEPOSIT_KOBO - 1, id: 90211 }));
    expect(response.statusCode).toBe(200);

    const stored = await app.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stored.status).toBe('pending');
    expect(stored.failureReason).toBe('amount_mismatch');

    expect(await app.db.booking.count({ where: { merchantId: account.merchantId } })).toBe(0);
    expect(await app.db.ledgerEntry.count()).toBe(0);

    const audit = await app.db.auditLog.findFirst({ where: { action: 'payment.amount_mismatch' } });
    expect(audit).not.toBeNull();
  });

  it('keeps the money and flags an exception when the hold expired before payment', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;

    await app.db.bookingHold.update({
      where: { id: hold.id },
      data: {
        createdAt: new Date(Date.now() - 3_600_000),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await deliver(chargePayload(payment, { id: 90212 }));
    expect(response.statusCode).toBe(200);

    const stored = await app.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stored.status).toBe('succeeded');
    expect(stored.failureReason).toBe('paid_but_unscheduled');

    expect(await app.db.booking.count({ where: { merchantId: account.merchantId } })).toBe(0);
    expect(await app.db.ledgerEntry.count({ where: { paymentId: payment.id } })).toBe(1);

    const exception = await app.db.auditLog.findFirst({
      where: { action: 'payment.exception_unscheduled' },
    });
    expect(exception).not.toBeNull();
  });

  it('refunds with step-up authentication and writes a negative ledger row', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;
    await deliver(chargePayload(payment));

    const wrongPassword = await app.inject({
      method: 'POST',
      url: `/api/payments/${payment.id}/refund`,
      headers: auth(account.cookie),
      payload: { password: 'not-the-owner-password' },
    });
    expect(wrongPassword.statusCode).toBe(401);

    const refunded = await app.inject({
      method: 'POST',
      url: `/api/payments/${payment.id}/refund`,
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD, reason: 'Client cancelled' },
    });
    expect(refunded.statusCode).toBe(200);
    expect(refunded.json().payment.status).toBe('refunded');

    const ledger = await app.db.ledgerEntry.findMany({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(ledger.map((entry) => entry.kind)).toEqual(['charge', 'refund']);
    expect(ledger[1]?.amountKobo).toBe(BigInt(-DEPOSIT_KOBO));
    expect(ledger.reduce((total, entry) => total + entry.amountKobo, 0n)).toBe(0n);

    const twice = await app.inject({
      method: 'POST',
      url: `/api/payments/${payment.id}/refund`,
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD },
    });
    expect(twice.statusCode).toBe(409);
  });

  it('makes the ledger append-only at the database level', async () => {
    const { account, serviceId, date } = await setupStudio();
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;
    await deliver(chargePayload(payment));

    const entry = await app.db.ledgerEntry.findFirstOrThrow({
      where: { paymentId: payment.id },
    });

    await expect(
      app.db.ledgerEntry.update({
        where: { id: entry.id },
        data: { amountKobo: 1n },
      }),
    ).rejects.toThrow(/append-only/);

    await expect(app.db.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow(
      /append-only/,
    );
  });

  it('keeps payments and the ledger tenant-scoped', async () => {
    const { account, serviceId, date } = await setupStudio();
    const other = await createAccount(app);
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;
    await deliver(chargePayload(payment));

    const foreignRead = await app.inject({
      method: 'GET',
      url: `/api/payments/${payment.reference}`,
      headers: auth(other.cookie),
    });
    expect(foreignRead.statusCode).toBe(404);

    const foreignList = await app.inject({
      method: 'GET',
      url: '/api/payments',
      headers: auth(other.cookie),
    });
    expect(foreignList.json().payments).toHaveLength(0);

    const foreignLedger = await app.inject({
      method: 'GET',
      url: '/api/payments/ledger/entries',
      headers: auth(other.cookie),
    });
    expect(foreignLedger.json().entries).toHaveLength(0);

    const mine = await app.inject({
      method: 'GET',
      url: '/api/payments',
      headers: auth(account.cookie),
    });
    expect(mine.json().payments).toHaveLength(1);
  });
});
