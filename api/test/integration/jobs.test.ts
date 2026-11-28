import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { SANDBOX_SECRET_KEY, signWebhookPayload } from '../../src/modules/payments/paystack.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

const DEPOSIT_KOBO = 26_000_000;
const BALANCE_KOBO = 39_000_000;

const questions = [
  { key: 'venue', label: 'Venue', type: 'text', required: true },
  { key: 'guests', label: 'Guest count', type: 'number', required: false },
  {
    key: 'style',
    label: 'Style',
    type: 'choice',
    required: true,
    options: ['Documentary', 'Editorial'],
  },
];

describe.skipIf(!hasDatabase)('jobs, intake, and delivery', () => {
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

  async function createTemplate(account: TestAccount, title = 'Wedding intake') {
    const response = await app.inject({
      method: 'POST',
      url: '/api/intake/templates',
      headers: auth(account.cookie),
      payload: { title, questions },
    });
    expect(response.statusCode).toBe(201);
    return response.json().template.id as string;
  }

  async function acceptedQuote(account: TestAccount, depositPercent = 40) {
    const created = await app.inject({
      method: 'POST',
      url: '/api/quotes',
      headers: auth(account.cookie),
      payload: {
        opportunity: {
          title: 'Wedding shoot',
          clientName: 'Ada Obi',
          clientEmail: 'ada@example.com',
          eventDate: '2027-02-14',
        },
        clientName: 'Ada Obi',
        clientEmail: 'ada@example.com',
        items: [
          { description: 'Full-day coverage', quantity: 1, unitPriceKobo: 45_000_000 },
          { description: 'Second photographer', quantity: 2, unitPriceKobo: 10_000_000 },
        ],
        depositPercent,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    return { quoteId, invoice: accepted.json().invoice };
  }

  async function payAndSettle(invoice: { publicToken: string; amountKobo: number }) {
    const pay = await app.inject({
      method: 'POST',
      url: `/api/public/invoices/${invoice.publicToken}/pay`,
      headers: { origin: TEST_ORIGIN },
      payload: { email: 'ada@example.com' },
    });
    expect(pay.statusCode).toBe(201);

    const payload = {
      event: 'charge.success',
      data: {
        id: randomInt(1, 1_000_000_000),
        reference: pay.json().payment.reference,
        amount: invoice.amountKobo,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
      },
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const delivered = await app.inject({
      method: 'POST',
      url: '/api/webhooks/paystack',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': signWebhookPayload(raw, SANDBOX_SECRET_KEY),
      },
      payload: raw,
    });
    expect(delivered.statusCode).toBe(200);
    return payload;
  }

  async function paidJob(account: TestAccount) {
    await createTemplate(account);
    const { quoteId, invoice } = await acceptedQuote(account);
    await payAndSettle(invoice);
    const job = await app.db.job.findFirstOrThrow({ where: { merchantId: account.merchantId } });
    return { quoteId, invoice, job };
  }

  async function portalToken(account: TestAccount, jobId: string) {
    const link = await app.inject({
      method: 'POST',
      url: `/api/jobs/${jobId}/portal-link`,
      headers: auth(account.cookie),
    });
    expect(link.statusCode).toBe(200);
    return link.json().portalToken as string;
  }

  it('creates one intake-pending job when the deposit clears', async () => {
    const account = await createAccount(app);
    await createTemplate(account);
    const { quoteId, invoice } = await acceptedQuote(account);
    await payAndSettle(invoice);

    const jobs = await app.db.job.findMany();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      status: 'intake_pending',
      title: 'Wedding shoot',
      clientName: 'Ada Obi',
      clientEmail: 'ada@example.com',
    });
    expect(jobs[0]?.eventDate?.toISOString().slice(0, 10)).toBe('2027-02-14');
    expect(jobs[0]?.intakeTemplateId).not.toBeNull();
    expect(jobs[0]?.invoiceId).toBe(invoice.id);
    expect(await app.db.booking.count()).toBe(0);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/jobs/${jobs[0]!.id}`,
      headers: auth(account.cookie),
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().quote).toEqual({ id: quoteId, version: 1 });
    expect(detail.json().intake.template.questions).toHaveLength(3);
  });

  it('does not create a second job when the webhook is delivered again', async () => {
    const account = await createAccount(app);
    await createTemplate(account);
    const { invoice } = await acceptedQuote(account);
    const payload = await payAndSettle(invoice);

    const raw = Buffer.from(JSON.stringify(payload));
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/paystack',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': signWebhookPayload(raw, SANDBOX_SECRET_KEY),
      },
      payload: raw,
    });

    expect(await app.db.job.count()).toBe(1);
  });

  it('serves the portal, stores one validated intake, and starts the job', async () => {
    const account = await createAccount(app);
    const { job } = await paidJob(account);
    const token = await portalToken(account, job.id);

    const stored = await app.db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(stored.portalTokenHash).not.toBe(token);

    const view = await app.inject({
      method: 'GET',
      url: `/api/public/jobs/${token}`,
      headers: { origin: TEST_ORIGIN },
    });
    expect(view.statusCode).toBe(200);
    expect(view.json()).toMatchObject({
      merchant: { name: 'Studio Teni' },
      job: { title: 'Wedding shoot', status: 'intake_pending' },
      intake: { available: true, submitted: false },
    });
    expect(view.json().intake.questions).toHaveLength(3);

    const submitted = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: {
        answers: { venue: 'Lekki Hall', guests: '120', style: 'Documentary' },
      },
    });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json()).toMatchObject({ submitted: true, status: 'in_progress' });

    const submission = await app.db.intakeSubmission.findUniqueOrThrow({
      where: { jobId: job.id },
    });
    expect(submission.answers).toEqual({
      venue: 'Lekki Hall',
      guests: '120',
      style: 'Documentary',
    });

    const again = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: { venue: 'Lekki Hall', style: 'Editorial' } },
    });
    expect(again.statusCode).toBe(409);

    const audits = await app.db.auditLog.count({
      where: { entityType: 'job', entityId: job.id, action: 'job.intake_submitted' },
    });
    expect(audits).toBe(1);
  });

  it('rejects incomplete or unknown intake answers without storing them', async () => {
    const account = await createAccount(app);
    const { job } = await paidJob(account);
    const token = await portalToken(account, job.id);

    const missing = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: { style: 'Documentary' } },
    });
    expect(missing.statusCode).toBe(400);
    expect(JSON.stringify(missing.json().details)).toContain('Venue is required');

    const unknown = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: { venue: 'Hall', style: 'Cinematic', extra: 'x' } },
    });
    expect(unknown.statusCode).toBe(400);
    expect(JSON.stringify(unknown.json().details)).toContain('Unknown answer: extra');

    expect(await app.db.intakeSubmission.count()).toBe(0);
    const stored = await app.db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(stored.status).toBe('intake_pending');
  });

  it('delivers a job once and then freezes it', async () => {
    const account = await createAccount(app);
    const { job } = await paidJob(account);

    const delivered = await app.inject({
      method: 'PATCH',
      url: `/api/jobs/${job.id}`,
      headers: auth(account.cookie),
      payload: { status: 'delivered' },
    });
    expect(delivered.statusCode).toBe(200);
    expect(delivered.json().job.status).toBe('delivered');
    expect(delivered.json().job.deliveredAt).not.toBeNull();

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/api/jobs/${job.id}`,
      headers: auth(account.cookie),
      payload: { status: 'cancelled' },
    });
    expect(cancelled.statusCode).toBe(409);

    const token = await portalToken(account, job.id);
    const intake = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: { venue: 'Hall', style: 'Documentary' } },
    });
    expect(intake.statusCode).toBe(409);
  });

  it('cancels a job, closing the portal to intake and new links', async () => {
    const account = await createAccount(app);
    const { job } = await paidJob(account);
    const token = await portalToken(account, job.id);

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/api/jobs/${job.id}`,
      headers: auth(account.cookie),
      payload: { status: 'cancelled' },
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().job.cancelledAt).not.toBeNull();

    const intake = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: { venue: 'Hall', style: 'Documentary' } },
    });
    expect(intake.statusCode).toBe(409);

    const link = await app.inject({
      method: 'POST',
      url: `/api/jobs/${job.id}/portal-link`,
      headers: auth(account.cookie),
    });
    expect(link.statusCode).toBe(409);
  });

  it('starts a job without intake when the merchant has no template', async () => {
    const account = await createAccount(app);
    const { invoice } = await acceptedQuote(account);
    await payAndSettle(invoice);

    const job = await app.db.job.findFirstOrThrow();
    expect(job.status).toBe('in_progress');
    expect(job.intakeTemplateId).toBeNull();

    const token = await portalToken(account, job.id);
    const intake = await app.inject({
      method: 'POST',
      url: `/api/public/jobs/${token}/intake`,
      headers: { origin: TEST_ORIGIN },
      payload: { answers: {} },
    });
    expect(intake.statusCode).toBe(409);
  });

  it('does not create another job for the balance payment', async () => {
    const account = await createAccount(app);
    await paidJob(account);
    const balance = await app.db.invoice.findFirstOrThrow({ where: { kind: 'balance' } });

    const link = await app.inject({
      method: 'POST',
      url: `/api/invoices/${balance.id}/link`,
      headers: auth(account.cookie),
    });
    const balanceToken = link.json().publicToken as string;
    await payAndSettle({ publicToken: balanceToken, amountKobo: BALANCE_KOBO });

    expect(await app.db.job.count()).toBe(1);
    const paid = await app.db.invoice.findUniqueOrThrow({ where: { id: balance.id } });
    expect(paid.status).toBe('paid');
    expect(DEPOSIT_KOBO + BALANCE_KOBO).toBe(65_000_000);
  });

  it('creates a job from a full payment when there is no deposit', async () => {
    const account = await createAccount(app);
    await createTemplate(account);
    const { invoice } = await acceptedQuote(account, 0);

    expect(invoice.kind).toBe('full');
    await payAndSettle(invoice);

    const job = await app.db.job.findFirstOrThrow();
    expect(job.status).toBe('intake_pending');
    expect(job.invoiceId).toBe(invoice.id);
  });

  it('creates, lists, and updates intake templates with valid questions', async () => {
    const account = await createAccount(app);
    const id = await createTemplate(account);

    const list = await app.inject({
      method: 'GET',
      url: '/api/intake/templates',
      headers: auth(account.cookie),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().templates[0].questions).toHaveLength(3);

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/intake/templates/${id}`,
      headers: auth(account.cookie),
      payload: {
        title: 'Portrait intake',
        questions: [{ key: 'location', label: 'Location', type: 'text', required: true }],
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().template.title).toBe('Portrait intake');
    expect(updated.json().template.questions).toHaveLength(1);

    const duplicateKeys = await app.inject({
      method: 'POST',
      url: '/api/intake/templates',
      headers: auth(account.cookie),
      payload: {
        title: 'Broken',
        questions: [
          { key: 'venue', label: 'Venue', type: 'text', required: true },
          { key: 'venue', label: 'Venue again', type: 'text', required: false },
        ],
      },
    });
    expect(duplicateKeys.statusCode).toBe(400);

    const badChoice = await app.inject({
      method: 'POST',
      url: '/api/intake/templates',
      headers: auth(account.cookie),
      payload: {
        title: 'Broken choice',
        questions: [{ key: 'pick', label: 'Pick', type: 'choice', required: true }],
      },
    });
    expect(badChoice.statusCode).toBe(400);
  });

  it('keeps jobs and templates inside their merchant', async () => {
    const account = await createAccount(app);
    const other = await createAccount(app);
    const { job } = await paidJob(account);
    const templateId = await createTemplate(account, 'Private template');

    const crossTenantJob = await app.inject({
      method: 'GET',
      url: `/api/jobs/${job.id}`,
      headers: auth(other.cookie),
    });
    expect(crossTenantJob.statusCode).toBe(404);

    const crossTenantTemplate = await app.inject({
      method: 'PUT',
      url: `/api/intake/templates/${templateId}`,
      headers: auth(other.cookie),
      payload: { title: 'Hijacked', questions: [] },
    });
    expect(crossTenantTemplate.statusCode).toBe(404);

    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/jobs',
      headers: { origin: TEST_ORIGIN },
    });
    expect(anonymous.statusCode).toBe(401);

    const unknownPortal = await app.inject({
      method: 'GET',
      url: '/api/public/jobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      headers: { origin: TEST_ORIGIN },
    });
    expect(unknownPortal.statusCode).toBe(404);
  });
});
