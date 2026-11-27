import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from '../../platform/errors.js';
import {
  createAuthGuards,
  setSessionCookie,
  clearSessionCookie,
  sessionCookieName,
} from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import { isValidSlug, slugify } from '../../shared/slug.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  assertPasswordPolicy,
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from './password.js';
import { deriveOtpPepper } from './tokens.js';
import { consumeOtp, issueOtp } from './otp.js';
import { createSession, revokeAllSessions, revokeSession, rotateSession } from './session.js';

/**
 * Identity routes. Mounted at /api/auth.
 *
 * The opaque session cookie is the primary credential for the same-origin
 * dashboard; the access token in the body is for tooling and future mobile
 * clients. Every error message is deliberately generic so it cannot be used to
 * enumerate accounts.
 */

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
const codeSchema = z.string().regex(/^\d{6}$/, 'Code must be six digits');

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    businessName: z.string().trim().min(2).max(120),
    slug: z.string().trim().optional(),
    phone: z.string().trim().max(32).optional(),
    trade: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{1,31}$/, 'Trade must be lowercase')
      .optional(),
  })
  .strict();

const verifyOtpSchema = z.object({ email: emailSchema, code: codeSchema }).strict();
const resendOtpSchema = z.object({ email: emailSchema }).strict();
const loginSchema = z
  .object({ email: emailSchema, password: z.string().max(PASSWORD_MAX_LENGTH) })
  .strict();
const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200).optional() }).strict();
const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
const resetPasswordSchema = z
  .object({ email: emailSchema, code: codeSchema, password: passwordSchema })
  .strict();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;

interface PublicUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: string;
  readonly merchantId: string | null;
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  merchantId: string | null;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    merchantId: user.merchantId,
  };
}

