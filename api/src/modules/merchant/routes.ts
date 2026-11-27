import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../../platform/config.js';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import {
  ConflictError,
  NotFoundError,
  NotImplementedError,
  ValidationError,
} from '../../platform/errors.js';
import { isValidSlug } from '../../shared/slug.js';

/** Merchant profile and publishing. Mounted at /api/merchant. */

const email = z.string().trim().toLowerCase().email().max(320);
const trade = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]{1,31}$/, 'Trade must be lowercase');

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().optional(),
    trade: trade.optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    contactEmail: email.nullable().optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    inboxMode: z.enum(['draft', 'auto']).optional(),
  })
  .strict();

const domainSchema = z
  .object({
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .regex(
        /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
        'Enter a valid domain, for example studio.example.com',
      ),
  })
  .strict();

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new ValidationError('Timezone must be a valid IANA name, for example Africa/Lagos');
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export const merchantRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const ownerOnly = guards.requireRole('owner');

  async function loadMerchant(merchantId: string) {
    const merchant = await app.db.merchant.findFirst({
      where: { id: merchantId, deletedAt: null },
    });
    if (!merchant) throw new NotFoundError('Merchant not found');
    return merchant;
  }

  app.get('/', { preHandler: guards.requireMerchant }, async (request) => {
    const merchantId = request.auth?.merchantId;
    if (!merchantId) throw new NotFoundError('Merchant not found');

    const merchant = await loadMerchant(merchantId);
    const serviceCount = await app.db.service.count({
      where: { merchantId, deletedAt: null },
    });

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        trade: merchant.trade,
        bio: merchant.bio,
        location: merchant.location,
        phone: merchant.phone,
        contactEmail: merchant.contactEmail,
        customDomain: merchant.customDomain,
        customDomainVerified: merchant.customDomainVerifiedAt !== null,
        publishedAt: merchant.publishedAt?.toISOString() ?? null,
        hasUnpublishedChanges: merchant.hasUnpublishedChanges,
        inboxMode: merchant.inboxMode,
        timezone: merchant.timezone,
        currency: merchant.currency,
        status: merchant.status,
      },
      counts: { services: serviceCount },
    };
  });

  app.patch('/', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const body = patchSchema.parse(request.body);
    const before = await loadMerchant(merchantId);

    if (body.slug && !isValidSlug(body.slug)) {
      throw new ValidationError('Business URL must be 3-63 lowercase letters, numbers, or hyphens');
    }
    if (body.timezone) {
      assertTimezone(body.timezone);
    }

    const data: Prisma.MerchantUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.trade !== undefined) data.trade = body.trade;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.location !== undefined) data.location = body.location;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail;
    if (body.timezone !== undefined) data.timezone = body.timezone;
    if (body.inboxMode !== undefined) data.inboxMode = body.inboxMode;
    data.hasUnpublishedChanges = true;

    let merchant;
    try {
      merchant = await app.db.$transaction(async (tx) => {
        const updated = await tx.merchant.update({ where: { id: merchantId }, data });
        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'merchant.profile_updated',
          entityType: 'merchant',
          entityId: merchantId,
          before: { name: before.name, slug: before.slug, trade: before.trade },
          after: {
            name: updated.name,
            slug: updated.slug,
            trade: updated.trade,
            inboxMode: updated.inboxMode,
          },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
        return updated;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('That business URL is already taken');
      }
      throw error;
    }

    return {
      message: 'Profile saved. Publish to update your public page.',
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        trade: merchant.trade,
        hasUnpublishedChanges: merchant.hasUnpublishedChanges,
      },
    };
  });

  app.post('/publish', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    await loadMerchant(merchantId);

    const merchant = await app.db.$transaction(async (tx) => {
      const updated = await tx.merchant.update({
        where: { id: merchantId },
        data: { publishedAt: new Date(), hasUnpublishedChanges: false },
      });
      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'merchant.published',
        entityType: 'merchant',
        entityId: merchantId,
        after: { publishedAt: updated.publishedAt?.toISOString() ?? null },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });
      return updated;
    });

    return { message: 'Published.', publishedAt: merchant.publishedAt?.toISOString() ?? null };
  });

  app.post('/domain', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const body = domainSchema.parse(request.body);
    await loadMerchant(merchantId);

    let merchant;
    try {
      merchant = await app.db.merchant.update({
        where: { id: merchantId },
        data: {
          customDomain: body.domain,
          customDomainVerifiedAt: null,
          hasUnpublishedChanges: true,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('That domain is already connected to another merchant');
      }
      throw error;
    }

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'merchant.domain_set',
      entityType: 'merchant',
      entityId: merchantId,
      after: { customDomain: body.domain },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return {
      message: 'Domain saved. Add the DNS record to verify it.',
      customDomain: merchant.customDomain,
      verified: false,
    };
  });

  app.delete('/domain', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    await loadMerchant(merchantId);

    await app.db.merchant.update({
      where: { id: merchantId },
      data: { customDomain: null, customDomainVerifiedAt: null, hasUnpublishedChanges: true },
    });

    return { message: 'Domain removed.' };
  });

  app.post('/domain/verify', { preHandler: ownerOnly }, async () => {
    throw new NotImplementedError('DNS verification lands with the domains module');
  });
};
