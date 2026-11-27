import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { UnauthorizedError } from '../../platform/errors.js';
import { SESSION_TTL_DAYS } from '../../platform/auth.js';
import { generateOpaqueToken, hashToken } from './tokens.js';

/**
 * Opaque session tokens with rotation families.
 *
 * Every login starts a family. Each refresh revokes the presented token and
 * issues a new one in the same family. Presenting an already-revoked token is
 * treated as theft and revokes every live token in the family.
 */

export interface SessionMeta {
  readonly ip?: string | undefined;
  readonly userAgent?: string | undefined;
}

export interface IssuedSession {
  readonly token: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
  readonly familyId: string;
}

function expiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function metaFields(meta: SessionMeta) {
  return {
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 255) ?? null,
  };
}

type Db = PrismaClient | Prisma.TransactionClient;

export async function createSession(
  db: Db,
  userId: string,
  meta: SessionMeta = {},
  familyId: string = randomUUID(),
): Promise<IssuedSession> {
  const token = generateOpaqueToken();
  const expiry = expiresAt();

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      familyId,
      expiresAt: expiry,
      ...metaFields(meta),
    },
  });

  return { token, sessionId: session.id, expiresAt: expiry, familyId };
}

export interface RotatedSession extends IssuedSession {
  readonly userId: string;
}

/**
 * Rotates a presented refresh token. Throws a generic 401 for unknown,
 * expired, revoked, or reused tokens; the caller must not distinguish them.
 */
export async function rotateSession(
  db: PrismaClient,
  presentedToken: string,
  meta: SessionMeta = {},
): Promise<RotatedSession> {
  const current = await db.session.findUnique({
    where: { tokenHash: hashToken(presentedToken) },
    include: { user: true },
  });

  if (!current) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  if (current.revokedAt) {
    // Stop replay: kill every other live token in this family.
    await db.session.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
    });
    throw new UnauthorizedError('Session is no longer valid');
  }

  if (current.expiresAt <= new Date()) {
    throw new UnauthorizedError('Session is no longer valid');
  }
  if (current.user.deletedAt || current.user.status !== 'active' || !current.user.merchantId) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  const nextToken = generateOpaqueToken();
  const nextExpiry = expiresAt();

  const next = await db.$transaction(async (tx) => {
    const revoked = await tx.session.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'rotated', lastUsedAt: new Date() },
    });

    // Another request rotated first: treat as reuse and fail closed.
    if (revoked.count !== 1) {
      await tx.session.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
      });
      throw new UnauthorizedError('Session is no longer valid');
    }

    return tx.session.create({
      data: {
        userId: current.userId,
        tokenHash: hashToken(nextToken),
        familyId: current.familyId,
        expiresAt: nextExpiry,
        ...metaFields(meta),
      },
    });
  });

  return {
    token: nextToken,
    sessionId: next.id,
    expiresAt: nextExpiry,
    familyId: current.familyId,
    userId: current.userId,
  };
}

export async function revokeSession(db: Db, sessionId: string, reason = 'logout'): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

export async function revokeAllSessions(
  db: Db,
  userId: string,
  reason = 'password_reset',
): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}
