import type { FastifyInstance, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../../platform/errors.js';
import { verifyPassword } from '../identity/password.js';

/**
 * Re-authentication for money-moving changes (refunds, payment destination,
 * bank account changes). A stolen session alone is not enough.
 */
export async function assertOwnerPassword(
  app: FastifyInstance,
  request: FastifyRequest,
  password: string,
): Promise<void> {
  const actor = await app.db.user.findUnique({
    where: { id: request.auth?.userId as string },
    select: { passwordHash: true },
  });
  if (!actor?.passwordHash) throw new UnauthorizedError('Password confirmation failed');
  if (!(await verifyPassword(actor.passwordHash, password))) {
    throw new UnauthorizedError('Password confirmation failed');
  }
}
