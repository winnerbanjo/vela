import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../../platform/config.js';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../platform/errors.js';
import { deriveOtpPepper } from '../identity/tokens.js';
import { issueOtp } from '../identity/otp.js';
import { revokeAllSessions } from '../identity/session.js';

/** Staff accounts. Mounted at /api/staff. Owners only for mutations. */

const idSchema = z.string().uuid();
const email = z.string().trim().toLowerCase().email().max(320);
const staffRole = z.enum(['staff', 'front_desk']);

const inviteSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    role: staffRole.default('staff'),
    phone: z.string().trim().max(32).optional(),
  })
  .strict();

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: staffRole.optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .strict();

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export const staffRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const ownerOnly = guards.requireRole('owner');
  const pepper = deriveOtpPepper(config.jwtSecret);

  app.get('/', { preHandler: guards.requireMerchant }, async (request) => {
    const merchantId = request.auth?.merchantId as string;

    const staff = await app.db.user.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
      },
    });

    return {
      staff: staff.map((member) => ({
        ...member,
        lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
      })),
    };
  });

  app.post('/', { preHandler: ownerOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = inviteSchema.parse(request.body);

    const existing = await app.db.user.findFirst({
      where: { merchantId, email: body.email, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('That person is already on your team');
    }

    let invited;
    try {
      invited = await app.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            merchantId,
            email: body.email,
            name: body.name,
            phone: body.phone ?? null,
            role: body.role,
            status: 'invited',
          },
        });

        const otp = await issueOtp(tx, pepper, {
          email: body.email,
          purpose: 'staff_invite',
          userId: user.id,
          ip: request.ip,
        });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'staff.invited',
          entityType: 'user',
          entityId: user.id,
          after: { email: body.email, role: body.role },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });

        return { user, otp };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('That person is already on your team');
      }
      throw error;
    }

    const payload = {
      message: 'Invitation created. Share the six-digit code with your team member.',
      user: {
        id: invited.user.id,
        name: invited.user.name,
        email: invited.user.email,
        role: invited.user.role,
        status: invited.user.status,
      },
      ...(config.isProduction ? {} : { devCode: invited.otp.code }),
    };

    return reply.status(201).send(payload);
  });

  app.patch<{ Params: { id: string } }>('/:id', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const id = idSchema.parse(request.params.id);
    const body = patchSchema.parse(request.body);

    if (id === request.auth?.userId && body.role) {
      throw new ValidationError('You cannot change your own role');
    }

    const target = await app.db.user.findFirst({
      where: { id, merchantId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('Team member not found');
    if (target.role === 'owner') {
      throw new ForbiddenError('The owner account cannot be changed here');
    }

    const updated = await app.db.user.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.role === undefined ? {} : { role: body.role }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
      },
    });

    if (body.role && body.role !== target.role) {
      await revokeAllSessions(app.db, id, 'role_changed');
    }

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'staff.updated',
      entityType: 'user',
      entityId: id,
      before: { name: target.name, role: target.role },
      after: { name: updated.name, role: updated.role },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    };
  });

  app.delete<{ Params: { id: string } }>('/:id', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const id = idSchema.parse(request.params.id);

    if (id === request.auth?.userId) {
      throw new ValidationError('You cannot remove your own account');
    }

    const target = await app.db.user.findFirst({
      where: { id, merchantId, deletedAt: null },
    });
    if (!target) throw new NotFoundError('Team member not found');
    if (target.role === 'owner') {
      throw new ForbiddenError('The owner account cannot be removed');
    }

    await app.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'suspended' },
      });
      await revokeAllSessions(tx, id, 'removed_from_team');
      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'staff.removed',
        entityType: 'user',
        entityId: id,
        before: { email: target.email, role: target.role },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });
    });

    return { message: 'Team member removed.' };
  });
};
