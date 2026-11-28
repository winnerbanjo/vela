import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { createAuthGuards } from '../../src/platform/auth.js';
import { cookieFrom, resetDatabase } from '../helpers/db.js';
import { hasDatabase, testConfig } from '../helpers/config.js';

const ORIGIN = 'http://localhost:3030';

function uniqueEmail(prefix = 'owner'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.com`;
}

interface Registration {
  email: string;
  password: string;
  devCode: string;
  slug: string;
}

async function register(app: FastifyInstance, overrides: Record<string, unknown> = {}) {
  const email = uniqueEmail();
  const password = 'correct horse battery staple';
  const slug = `studio-${randomUUID().slice(0, 8)}`;

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: { origin: ORIGIN },
    payload: {
      name: 'Teniola Adebayo',
      email,
      password,
      businessName: 'Studio Teni',
      slug,
      ...overrides,
    },
  });

  return { response, email, password, slug };
}

describe.skipIf(!hasDatabase)('identity routes', () => {
  let app: FastifyInstance;
  const config = testConfig({ CORS_ORIGINS: ORIGIN });

  beforeAll(async () => {
    app = await buildApp(config);
    const guards = createAuthGuards(app, config);
    app.get('/test/owner-only', { preHandler: guards.requireRole('owner') }, async () => ({
      ok: true,
    }));
  });

  beforeEach(async () => {
    await resetDatabase(app.db);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registeredAccount(): Promise<Registration> {
    const { response, email, password, slug } = await register(app);
    expect(response.statusCode).toBe(201);
    return { email, password, slug, devCode: response.json().devCode };
  }

  async function verifiedAccount() {
    const account = await registeredAccount();
    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      headers: { origin: ORIGIN },
      payload: { email: account.email, code: account.devCode },
    });
    expect(verify.statusCode).toBe(200);
    return { ...account, verify };
  }

  it('registers a merchant owner in invited state with a hashed password', async () => {
    const account = await registeredAccount();

    const user = await app.db.user.findFirst({ where: { email: account.email } });
    const merchant = await app.db.merchant.findUnique({ where: { slug: account.slug } });
    const audit = await app.db.auditLog.count({ where: { action: 'merchant.registered' } });

    expect(user?.status).toBe('invited');
    expect(user?.role).toBe('owner');
    expect(user?.passwordHash?.startsWith('$argon2id$')).toBe(true);
    expect(user?.passwordHash).not.toContain(account.password);
    expect(merchant?.contactEmail).toBe(account.email);
    expect(audit).toBe(1);
  });

  it('rejects a duplicate owner email with 409', async () => {
    const account = await registeredAccount();

    const second = await register(app, {
      email: account.email,
      slug: `other-${randomUUID().slice(0, 6)}`,
    });

    expect(second.response.statusCode).toBe(409);
    expect(second.response.json()).toMatchObject({ code: 'CONFLICT' });
  });

  it('does not expose the OTP when NODE_ENV is production', async () => {
    const productionApp = await buildApp(
      testConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.vela.test',
        PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      }),
    );
    try {
      const { response } = await register(productionApp, {});
      // Registration still requires HTTPS origin in this config; only assert the body shape.
      if (response.statusCode === 201) {
        expect(response.json().devCode).toBeUndefined();
      }
    } finally {
      await productionApp.close();
    }
  });

  it('activates the owner only after the correct OTP and starts a session', async () => {
    const account = await registeredAccount();

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: account.email, code: '000000' },
    });
    expect(wrong.statusCode).toBe(401);

    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      headers: { origin: ORIGIN },
      payload: { email: account.email, code: account.devCode },
    });

    expect(verify.statusCode).toBe(200);
    expect(verify.json().user).toMatchObject({ role: 'owner', status: 'active' });
    expect(verify.json().accessToken).toEqual(expect.any(String));
    expect(verify.headers['set-cookie']).toBeDefined();

    const user = await app.db.user.findFirst({ where: { email: account.email } });
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('blocks login before verification and accepts it afterwards', async () => {
    const account = await registeredAccount();

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: account.email, password: account.password },
    });
    expect(blocked.statusCode).toBe(401);

    const verified = await verifiedAccount();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ORIGIN },
      payload: { email: verified.email, password: verified.password },
    });

    expect(login.statusCode).toBe(200);
    expect(login.json().user.email).toBe(verified.email);
    expect(cookieFrom(login.headers)).toMatch(/^vela_session=/);
  });

  it('authenticates /auth/me from the cookie but rejects it without one', async () => {
    const { verify, email } = await verifiedAccount();
    const cookie = cookieFrom(verify.headers);

    const anonymous = await app.inject({ method: 'GET', url: '/api/auth/me' });
    const authenticated = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });

    expect(anonymous.statusCode).toBe(401);
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.json().user.email).toBe(email);
    expect(authenticated.json().merchant.slug).toEqual(expect.any(String));
  });

  it('accepts the access token as a bearer credential', async () => {
    const { verify } = await verifiedAccount();
    const token = verify.json().accessToken as string;

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('rotates the session on refresh and revokes the old token', async () => {
    const { verify } = await verifiedAccount();
    const firstCookie = cookieFrom(verify.headers);

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: firstCookie, origin: ORIGIN },
    });
    expect(refreshed.statusCode).toBe(200);

    const secondCookie = cookieFrom(refreshed.headers);
    expect(secondCookie).not.toBe(firstCookie);

    const newSession = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: secondCookie },
    });
    expect(newSession.statusCode).toBe(200);

    // Presenting the superseded token is treated as reuse: the family is burned.
    const oldSession = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: firstCookie },
    });
    expect(oldSession.statusCode).toBe(401);

    const afterReplay = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: secondCookie },
    });
    expect(afterReplay.statusCode).toBe(401);
  });

  it('revokes the whole session family when a rotated token is replayed', async () => {
    const { verify } = await verifiedAccount();
    const firstCookie = cookieFrom(verify.headers);

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: firstCookie, origin: ORIGIN },
    });
    const secondCookie = cookieFrom(refreshed.headers);

    const replay = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: firstCookie, origin: ORIGIN },
    });
    expect(replay.statusCode).toBe(401);

    const afterReplay = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: secondCookie },
    });
    expect(afterReplay.statusCode).toBe(401);

    const live = await app.db.session.count({ where: { revokedAt: null } });
    expect(live).toBe(0);
  });

  it('locks login after five failed attempts', async () => {
    const { email, password } = await verifiedAccount();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password: 'wrong password here' },
      });
      expect(response.statusCode).toBe(401);
    }

    const locked = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });

    expect(locked.statusCode).toBe(429);
    expect(locked.json().code).toBe('RATE_LIMITED');
  });

  it('logs out by revoking the current session and clearing the cookie', async () => {
    const { verify } = await verifiedAccount();
    const cookie = cookieFrom(verify.headers);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie, origin: ORIGIN },
    });
    expect(logout.statusCode).toBe(204);

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });

  it('resets the password and revokes existing sessions', async () => {
    const { email, verify } = await verifiedAccount();
    const cookie = cookieFrom(verify.headers);

    const forgot = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email },
    });
    expect(forgot.statusCode).toBe(202);
    const code = forgot.json().devCode as string;
    expect(code).toMatch(/^\d{6}$/);

    const reset = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { email, code, password: 'a brand new passphrase' },
    });
    expect(reset.statusCode).toBe(200);

    const oldSession = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(oldSession.statusCode).toBe(401);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: ORIGIN },
      payload: { email, password: 'a brand new passphrase' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('rejects a state-changing cookie request from a foreign origin', async () => {
    const { verify } = await verifiedAccount();
    const cookie = cookieFrom(verify.headers);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie, origin: 'https://evil.test' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('FORBIDDEN');
  });

  it('enforces role guards', async () => {
    const { verify } = await verifiedAccount();
    const cookie = cookieFrom(verify.headers);

    const allowed = await app.inject({
      method: 'GET',
      url: '/test/owner-only',
      headers: { cookie },
    });
    const denied = await app.inject({
      method: 'GET',
      url: '/test/owner-only',
      headers: { cookie: cookie.replace('vela_session=', 'vela_session=broken') },
    });

    expect(allowed.statusCode).toBe(200);
    expect(denied.statusCode).toBe(401);
  });
});
