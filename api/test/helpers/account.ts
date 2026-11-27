import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { cookieFrom } from './db.js';

export const TEST_ORIGIN = 'http://localhost:3030';
export const TEST_PASSWORD = 'correct horse battery staple';

export interface TestAccount {
  readonly email: string;
  readonly password: string;
  readonly slug: string;
  readonly cookie: string;
  readonly userId: string;
  readonly merchantId: string;
  readonly accessToken: string;
}

export async function createAccount(
  app: FastifyInstance,
  overrides: Record<string, unknown> = {},
): Promise<TestAccount> {
  const email = `owner-${randomUUID().slice(0, 8)}@example.com`;
  const slug = `studio-${randomUUID().slice(0, 8)}`;

  const registered = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: { origin: TEST_ORIGIN },
    payload: {
      name: 'Teniola Adebayo',
      email,
      password: TEST_PASSWORD,
      businessName: 'Studio Teni',
      slug,
      ...overrides,
    },
  });

  if (registered.statusCode !== 201) {
    throw new Error(`register failed: ${registered.statusCode} ${registered.body}`);
  }

  const code = registered.json().devCode as string;
  const verified = await app.inject({
    method: 'POST',
    url: '/api/auth/verify-otp',
    headers: { origin: TEST_ORIGIN },
    payload: { email, code },
  });

  if (verified.statusCode !== 200) {
    throw new Error(`verify-otp failed: ${verified.statusCode} ${verified.body}`);
  }

  const body = verified.json();
  return {
    email,
    password: TEST_PASSWORD,
    slug,
    cookie: cookieFrom(verified.headers),
    userId: body.user.id,
    merchantId: body.user.merchantId,
    accessToken: body.accessToken,
  };
}
