import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { UserRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from './errors.js';
import type { AppConfig } from './config.js';
import { hashToken } from '../modules/identity/tokens.js';

/**
 * Authentication and authorization guards.
 *
 * Two credentials are accepted:
 *  - the httpOnly session cookie holding an opaque, hashed-at-rest token
 *    (what the shipped dashboard uses), and
 *  - `Authorization: Bearer <jwt>` for tooling and tests.
 *
 * The cookie is the refresh credential: `/auth/refresh` rotates it, and reuse
 * of a rotated token revokes the whole family (see identity/session.ts).
 */

export const ACCESS_TOKEN_TTL = '15m';
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE = {
  production: '__Host-vela_session',
  development: 'vela_session',
} as const;

export interface AuthPrincipal {
  readonly userId: string;
  readonly merchantId: string | null;
  readonly role: UserRole;
  readonly sessionId: string;
}

export function sessionCookieName(config: AppConfig): string {
  return config.isProduction ? SESSION_COOKIE.production : SESSION_COOKIE.development;
}

export function setSessionCookie(
  reply: FastifyReply,
  config: AppConfig,
  token: string,
  expiresAt: Date,
): void {
  reply.setCookie(sessionCookieName(config), token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, config: AppConfig): void {
  reply.clearCookie(sessionCookieName(config), { path: '/' });
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface AuthenticatedSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly merchantId: string | null;
  readonly viaCookie: boolean;
}

async function fromBearer(
  app: FastifyInstance,
  request: FastifyRequest,
): Promise<AuthenticatedSession> {
  const payload = await request.jwtVerify<{
    sub?: string;
    sid?: string;
    role?: UserRole;
    merchantId?: string | null;
  }>();

  if (!payload.sub || !payload.sid) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  const session = await app.db.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new UnauthorizedError('Session is no longer valid');
  }
  if (session.user.deletedAt || session.user.status !== 'active') {
    throw new UnauthorizedError('Session is no longer valid');
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.user.role,
    merchantId: session.user.merchantId,
    viaCookie: false,
  };
}

async function fromCookie(
  app: FastifyInstance,
  request: FastifyRequest,
  config: AppConfig,
  token: string,
): Promise<AuthenticatedSession> {
  const session = await app.db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  // A revoked token is a replay of a rotated credential: burn the family.
  if (session.revokedAt) {
    await app.db.session.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
    });
    throw new UnauthorizedError('Session is no longer valid');
  }

  if (session.expiresAt <= new Date()) {
    throw new UnauthorizedError('Session is no longer valid');
  }
  if (session.user.deletedAt || session.user.status !== 'active') {
    throw new UnauthorizedError('Session is no longer valid');
  }

  // Same-site cookie authentication: a browser request that carries an Origin
  // must come from an allowed origin, otherwise a cross-site form could ride
  // the cookie. Non-browser clients usually omit Origin.
  if (!SAFE_METHODS.has(request.method) && request.headers.origin) {
    const origin = request.headers.origin;
    const allowed =
      config.corsOrigins.includes(origin) ||
      origin === (request.headers.host ? `${request.protocol}://${request.headers.host}` : '');
    if (!allowed) {
      throw new ForbiddenError('Request origin is not allowed');
    }
  }

  const stale = !session.lastUsedAt || Date.now() - session.lastUsedAt.getTime() > 5 * 60_000;
  if (stale) {
    await app.db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.user.role,
    merchantId: session.user.merchantId,
    viaCookie: true,
  };
}

export interface AuthGuards {
  readonly authenticate: preHandlerHookHandler;
  requireRole(...roles: readonly UserRole[]): preHandlerHookHandler;
  readonly requireMerchant: preHandlerHookHandler;
}

export function createAuthGuards(app: FastifyInstance, config: AppConfig): AuthGuards {
  const cookieName = sessionCookieName(config);

  async function resolvePrincipal(request: FastifyRequest): Promise<AuthPrincipal> {
    const header = request.headers.authorization;
    const principal = header?.startsWith('Bearer ')
      ? await fromBearer(app, request)
      : await (async () => {
          const token = (request.cookies as Record<string, string | undefined>)[cookieName];
          if (!token) throw new UnauthorizedError();
          return fromCookie(app, request, config, token);
        })();

    return {
      userId: principal.userId,
      merchantId: principal.merchantId,
      role: principal.role,
      sessionId: principal.sessionId,
    };
  }

  async function ensurePrincipal(request: FastifyRequest): Promise<AuthPrincipal> {
    request.auth ??= await resolvePrincipal(request);
    return request.auth;
  }

  return {
    authenticate: async (request) => {
      await ensurePrincipal(request);
    },
    requireRole:
      (...roles: readonly UserRole[]): preHandlerHookHandler =>
      async (request) => {
        const auth = await ensurePrincipal(request);
        if (!roles.includes(auth.role)) {
          throw new ForbiddenError('You do not have permission to perform this action');
        }
      },
    requireMerchant: async (request) => {
      const auth = await ensurePrincipal(request);
      if (!auth.merchantId) {
        throw new ForbiddenError('A merchant account is required for this action');
      }
    },
  };
}
