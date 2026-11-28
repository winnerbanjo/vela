import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { quoteShareTokenHash } from '../../src/modules/quotes/quote.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { cookieFrom, resetDatabase } from '../helpers/db.js';

describe.skipIf(!hasDatabase)('quotes and public acceptance', () => {
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

  const standardItems = [
    { description: 'Full-day coverage', quantity: 1, unitPriceKobo: 450_000_00 },
    { description: 'Second photographer', quantity: 2, unitPriceKobo: 100_000_00 },
  ];

  async function createQuote(account: TestAccount, overrides: Record<string, unknown> = {}) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/quotes',
      headers: auth(account.cookie),
      payload: {
        clientName: 'Ada Obi',
        clientEmail: 'ada@example.com',
        items: standardItems,
        depositPercent: 40,
        validUntil: futureIso(),
        notes: 'Wedding coverage',
        ...overrides,
      },
    });
    return response;
  }

  async function sendQuote(account: TestAccount, quoteId: string) {
    return app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/send`,
      headers: auth(account.cookie),
      payload: {},
    });
  }

  it('creates a draft version whose totals are computed from the line items', async () => {
    const account = await createAccount(app);
    const response = await createQuote(account);

    expect(response.statusCode).toBe(201);
    const { quote, version } = response.json();

    expect(quote.status).toBe('draft');
    expect(quote.latestVersion).toBe(1);
    expect(version.status).toBe('draft');
    expect(version.subtotalKobo).toBe(650_000_00);
    expect(version.totalKobo).toBe(650_000_00);
    expect(version.depositKobo).toBe(260_000_00);
    expect(version.balanceKobo).toBe(390_000_00);
    expect(version.items).toHaveLength(2);
    expect(version.items[1]).toMatchObject({
      quantity: 2,
      unitPriceKobo: 100_000_00,
      totalKobo: 200_000_00,
    });
  });

  it('rejects client-supplied totals instead of trusting them', async () => {
    const account = await createAccount(app);
    const response = await createQuote(account, { totalKobo: 1, depositKobo: 1 });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('stores only a digest of the share token and serves the quote publicly', async () => {
    const account = await createAccount(app);
    const created = await createQuote(account);
    const quoteId = created.json().quote.id as string;

    const sent = await sendQuote(account, quoteId);
    expect(sent.statusCode).toBe(200);
    const token = sent.json().shareToken as string;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const stored = await app.db.quoteVersion.findFirstOrThrow({ where: { quoteId } });
    expect(stored.status).toBe('sent');
    expect(stored.shareTokenHash).toBe(quoteShareTokenHash(token));
    expect(stored.shareTokenHash).not.toBe(token);

    const publicView = await app.inject({
      method: 'GET',
      url: `/api/public/quotes/${token}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(publicView.statusCode).toBe(200);
    const body = publicView.json();
    expect(body.merchant.name).toBe('Studio Teni');
    expect(body.quote).toMatchObject({
      version: 1,
      status: 'sent',
      canAccept: true,
      totalKobo: 650_000_00,
      depositKobo: 260_000_00,
    });
    expect(body.quote.items).toHaveLength(2);
  });

  it('accepts exactly once and moves the quote to accepted', async () => {
    const account = await createAccount(app);
    const created = await createQuote(account);
    const quoteId = created.json().quote.id as string;
    const token = (await sendQuote(account, quoteId)).json().shareToken as string;

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ accepted: true, version: 1, totalKobo: 650_000_00 });

    const again = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(again.statusCode).toBe(409);

    const quote = await app.db.quote.findUniqueOrThrow({ where: { id: quoteId } });
    expect(quote.status).toBe('accepted');

    const audits = await app.db.auditLog.count({
      where: { entityType: 'quote', entityId: quoteId, action: 'quote.accepted' },
    });
    expect(audits).toBe(1);
  });

  it('declines once and refuses a later acceptance', async () => {
    const account = await createAccount(app);
    const created = await createQuote(account);
    const quoteId = created.json().quote.id as string;
    const token = (await sendQuote(account, quoteId)).json().shareToken as string;

    const declined = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${token}/decline`,
      headers: { origin: TEST_ORIGIN },
      payload: { reason: 'Budget changed' },
    });
    expect(declined.statusCode).toBe(200);

    const accept = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(accept.statusCode).toBe(409);
  });

  it('treats an expired send as expired and refuses acceptance', async () => {
    const account = await createAccount(app);
    const created = await createQuote(account);
    const quoteId = created.json().quote.id as string;
    const token = (await sendQuote(account, quoteId)).json().shareToken as string;

    await app.db.quoteVersion.updateMany({
      where: { quoteId },
      data: { validUntil: new Date(Date.now() - 60_000) },
    });

    const view = await app.inject({
      method: 'GET',
      url: `/api/public/quotes/${token}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(view.statusCode).toBe(200);
    expect(view.json().quote.status).toBe('expired');
    expect(view.json().quote.canAccept).toBe(false);

    const accept = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(accept.statusCode).toBe(409);
  });

  it('supersedes a sent version when a revised version is sent', async () => {
    const account = await createAccount(app);
    const created = await createQuote(account);
    const quoteId = created.json().quote.id as string;
    const v1Token = (await sendQuote(account, quoteId)).json().shareToken as string;

    const revised = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/versions`,
      headers: auth(account.cookie),
      payload: {
        items: [{ description: 'Full-day coverage', quantity: 1, unitPriceKobo: 500_000_00 }],
        depositPercent: 50,
        validUntil: futureIso(),
      },
    });
    expect(revised.statusCode).toBe(201);
    expect(revised.json().version.version).toBe(2);

    const v2Sent = await sendQuote(account, quoteId);
    expect(v2Sent.statusCode).toBe(200);
    const v2Token = v2Sent.json().shareToken as string;

    const v1 = await app.db.quoteVersion.findUniqueOrThrow({
      where: { quoteId_version: { quoteId, version: 1 } },
    });
    expect(v1.status).toBe('superseded');
    expect(v1.supersededAt).not.toBeNull();

    const oldAccept = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${v1Token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(oldAccept.statusCode).toBe(409);
    expect(oldAccept.json().message).toMatch(/newer version/);

    const newAccept = await app.inject({
      method: 'POST',
      url: `/api/public/quotes/${v2Token}/accept`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(newAccept.statusCode).toBe(200);
    expect(newAccept.json()).toMatchObject({ version: 2, totalKobo: 500_000_00 });
  });

  it('keeps quotes inside their merchant and requires authentication', async () => {
    const owner = await createAccount(app);
    const other = await createAccount(app);
    const created = await createQuote(owner);
    const quoteId = created.json().quote.id as string;

    const crossTenant = await app.inject({
      method: 'GET',
      url: `/api/quotes/${quoteId}`,
      headers: auth(other.cookie),
    });
    expect(crossTenant.statusCode).toBe(404);

    const anonymous = await app.inject({
      method: 'POST',
      url: '/api/quotes',
      headers: { origin: TEST_ORIGIN },
      payload: {
        clientName: 'Ada Obi',
        items: standardItems,
        depositPercent: 40,
        validUntil: futureIso(),
      },
    });
    expect(anonymous.statusCode).toBe(401);

    const bogusToken = await app.inject({
      method: 'GET',
      url: `/api/public/quotes/${randomUUID()}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(bogusToken.statusCode).toBe(404);
  });

  it('lets a front-desk user draft but not send a quote', async () => {
    const owner = await createAccount(app);
    const email = `desk-${randomUUID().slice(0, 8)}@example.com`;

    const invite = await app.inject({
      method: 'POST',
      url: '/api/staff',
      headers: auth(owner.cookie),
      payload: { name: 'Desk Person', email, role: 'front_desk' },
    });
    expect(invite.statusCode).toBe(201);

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/auth/accept-invite',
      headers: { origin: TEST_ORIGIN },
      payload: { email, code: invite.json().devCode, password: 'a fresh desk passphrase' },
    });
    expect(accepted.statusCode).toBe(200);
    const deskCookie = cookieFrom(accepted.headers);

    const draft = await app.inject({
      method: 'POST',
      url: '/api/quotes',
      headers: auth(deskCookie),
      payload: {
        clientName: 'Ada Obi',
        items: standardItems,
        depositPercent: 40,
        validUntil: futureIso(),
      },
    });
    expect(draft.statusCode).toBe(201);

    const send = await app.inject({
      method: 'POST',
      url: `/api/quotes/${draft.json().quote.id}/send`,
      headers: auth(deskCookie),
      payload: {},
    });
    expect(send.statusCode).toBe(403);
  });
});
