import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { cookieFrom, resetDatabase } from '../helpers/db.js';
import { createAccount, TEST_ORIGIN } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';

describe.skipIf(!hasDatabase)('merchant, catalogue, and staff', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig({ CORS_ORIGINS: TEST_ORIGIN }));
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

  it('returns the merchant profile for the authenticated owner', async () => {
    const account = await createAccount(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/merchant',
      headers: auth(account.cookie),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().merchant).toMatchObject({
      slug: account.slug,
      name: 'Studio Teni',
      currency: 'NGN',
      hasUnpublishedChanges: true,
      inboxMode: 'draft',
    });
    expect(response.json().counts.services).toBe(0);
  });

  it('updates the profile, flags unpublished changes, and audits the write', async () => {
    const account = await createAccount(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/merchant',
      headers: auth(account.cookie),
      payload: { bio: 'Precision cuts in Victoria Island.', location: '14 Bishop Oluwole St' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().merchant.hasUnpublishedChanges).toBe(true);

    const merchant = await app.db.merchant.findUnique({ where: { id: account.merchantId } });
    expect(merchant?.bio).toBe('Precision cuts in Victoria Island.');

    const audit = await app.db.auditLog.findFirst({
      where: { action: 'merchant.profile_updated' },
    });
    expect(audit?.actorId).toBe(account.userId);
  });

  it('rejects an invalid timezone and a slug taken by another merchant', async () => {
    const first = await createAccount(app);
    const second = await createAccount(app);

    const badTimezone = await app.inject({
      method: 'PATCH',
      url: '/api/merchant',
      headers: auth(second.cookie),
      payload: { timezone: 'Mars/Olympus' },
    });
    expect(badTimezone.statusCode).toBe(400);

    const takenSlug = await app.inject({
      method: 'PATCH',
      url: '/api/merchant',
      headers: auth(second.cookie),
      payload: { slug: first.slug },
    });
    expect(takenSlug.statusCode).toBe(409);
    expect(takenSlug.json().code).toBe('CONFLICT');
  });

  it('publishes the profile and clears the unpublished flag', async () => {
    const account = await createAccount(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/merchant/publish',
      headers: auth(account.cookie),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().publishedAt).toEqual(expect.any(String));

    const merchant = await app.db.merchant.findUnique({ where: { id: account.merchantId } });
    expect(merchant?.hasUnpublishedChanges).toBe(false);
    expect(merchant?.publishedAt).toBeInstanceOf(Date);
  });

  it('stores custom domains lowercase and refuses duplicates', async () => {
    const first = await createAccount(app);
    const second = await createAccount(app);

    const set = await app.inject({
      method: 'POST',
      url: '/api/merchant/domain',
      headers: auth(first.cookie),
      payload: { domain: 'Studio.Example.COM' },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().customDomain).toBe('studio.example.com');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/merchant/domain',
      headers: auth(second.cookie),
      payload: { domain: 'studio.example.com' },
    });
    expect(duplicate.statusCode).toBe(409);

    const verify = await app.inject({
      method: 'POST',
      url: '/api/merchant/domain/verify',
      headers: auth(first.cookie),
    });
    expect(verify.statusCode).toBe(501);
  });

  it('creates services in kobo and never leaks BigInt into JSON', async () => {
    const account = await createAccount(app);

    const created = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(account.cookie),
      payload: {
        name: 'Signature Haircut',
        durationMinutes: 45,
        bufferMinutes: 10,
        priceKobo: 1_000_000,
        depositKobo: 200_000,
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().service).toMatchObject({
      name: 'Signature Haircut',
      durationMinutes: 45,
      bufferMinutes: 10,
      priceKobo: 1_000_000,
      depositKobo: 200_000,
      status: 'active',
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/services',
      headers: auth(account.cookie),
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().services).toHaveLength(1);
  });

  it('rejects a deposit above the price and hides another merchant service', async () => {
    const owner = await createAccount(app);
    const other = await createAccount(app);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(owner.cookie),
      payload: {
        name: 'Impossible',
        durationMinutes: 30,
        priceKobo: 100_000,
        depositKobo: 200_000,
      },
    });
    expect(invalid.statusCode).toBe(400);

    const created = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(owner.cookie),
      payload: { name: 'Fade', durationMinutes: 30, priceKobo: 800_000, depositKobo: 200_000 },
    });
    const serviceId = created.json().service.id as string;

    const crossTenant = await app.inject({
      method: 'PATCH',
      url: `/api/services/${serviceId}`,
      headers: auth(other.cookie),
      payload: { name: 'Hijacked' },
    });
    expect(crossTenant.statusCode).toBe(404);
  });

  it('archives, restores, and soft-deletes services', async () => {
    const account = await createAccount(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(account.cookie),
      payload: { name: 'Beard Trim', durationMinutes: 20, priceKobo: 500_000, depositKobo: 0 },
    });
    const id = created.json().service.id as string;

    const archived = await app.inject({
      method: 'POST',
      url: `/api/services/${id}/archive`,
      headers: auth(account.cookie),
    });
    expect(archived.json().service.status).toBe('archived');

    const visible = await app.inject({
      method: 'GET',
      url: '/api/services',
      headers: auth(account.cookie),
    });
    expect(visible.json().services).toHaveLength(0);

    const withArchived = await app.inject({
      method: 'GET',
      url: '/api/services?includeArchived=true',
      headers: auth(account.cookie),
    });
    expect(withArchived.json().services).toHaveLength(1);

    const restored = await app.inject({
      method: 'POST',
      url: `/api/services/${id}/restore`,
      headers: auth(account.cookie),
    });
    expect(restored.json().service.status).toBe('active');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/services/${id}`,
      headers: auth(account.cookie),
    });
    expect(removed.statusCode).toBe(200);

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/api/services?includeArchived=true',
      headers: auth(account.cookie),
    });
    expect(afterDelete.json().services).toHaveLength(0);
  });

  it('keeps one portfolio cover and rejects insecure image URLs', async () => {
    const account = await createAccount(app);

    const insecure = await app.inject({
      method: 'POST',
      url: '/api/portfolio',
      headers: auth(account.cookie),
      payload: { title: 'Plain http', imageUrl: 'http://example.com/a.jpg' },
    });
    expect(insecure.statusCode).toBe(400);

    const first = await app.inject({
      method: 'POST',
      url: '/api/portfolio',
      headers: auth(account.cookie),
      payload: { title: 'Cover one', imageUrl: 'https://cdn.example.com/a.jpg', isCover: true },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/portfolio',
      headers: auth(account.cookie),
      payload: { title: 'Cover two', imageUrl: 'https://cdn.example.com/b.jpg', isCover: true },
    });
    expect(second.statusCode).toBe(201);

    const covers = await app.db.portfolioItem.count({
      where: { merchantId: account.merchantId, isCover: true },
    });
    expect(covers).toBe(1);
  });

  it('invites staff, activates them through the invite code, and enforces roles', async () => {
    const owner = await createAccount(app);
    const staffEmail = `staff-${randomUUID().slice(0, 8)}@example.com`;

    const invite = await app.inject({
      method: 'POST',
      url: '/api/staff',
      headers: auth(owner.cookie),
      payload: { name: 'Dele Chair', email: staffEmail, role: 'front_desk' },
    });

    expect(invite.statusCode).toBe(201);
    expect(invite.json().user.status).toBe('invited');
    const code = invite.json().devCode as string;

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/auth/accept-invite',
      headers: { origin: TEST_ORIGIN },
      payload: { email: staffEmail, code, password: 'a fresh staff passphrase' },
    });

    expect(accepted.statusCode).toBe(200);
    const staffCookie = cookieFrom(accepted.headers);

    const canRead = await app.inject({
      method: 'GET',
      url: '/api/services',
      headers: auth(staffCookie),
    });
    expect(canRead.statusCode).toBe(200);

    const cannotWrite = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(staffCookie),
      payload: { name: 'Nope', durationMinutes: 30, priceKobo: 100_000, depositKobo: 0 },
    });
    expect(cannotWrite.statusCode).toBe(403);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/staff',
      headers: auth(owner.cookie),
    });
    expect(listed.json().staff).toHaveLength(2);
  });

  it('prevents the owner from being removed and removes staff sessions', async () => {
    const owner = await createAccount(app);
    const staffEmail = `staff-${randomUUID().slice(0, 8)}@example.com`;

    const invite = await app.inject({
      method: 'POST',
      url: '/api/staff',
      headers: auth(owner.cookie),
      payload: { name: 'Dele Chair', email: staffEmail, role: 'staff' },
    });
    const code = invite.json().devCode as string;
    const staffId = invite.json().user.id as string;
    const accepted = await app.inject({
      method: 'POST',
      url: '/api/auth/accept-invite',
      payload: { email: staffEmail, code, password: 'a fresh staff passphrase' },
    });
    const staffCookie = cookieFrom(accepted.headers);

    const removeOwner = await app.inject({
      method: 'DELETE',
      url: `/api/staff/${owner.userId}`,
      headers: auth(owner.cookie),
    });
    expect(removeOwner.statusCode).toBe(400);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/staff/${staffId}`,
      headers: auth(owner.cookie),
    });
    expect(removed.statusCode).toBe(200);

    const afterRemoval = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: staffCookie },
    });
    expect(afterRemoval.statusCode).toBe(401);
  });
});
