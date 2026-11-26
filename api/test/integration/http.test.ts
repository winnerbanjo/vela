import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { testConfig } from '../helpers/config.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('http guardrails', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig());
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness without needing the database', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('returns an opaque problem document with a matching request id', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({ code: 'NOT_FOUND', message: 'Route not found' });
    expect(response.headers['x-request-id']).toBe(body.requestId);
    expect(UUID_PATTERN.test(String(response.headers['x-request-id']))).toBe(true);
  });

  it('sets the documented security headers', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    // HSTS is production-only so local http development still works.
    expect(response.headers['strict-transport-security']).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows only configured origins', async () => {
    const allowed = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'http://localhost:3002' },
    });
    const denied = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'http://evil.test' },
    });

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    expect(String(allowed.headers['vary'])).toContain('Origin');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight only for allowed origins', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health/live',
      headers: {
        origin: 'http://localhost:3002',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects bodies above the configured limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/health/live',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ data: 'x'.repeat(1_100_000) }),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });
});

describe('rate limiting', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig({ RATE_LIMIT_MAX: '2' }));
    app.get('/test/limited', { config: { rateLimit: false } }, async () => ({ ok: true }));
    app.get('/test/rate-limited', async () => ({ ok: true }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 with Retry-After and the problem shape', async () => {
    expect((await app.inject({ method: 'GET', url: '/test/rate-limited' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/test/rate-limited' })).statusCode).toBe(200);

    const limited = await app.inject({ method: 'GET', url: '/test/rate-limited' });

    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(limited.json()).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('exempts routes that opt out', async () => {
    await app.inject({ method: 'GET', url: '/test/limited' });
    await app.inject({ method: 'GET', url: '/test/limited' });
    await app.inject({ method: 'GET', url: '/test/limited' });

    // Different key (path counter is per route + IP); this must still succeed.
    const response = await app.inject({ method: 'GET', url: '/test/limited' });
    expect(response.statusCode).toBe(200);
  });
});
