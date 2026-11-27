import type { Prisma, Service } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../../platform/config.js';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import { InternalError, NotFoundError, ValidationError } from '../../platform/errors.js';

/**
 * Services and portfolio. Mounted at /api.
 * Every query carries the session's merchant id; a foreign id returns 404.
 */

const idSchema = z.string().uuid();

const serviceFields = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).nullable().optional(),
    durationMinutes: z.number().int().min(5).max(1440),
    bufferMinutes: z.number().int().min(0).max(240).default(0),
    priceKobo: z.number().int().min(0).max(1_000_000_000_000),
    depositKobo: z.number().int().min(0).max(1_000_000_000_000).default(0),
    staffId: idSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

const serviceSchema = serviceFields.refine((value) => value.depositKobo <= value.priceKobo, {
  message: 'Deposit cannot exceed the service price',
  path: ['depositKobo'],
});

const servicePatchSchema = serviceFields.partial();

const portfolioFields = z
  .object({
    title: z.string().trim().min(2).max(120),
    caption: z.string().trim().max(300).nullable().optional(),
    imageUrl: z.string().trim().url().max(2048).startsWith('https://'),
    serviceId: idSchema.nullable().optional(),
    isCover: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

const portfolioSchema = portfolioFields;
const portfolioPatchSchema = portfolioFields.partial();

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

function serializeService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    priceKobo: toSafeNumber(service.priceKobo),
    depositKobo: toSafeNumber(service.depositKobo),
    status: service.status,
    staffId: service.staffId,
    sortOrder: service.sortOrder,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export const catalogueRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const ownerOnly = guards.requireRole('owner');

  async function assertStaffBelongsToMerchant(
    merchantId: string,
    staffId: string | null | undefined,
  ) {
    if (!staffId) return;
    const staff = await app.db.user.findFirst({
      where: {
        id: staffId,
        merchantId,
        deletedAt: null,
        role: { in: ['owner', 'front_desk', 'staff'] },
      },
      select: { id: true },
    });
    if (!staff) {
      throw new ValidationError('Assigned staff member does not belong to this merchant');
    }
  }

  async function findService(merchantId: string, serviceId: string) {
    const service = await app.db.service.findFirst({
      where: { id: serviceId, merchantId, deletedAt: null },
    });
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  app.get('/services', { preHandler: guards.requireMerchant }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({ includeArchived: z.enum(['true', 'false']).optional() })
      .parse(request.query ?? {});

    const services = await app.db.service.findMany({
      where: {
        merchantId,
        deletedAt: null,
        ...(query.includeArchived === 'true' ? {} : { status: 'active' }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return { services: services.map(serializeService) };
  });

  app.post('/services', { preHandler: ownerOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = serviceSchema.parse(request.body);
    await assertStaffBelongsToMerchant(merchantId, body.staffId);

    const service = await app.db.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          merchantId,
          name: body.name,
          description: body.description ?? null,
          durationMinutes: body.durationMinutes,
          bufferMinutes: body.bufferMinutes,
          priceKobo: BigInt(body.priceKobo),
          depositKobo: BigInt(body.depositKobo),
          staffId: body.staffId ?? null,
          sortOrder: body.sortOrder ?? 0,
        },
      });
      await tx.merchant.update({
        where: { id: merchantId },
        data: { hasUnpublishedChanges: true },
      });
      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'service.created',
        entityType: 'service',
        entityId: created.id,
        after: { name: created.name, priceKobo: body.priceKobo, depositKobo: body.depositKobo },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });
      return created;
    });

    return reply.status(201).send({ service: serializeService(service) });
  });

  app.patch<{ Params: { id: string } }>(
    '/services/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);
      const before = await findService(merchantId, id);
      const body = servicePatchSchema.parse(request.body);
      await assertStaffBelongsToMerchant(merchantId, body.staffId);

      const data: Prisma.ServiceUpdateInput = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.durationMinutes !== undefined) data.durationMinutes = body.durationMinutes;
      if (body.bufferMinutes !== undefined) data.bufferMinutes = body.bufferMinutes;
      if (body.priceKobo !== undefined) data.priceKobo = BigInt(body.priceKobo);
      if (body.depositKobo !== undefined) data.depositKobo = BigInt(body.depositKobo);
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.staffId !== undefined) {
        data.staff = body.staffId ? { connect: { id: body.staffId } } : { disconnect: true };
      }

      const price = body.priceKobo ?? toSafeNumber(before.priceKobo);
      const deposit = body.depositKobo ?? toSafeNumber(before.depositKobo);
      if (deposit > price) {
        throw new ValidationError('Deposit cannot exceed the service price');
      }

      const service = await app.db.$transaction(async (tx) => {
        const updated = await tx.service.update({ where: { id }, data });
        await tx.merchant.update({
          where: { id: merchantId },
          data: { hasUnpublishedChanges: true },
        });
        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'service.updated',
          entityType: 'service',
          entityId: id,
          before: { name: before.name, priceKobo: toSafeNumber(before.priceKobo) },
          after: { name: updated.name, priceKobo: toSafeNumber(updated.priceKobo) },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
        return updated;
      });

      return { service: serializeService(service) };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/services/:id/archive',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);
      await findService(merchantId, id);

      const service = await app.db.service.update({
        where: { id },
        data: { status: 'archived' },
      });
      return { service: serializeService(service) };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/services/:id/restore',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);
      await findService(merchantId, id);

      const service = await app.db.service.update({
        where: { id },
        data: { status: 'active' },
      });
      return { service: serializeService(service) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/services/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);
      await findService(merchantId, id);

      await app.db.$transaction(async (tx) => {
        await tx.service.update({
          where: { id },
          data: { deletedAt: new Date(), status: 'archived' },
        });
        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'service.deleted',
          entityType: 'service',
          entityId: id,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
      });

      return { message: 'Service removed.' };
    },
  );

  // -------------------------------------------------------------------------
  // Portfolio lookbook
  // -------------------------------------------------------------------------

  app.get('/portfolio', { preHandler: guards.requireMerchant }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const items = await app.db.portfolioItem.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        caption: item.caption,
        imageUrl: item.imageUrl,
        serviceId: item.serviceId,
        isCover: item.isCover,
        sortOrder: item.sortOrder,
      })),
    };
  });

  app.post('/portfolio', { preHandler: ownerOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = portfolioSchema.parse(request.body);

    if (body.serviceId) {
      await findService(merchantId, body.serviceId);
    }

    const item = await app.db.$transaction(async (tx) => {
      if (body.isCover) {
        await tx.portfolioItem.updateMany({
          where: { merchantId, isCover: true, deletedAt: null },
          data: { isCover: false },
        });
      }
      const created = await tx.portfolioItem.create({
        data: {
          merchantId,
          title: body.title,
          caption: body.caption ?? null,
          imageUrl: body.imageUrl,
          serviceId: body.serviceId ?? null,
          isCover: body.isCover ?? false,
          sortOrder: body.sortOrder ?? 0,
        },
      });
      await tx.merchant.update({
        where: { id: merchantId },
        data: { hasUnpublishedChanges: true },
      });
      return created;
    });

    return reply.status(201).send({
      item: {
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        isCover: item.isCover,
      },
    });
  });

  app.patch<{ Params: { id: string } }>(
    '/portfolio/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);
      const body = portfolioPatchSchema.parse(request.body);

      const existing = await app.db.portfolioItem.findFirst({
        where: { id, merchantId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Portfolio item not found');

      if (body.serviceId) {
        await findService(merchantId, body.serviceId);
      }

      const item = await app.db.$transaction(async (tx) => {
        if (body.isCover) {
          await tx.portfolioItem.updateMany({
            where: { merchantId, isCover: true, deletedAt: null, id: { not: id } },
            data: { isCover: false },
          });
        }
        return tx.portfolioItem.update({
          where: { id },
          data: {
            ...(body.title === undefined ? {} : { title: body.title }),
            ...(body.caption === undefined ? {} : { caption: body.caption }),
            ...(body.imageUrl === undefined ? {} : { imageUrl: body.imageUrl }),
            ...(body.serviceId === undefined ? {} : { serviceId: body.serviceId }),
            ...(body.isCover === undefined ? {} : { isCover: body.isCover }),
            ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
          },
        });
      });

      return { item: { id: item.id, title: item.title, isCover: item.isCover } };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/portfolio/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = idSchema.parse(request.params.id);

      const existing = await app.db.portfolioItem.findFirst({
        where: { id, merchantId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Portfolio item not found');

      await app.db.portfolioItem.update({
        where: { id },
        data: { deletedAt: new Date(), isCover: false },
      });

      return { message: 'Portfolio item removed.' };
    },
  );
};
