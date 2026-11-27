import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { SANDBOX_SECRET_KEY, signWebhookPayload } from '../../src/modules/payments/paystack.js';
import { addDays, instantToZonedMinute } from '../../src/modules/schedule/time.js';
import { createAccount, TEST_ORIGIN, TEST_PASSWORD, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

const TZ = 'Africa/Lagos';
const SECRET_KEY = 'sk_test_vela_fixture_not_a_real_key';
const PRICE_KOBO = 500_000;
const DEPOSIT_KOBO = 100_000;

describe.skipIf(!hasDatabase)('payment connections and dual settlement', () => {
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

  async function setupStudio(): Promise<{ account: TestAccount; serviceId: string; date: string }> {
    const account = await createAccount(app);

    const service = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(account.cookie),
      payload: {
        name: 'Signature Haircut',
        durationMinutes: 45,
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
    return hold.json().hold as { id: string };
  }

  function connect(account: TestAccount, body: Record<string, unknown>) {
    return app.inject({
      method: 'PUT',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD, ...body },
    });
  }

  function initialize(holdId: string) {
    return app.inject({
      method: 'POST',
      url: '/api/payments/initialize',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, email: 'amaka@example.com', name: 'Amaka Obi' },
    });
  }

  function deliver(payload: unknown, signature?: string) {
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

  function chargePayload(payment: { reference: string; amountKobo: number }, id = 88001) {
    return {
      event: 'charge.success',
      data: {
        id,
        reference: payment.reference,
        amount: payment.amountKobo,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
      },
    };
  }

  it('defaults to the platform account and hides all credentials', async () => {
    const account = await createAccount(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().settings).toMatchObject({
      mode: 'platform',
      status: 'active',
      platform: { available: true, mode: 'sandbox', subaccountCode: null },
      direct: { connected: false, keyLast4: null },
      payout: null,
      ready: true,
    });

    const anonymous = await app.inject({ method: 'GET', url: '/api/payments/settings' });
    expect(anonymous.statusCode).toBe(401);
  });

  it('connects the merchant’s own Paystack key sealed at rest and never echoes it', async () => {
    const account = await createAccount(app);

    const wrongPassword = await app.inject({
      method: 'PUT',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: { mode: 'direct', secretKey: SECRET_KEY, password: 'not-the-password' },
    });
    expect(wrongPassword.statusCode).toBe(401);

    const connected = await connect(account, { mode: 'direct', secretKey: SECRET_KEY });
    expect(connected.statusCode).toBe(200);
    expect(connected.json().settings).toMatchObject({
      mode: 'direct',
      direct: { connected: true, keyLast4: '_key' },
      ready: true,
    });
    expect(connected.body).not.toContain(SECRET_KEY);

    const row = await app.db.paymentSettings.findUniqueOrThrow({
      where: { merchantId: account.merchantId },
    });
    expect(row.secretKeyCiphertext).not.toBeNull();
    expect(row.secretKeyCiphertext).not.toContain(SECRET_KEY);
    expect(row.secretKeyLast4).toBe('_key');
    expect(row.secretKeyFingerprint).toMatch(/^[0-9a-f]{64}$/);

    // A public-looking key and unknown fields are rejected.
    const bad = await connect(account, { mode: 'direct', secretKey: 'pk_test_not_a_secret' });
    expect(bad.statusCode).toBe(400);

    const smuggled = await app.inject({
      method: 'PUT',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: {
        mode: 'direct',
        secretKey: SECRET_KEY,
        password: TEST_PASSWORD,
        merchantId: account.merchantId,
      },
    });
    expect(smuggled.statusCode).toBe(400);
  });

  it('lists banks and verifies a payout account before creating a subaccount', async () => {
    const account = await createAccount(app);

    const banks = await app.inject({
      method: 'GET',
      url: '/api/payments/banks',
      headers: auth(account.cookie),
    });
    expect(banks.statusCode).toBe(200);
    expect(banks.json().banks).toContainEqual({ code: '058', name: 'Guaranty Trust Bank' });

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '058', accountNumber: '0123456789', password: 'nope' },
    });
    expect(wrongPassword.statusCode).toBe(401);

    const created = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '058', accountNumber: '0123456789', password: TEST_PASSWORD },
    });
    expect(created.statusCode).toBe(200);

    const settings = created.json().settings;
    expect(settings.payout).toMatchObject({
      bankCode: '058',
      bankName: 'Guaranty Trust Bank',
      accountName: 'VELA SANDBOX 6789',
      accountNumberLast4: '6789',
    });
    expect(settings.platform.subaccountCode).toMatch(/^ACCT_sandbox_[0-9a-f]{10}$/);
    expect(settings.ready).toBe(true);
    expect(created.body).not.toContain('0123456789');

    const row = await app.db.paymentSettings.findUniqueOrThrow({
      where: { merchantId: account.merchantId },
    });
    expect(row.accountNumberCiphertext).not.toContain('0123456789');
    expect(row.bankVerifiedAt).toBeInstanceOf(Date);

    const audit = await app.db.auditLog.findFirst({
      where: { action: 'payment.payout_account.updated' },
    });
    expect(audit).not.toBeNull();

    const unknownBank = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '999', accountNumber: '0123456789', password: TEST_PASSWORD },
    });
    expect(unknownBank.statusCode).toBe(400);
  });

  it('records a payout account for direct mode without creating a subaccount', async () => {
    const account = await createAccount(app);
    expect((await connect(account, { mode: 'direct', secretKey: SECRET_KEY })).statusCode).toBe(
      200,
    );

    const created = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '057', accountNumber: '9876543210', password: TEST_PASSWORD },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().settings).toMatchObject({
      mode: 'direct',
      payout: { bankName: 'Zenith Bank', accountNumberLast4: '3210' },
      platform: { subaccountCode: null },
    });
  });

  it('initializes direct-mode checkout with the merchant key and pins the mode', async () => {
    const { account, serviceId, date } = await setupStudio();
    expect((await connect(account, { mode: 'direct', secretKey: SECRET_KEY })).statusCode).toBe(
      200,
    );

    const hold = await createHold(account, serviceId, date);
    const created = await initialize(hold.id);
    expect(created.statusCode).toBe(201);
    expect(created.json().payment).toMatchObject({
      settlementMode: 'direct',
      amountKobo: DEPOSIT_KOBO,
      status: 'pending',
    });
  });

  it('confirms a direct-mode payment from a signed webhook and refunds through the same key', async () => {
    const { account, serviceId, date } = await setupStudio();
    expect((await connect(account, { mode: 'direct', secretKey: SECRET_KEY })).statusCode).toBe(
      200,
    );
    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;

    const forged = await deliver(chargePayload(payment), 'ab'.repeat(64));
    expect(forged.statusCode).toBe(401);

    const paid = await deliver(chargePayload(payment));
    expect(paid.statusCode).toBe(200);

    const stored = await app.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stored.status).toBe('succeeded');
    expect(stored.settlementMode).toBe('direct');
    expect(stored.bookingId).toBeTruthy();

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
    expect(ledger.reduce((total, entry) => total + entry.amountKobo, 0n)).toBe(0n);
  });

  it('keeps platform checkout on the platform account and its sandbox subaccount', async () => {
    const { account, serviceId, date } = await setupStudio();

    const payout = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '058', accountNumber: '0123456789', password: TEST_PASSWORD },
    });
    expect(payout.statusCode).toBe(200);

    const hold = await createHold(account, serviceId, date);
    const payment = (await initialize(hold.id)).json().payment;
    expect(payment.settlementMode).toBe('platform');

    const paid = await deliver(chargePayload(payment, 88101));
    expect(paid.statusCode).toBe(200);

    const stored = await app.db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(stored.status).toBe('succeeded');
    expect(stored.settlementMode).toBe('platform');
  });

  it('disconnects a direct key and refuses new checkout until it is reconnected', async () => {
    const { account, serviceId, date } = await setupStudio();
    expect((await connect(account, { mode: 'direct', secretKey: SECRET_KEY })).statusCode).toBe(
      200,
    );

    const wrongPassword = await app.inject({
      method: 'DELETE',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: { password: 'nope' },
    });
    expect(wrongPassword.statusCode).toBe(401);

    const disconnected = await app.inject({
      method: 'DELETE',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD },
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().settings).toMatchObject({
      mode: 'direct',
      status: 'disabled',
      direct: { connected: false },
      ready: false,
    });

    const hold = await createHold(account, serviceId, date);
    const blocked = await initialize(hold.id);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().message).toMatch(/reconnect/i);
  });

  it('refuses to change or disconnect the key while a direct payment is pending', async () => {
    const { account, serviceId, date } = await setupStudio();
    expect((await connect(account, { mode: 'direct', secretKey: SECRET_KEY })).statusCode).toBe(
      200,
    );
    await createHold(account, serviceId, date).then((hold) => initialize(hold.id));

    const blockedDisconnect = await app.inject({
      method: 'DELETE',
      url: '/api/payments/settings',
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD },
    });
    expect(blockedDisconnect.statusCode).toBe(409);
    expect(blockedDisconnect.json().message).toMatch(/pending/i);

    const blockedSwitch = await connect(account, { mode: 'platform' });
    expect(blockedSwitch.statusCode).toBe(409);

    // Re-entering the same key is idempotent and does not orphan the webhook.
    const sameKey = await connect(account, { mode: 'direct', secretKey: SECRET_KEY });
    expect(sameKey.statusCode).toBe(200);
  });

  it('removes the payout destination and clears the subaccount reference', async () => {
    const account = await createAccount(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { bankCode: '058', accountNumber: '0123456789', password: TEST_PASSWORD },
    });
    expect(created.statusCode).toBe(200);

    const removed = await app.inject({
      method: 'DELETE',
      url: '/api/payments/payout-account',
      headers: auth(account.cookie),
      payload: { password: TEST_PASSWORD },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().settings).toMatchObject({
      payout: null,
      platform: { subaccountCode: null },
    });

    const row = await app.db.paymentSettings.findUniqueOrThrow({
      where: { merchantId: account.merchantId },
    });
    expect(row.accountName).toBeNull();
    expect(row.accountNumberCiphertext).toBeNull();
  });
});