function requestMeta(request: FastifyRequest): {
  ip: string | undefined;
  userAgent: string | undefined;
} {
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export const identityRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const pepper = deriveOtpPepper(config.jwtSecret);
  const cookieName = sessionCookieName(config);

  function signAccessToken(
    user: {
      id: string;
      role: string;
      merchantId: string | null;
    },
    sessionId: string,
  ): string {
    return app.jwt.sign(
      { sub: user.id, sid: sessionId, role: user.role, merchantId: user.merchantId },
      { expiresIn: '15m' },
    );
  }

  function devCode(code: string): Record<string, string> {
    // Production never exposes the code; email delivery lands with Resend.
    return config.isProduction ? {} : { devCode: code };
  }

  async function startSession(
    reply: FastifyReply,
    user: { id: string; role: string; merchantId: string | null },
    meta: { ip: string | undefined; userAgent: string | undefined },
  ) {
    const session = await createSession(app.db, user.id, meta);
    setSessionCookie(reply, config, session.token, session.expiresAt);
    return {
      accessToken: signAccessToken(user, session.sessionId),
      expiresIn: '15m',
      session,
    };
  }

  app.post(
    '/register',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      assertPasswordPolicy(body.password, { email: body.email, name: body.name });

      const slug = body.slug ?? slugify(body.businessName);
      if (!isValidSlug(slug)) {
        throw new ValidationError(
          'Business URL must be 3-63 lowercase letters, numbers, or hyphens',
        );
      }

      const owner = await app.db.user.findFirst({
        where: { email: body.email, role: 'owner', deletedAt: null },
        select: { id: true },
      });
      if (owner) {
        throw new ConflictError('An account with this email already exists');
      }

      const passwordHash = await hashPassword(body.password);
      const meta = requestMeta(request);

      let created;
      try {
        created = await app.db.$transaction(async (tx) => {
          const merchant = await tx.merchant.create({
            data: {
              name: body.businessName,
              slug,
              trade: body.trade ?? 'other',
              contactEmail: body.email,
              phone: body.phone ?? null,
            },
          });

          const user = await tx.user.create({
            data: {
              merchantId: merchant.id,
              email: body.email,
              name: body.name,
              phone: body.phone ?? null,
              role: 'owner',
              status: 'invited',
              passwordHash,
            },
          });

          await writeAudit(tx, {
            merchantId: merchant.id,
            actorId: user.id,
            actorRole: 'owner',
            action: 'merchant.registered',
            entityType: 'merchant',
            entityId: merchant.id,
            after: { slug, trade: merchant.trade },
            ip: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
            requestId: request.id,
          });

          const otp = await issueOtp(tx, pepper, {
            email: body.email,
            purpose: 'verify_email',
            userId: user.id,
            ip: meta.ip ?? null,
          });

          return { merchant, user, otp };
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError('That business URL or email is already registered');
        }
        throw error;
      }

      request.log.info(
        { userId: created.user.id, merchantId: created.merchant.id },
        'merchant registered',
      );

      return reply.status(201).send({
        message: 'Account created. Enter the six-digit code sent to your email.',
        email: created.user.email,
        requiresOtp: true,
        ...devCode(created.otp.code),
      });
    },
  );

  app.post(
    '/verify-otp',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = verifyOtpSchema.parse(request.body);
      const otp = await consumeOtp(app.db, pepper, {
        email: body.email,
        purpose: 'verify_email',
        code: body.code,
      });

      const user = otp.userId ? await app.db.user.findUnique({ where: { id: otp.userId } }) : null;
      if (!user || user.email !== body.email || user.deletedAt) {
        throw new UnauthorizedError('That code is invalid or has expired');
      }

      const activated = await app.db.user.update({
        where: { id: user.id },
        data: { status: 'active', emailVerifiedAt: new Date() },
      });

      const meta = requestMeta(request);
      const session = await startSession(reply, activated, meta);

      return reply.send({
        message: 'Email verified.',
        user: publicUser(activated),
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
      });
    },
  );

  app.post(
    '/resend-otp',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = resendOtpSchema.parse(request.body);

      const user = await app.db.user.findFirst({
        where: { email: body.email, status: 'invited', deletedAt: null },
        select: { id: true },
      });

      if (user) {
        const otp = await issueOtp(app.db, pepper, {
          email: body.email,
          purpose: 'verify_email',
          userId: user.id,
          ip: request.ip,
        });
        const payload = {
          message: 'If the account needs verification, a new code has been sent.',
          ...devCode(otp.code),
        };
        return reply.status(202).send(payload);
      }

      return reply
        .status(202)
        .send({ message: 'If the account needs verification, a new code has been sent.' });
    },
  );

  app.post(
    '/login',
    { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const since = new Date(Date.now() - LOGIN_WINDOW_MS);

      const failures = await app.db.loginAttempt.count({
        where: { email: body.email, succeeded: false, createdAt: { gt: since } },
      });
      if (failures >= MAX_FAILED_LOGINS) {
        throw new RateLimitedError('Too many failed attempts. Try again in 15 minutes.');
      }

      const user = await app.db.user.findFirst({
        where: { email: body.email, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      // Always perform a real argon2 verification so unknown emails and wrong
      // passwords take comparable time.
      const storedHash = user?.passwordHash ?? (await getDummyPasswordHash());
      const valid = await verifyPassword(storedHash, body.password);
      const success = Boolean(user && valid && user.passwordHash && user.status === 'active');

      await app.db.loginAttempt.create({
        data: { email: body.email, ip: request.ip, succeeded: success },
      });

      if (!user || !valid || user.status !== 'active') {
        throw new UnauthorizedError('Invalid email or password');
      }

      await app.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      const meta = requestMeta(request);
      const session = await startSession(reply, user, meta);

      return reply.send({
        message: 'Signed in.',
        user: publicUser(user),
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
      });
    },
  );

  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body ?? {});
    const cookies = request.cookies as Record<string, string | undefined>;
    const presented = cookies[cookieName] ?? body.refreshToken;

    if (!presented) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    const meta = requestMeta(request);
    const rotated = await rotateSession(app.db, presented, meta);
    const user = await app.db.user.findUnique({ where: { id: rotated.userId } });

    if (!user || user.deletedAt || user.status !== 'active') {
      throw new UnauthorizedError('Session is no longer valid');
    }

    setSessionCookie(reply, config, rotated.token, rotated.expiresAt);

    return reply.send({
      message: 'Session refreshed.',
      user: publicUser(user),
      accessToken: signAccessToken(user, rotated.sessionId),
      expiresIn: '15m',
    });
  });

  app.post('/logout', { preHandler: guards.authenticate }, async (request, reply) => {
    if (request.auth) {
      await revokeSession(app.db, request.auth.sessionId);
    }
    clearSessionCookie(reply, config);
    return reply.status(204).send();
  });

  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = forgotPasswordSchema.parse(request.body);
      const generic = {
        message: 'If an account exists for that email, a reset code has been sent.',
      };

      const user = await app.db.user.findFirst({
        where: { email: body.email, deletedAt: null, status: 'active' },
        select: { id: true },
      });

      if (!user) {
        return reply.status(202).send(generic);
      }

      const otp = await issueOtp(app.db, pepper, {
        email: body.email,
        purpose: 'reset_password',
        userId: user.id,
        ip: request.ip,
      });

      return reply.status(202).send({ ...generic, ...devCode(otp.code) });
    },
  );

  app.post(
    '/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = resetPasswordSchema.parse(request.body);

      const user = await app.db.user.findFirst({
        where: { email: body.email, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!user) {
        throw new UnauthorizedError('That code is invalid or has expired');
      }

      assertPasswordPolicy(body.password, { email: body.email, name: user.name });

      await consumeOtp(app.db, pepper, {
        email: body.email,
        purpose: 'reset_password',
        code: body.code,
      });

      const passwordHash = await hashPassword(body.password);
      await app.db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await revokeAllSessions(tx, user.id, 'password_reset');
      });

      return reply.send({ message: 'Password updated. Sign in with your new password.' });
    },
  );

  app.get('/me', { preHandler: guards.requireMerchant }, async (request) => {
    const userId = request.auth?.userId;
    const user = userId
      ? await app.db.user.findUnique({
          where: { id: userId },
          include: { merchant: true },
        })
      : null;

    if (!user || !user.merchant) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    return {
      user: publicUser(user),
      merchant: {
        id: user.merchant.id,
        name: user.merchant.name,
        slug: user.merchant.slug,
        trade: user.merchant.trade,
        timezone: user.merchant.timezone,
        currency: user.merchant.currency,
        status: user.merchant.status,
      },
    };
  });
};
