import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { SANDBOX_SECRET_KEY, signWebhookPayload } from '../../src/modules/payments/paystack.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

const TOTAL_KOBO = 65_000_000;
const DEPOSIT_KOBO = 26_000_000;
const BALANCE_KOBO = 39_000_000;

describe.skipIf(!hasDatabase)('invoices from accepted quotes', () => {
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

  function futureIso(days = 7) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const items = [
    { description: 'Full-day coverage', quantity: 1, unitPriceKobo: 45_000_000 },
    { description: 'Second photographer', quantity: 2, unitPriceKobo: 10_000_000 },
  ];

  async function acceptedQuote(
    account: TestAccount,
    options: { depositPercent?: number; items?: typeof items } = {},
  ) {
    const created = await app.inject({
      method: 'POST',
      url: '/api/quotes',
      headers: auth(account.cookie),
      payload: {
        clientName: 'Ada Obi',
        clientEmail: 'ada@example.com',
        items: options.items ?? items,
        depositPercent: options.depositPercent ?? 40,
        validUntil: futureIso(),
      },
    });
    expect(created.statusCode).toBe(201);
    const quoteId = created.json().quote.id as string;

    const sent = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/send`,
      headers: auth(account.cookie),
      payload: {},
    });
    expect(sent.statusCode).toBe(200);

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${sent.json().shareToken}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(accepted.statusCode).toBe(200);

    const body = accepted.json();
    return {
      quoteId,
      invoice: body.invoice as {
        id: string;
        number: number;
        kind: string;
        amountKobo: number;
        publicToken: string;
      },
    };
  }

  async function payInvoice(token: string, email = 'ada@example.com') {
    return app.inject({
      method: 'POST',
      url: `/api/public/invoices/${token}/pay`,
      headers: { origin: TEST_ORIGIN },
      payload: { email },
    });
  }

  async function deliverCharge(reference: string, amount: number, id = randomInt(1, 1_000_000)) {
    const payload = {
      event: 'charge.success',
      data: {
        id,
        reference,
        amount,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
      },
    };
    const raw = Buffer.from(JSON.stringify(payload));
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/paystack',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': signWebhookPayload(raw, SANDBOX_SECRET_KEY),
      },
      payload: raw,
    });
  }

  it('issues a numbered deposit invoice at acceptance and links it to the client', async () => {
    const account = await createAccount(app);
    const { quoteId, invoice } = await acceptedQuote(account);

    expect(invoice.kind).toBe('deposit');
    expect(invoice.number).toBe(1);
    expect(invoice.amountKobo).toBe(DEPOSIT_KOBO);
    expect(invoice.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const view = await app.inject({
      method: 'GET',
      url: `/api/public/invoices/${invoice.publicToken}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(view.statusCode).toBe(200);
    expect(view.json()).toMatchObject({
      merchant: { name: 'Studio Teni' },
      invoice: {
        number: 1,
        kind: 'deposit',
        status: 'open',
        amountKobo: DEPOSIT_KOBO,
        canPay: true,
      },
    });

    const balance = await app.db.invoice.count({ where: { kind: 'balance' } });
    expect(balance).toBe(0);
    expect(await app.db.booking.count()).toBe(0);
    expect(await app.db.resourceAllocation.count()).toBe(0);

    const stored = await app.db.invoice.findFirstOrThrow({
      where: { quoteVersionId: { not: null } },
    });
    expect(stored.publicTokenHash).not.toBe(invoice.publicToken);

    const quote = await app.db.quote.findUniqueOrThrow({ where: { id: quoteId } });
    expect(quote.status).toBe('accepted');
  });

  it('initializes a settlement-pinned payment for an invoice', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);

    const pay = await payInvoice(invoice.publicToken);
    expect(pay.statusCode).toBe(201);
    expect(pay.json().payment).toMatchObject({
      amountKobo: DEPOSIT_KOBO,
      status: 'pending',
      settlementMode: 'platform',
    });
    expect(pay.json().payment.authorizationUrl).toMatch(/^https?:\/\//);

    const payment = await app.db.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });
    expect(payment.amountKobo).toBe(BigInt(DEPOSIT_KOBO));
    expect(payment.holdId).toBeNull();
    expect(payment.bookingId).toBeNull();
  });

  it('marks the deposit paid, issues the balance invoice, and is idempotent', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);
    const pay = await payInvoice(invoice.publicToken);
    const reference = pay.json().payment.reference as string;

    const first = await deliverCharge(reference, DEPOSIT_KOBO);
    expect(first.statusCode).toBe(200);

    const deposit = await app.db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(deposit.status).toBe('paid');
    expect(deposit.paidKobo).toBe(BigInt(DEPOSIT_KOBO));
    expect(deposit.paidAt).not.toBeNull();

    const balances = await app.db.invoice.findMany({ where: { kind: 'balance' } });
    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({
      number: 2,
      status: 'open',
      amountKobo: BigInt(BALANCE_KOBO),
      publicTokenHash: null,
    });

    const ledger = await app.db.ledgerEntry.findMany({ where: { kind: 'charge' } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.amountKobo).toBe(BigInt(DEPOSIT_KOBO));

    // Two more deliveries of the same event change nothing.
    await deliverCharge(reference, DEPOSIT_KOBO);
    await deliverCharge(reference, DEPOSIT_KOBO);
    expect(await app.db.invoice.count({ where: { kind: 'balance' } })).toBe(1);
    expect(await app.db.ledgerEntry.count({ where: { kind: 'charge' } })).toBe(1);
  });

  it('settles the balance invoice without issuing another', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);
    const depositPay = await payInvoice(invoice.publicToken);
    await deliverCharge(depositPay.json().payment.reference, DEPOSIT_KOBO);

    const balance = await app.db.invoice.findFirstOrThrow({ where: { kind: 'balance' } });

    const link = await app.inject({
      method: 'POST',
      url: `/api/invoices/${balance.id}/link`,
      headers: auth(account.cookie),
    });
    expect(link.statusCode).toBe(200);
    const balanceToken = link.json().publicToken as string;

    const pay = await payInvoice(balanceToken);
    expect(pay.statusCode).toBe(201);
    expect(pay.json().payment.amountKobo).toBe(BALANCE_KOBO);

    await deliverCharge(pay.json().payment.reference, BALANCE_KOBO);

    const paidBalance = await app.db.invoice.findUniqueOrThrow({ where: { id: balance.id } });
    expect(paidBalance.status).toBe('paid');
    expect(paidBalance.paidKobo).toBe(BigInt(BALANCE_KOBO));
    expect(await app.db.invoice.count()).toBe(2);

    const totalCharged = await app.db.ledgerEntry.aggregate({
      where: { kind: 'charge' },
      _sum: { amountKobo: true },
    });
    expect(totalCharged._sum.amountKobo).toBe(BigInt(TOTAL_KOBO));
  });

  it('issues one full invoice when there is no deposit', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account, { depositPercent: 0 });

    expect(invoice.kind).toBe('full');
    expect(invoice.amountKobo).toBe(TOTAL_KOBO);

    const pay = await payInvoice(invoice.publicToken);
    await deliverCharge(pay.json().payment.reference, TOTAL_KOBO);

    expect(await app.db.invoice.count()).toBe(1);
    const paid = await app.db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(paid.status).toBe('paid');
  });

  it('keeps invoice numbers sequential per merchant across quotes', async () => {
    const account = await createAccount(app);
    const first = await acceptedQuote(account);
    const firstPay = await payInvoice(first.invoice.publicToken);
    await deliverCharge(firstPay.json().payment.reference, DEPOSIT_KOBO);

    const second = await acceptedQuote(account);
    expect(second.invoice.number).toBe(3);

    const other = await createAccount(app);
    const otherQuote = await acceptedQuote(other);
    expect(otherQuote.invoice.number).toBe(1);
  });

  it('voids an open invoice and refuses payment', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);

    const voided = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/void`,
      headers: auth(account.cookie),
    });
    expect(voided.statusCode).toBe(200);
    expect(voided.json().invoice.status).toBe('void');

    const view = await app.inject({
      method: 'GET',
      url: `/api/public/invoices/${invoice.publicToken}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(view.json().invoice.canPay).toBe(false);

    const pay = await payInvoice(invoice.publicToken);
    expect(pay.statusCode).toBe(409);

    const again = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/void`,
      headers: auth(account.cookie),
    });
    expect(again.statusCode).toBe(409);
  });

  it('rotates a payment link and invalidates the old one', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);

    const link = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/link`,
      headers: auth(account.cookie),
    });
    expect(link.statusCode).toBe(200);
    expect(link.json().publicToken).not.toBe(invoice.publicToken);

    const oldLink = await app.inject({
      method: 'GET',
      url: `/api/public/invoices/${invoice.publicToken}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(oldLink.statusCode).toBe(404);

    const newLink = await app.inject({
      method: 'GET',
      url: `/api/public/invoices/${link.json().publicToken}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(newLink.statusCode).toBe(200);
  });

  it('flags an amount mismatch instead of paying the invoice', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);
    const pay = await payInvoice(invoice.publicToken);

    const response = await deliverCharge(pay.json().payment.reference, 1_000);
    expect(response.statusCode).toBe(200);

    const stored = await app.db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(stored.status).toBe('open');
    expect(stored.paidKobo).toBe(0n);

    const payment = await app.db.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });
    expect(payment.failureReason).toBe('amount_mismatch');
    expect(await app.db.invoice.count({ where: { kind: 'balance' } })).toBe(0);
  });

  it('keeps invoices inside their merchant and rejects unknown links', async () => {
    const account = await createAccount(app);
    const other = await createAccount(app);
    const { invoice } = await acceptedQuote(account);

    const crossTenant = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoice.id}`,
      headers: auth(other.cookie),
    });
    expect(crossTenant.statusCode).toBe(404);

    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/invoices',
      headers: { origin: TEST_ORIGIN },
    });
    expect(anonymous.statusCode).toBe(401);

    const unknown = await app.inject({
      method: 'GET',
      url: '/api/public/invoices/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      headers: { origin: TEST_ORIGIN },
    });
    expect(unknown.statusCode).toBe(404);
  });
});
