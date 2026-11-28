import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '../../platform/errors.js';
import { hashToken } from '../identity/tokens.js';
import {
  acceptanceBlockReason,
  computeQuoteTotals,
  issueQuoteShareToken,
  MAX_QUOTE_ITEMS,
  type QuoteItemInput,
} from './quote.js';

/**
 * Quotes and opportunities. Mounted at /api.
 *
 * Security shape: totals are recomputed from line items (never accepted from
 * the client), every send mints a single-purpose token whose digest is all the
 * database keeps, and only the latest sent version can be accepted. Quote
 * mutations are owner/front-desk only; the client acts through the token.
 */

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const isoInstant = z.iso.datetime({ offset: true });
const shareToken = z
  .string()
  .trim()
  .min(20)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, 'Malformed token');

const itemSchema = z
  .object({
    description: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(10_000),
    unitPriceKobo: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

const opportunitySchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    clientName: z.string().trim().min(2).max(120),
    clientEmail: z.email().max(320).optional(),
    clientPhone: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(2000).optional(),
    eventDate: dateOnly.optional(),
  })
  .strict();

const versionBody = {
  items: z.array(itemSchema).min(1).max(MAX_QUOTE_ITEMS),
  depositPercent: z.number().int().min(0).max(100),
  validUntil: isoInstant,
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(2000).optional(),
};

const createQuoteSchema = z
  .object({
    opportunityId: uuid.optional(),
    opportunity: opportunitySchema.optional(),
    clientName: z.string().trim().min(2).max(120),
    clientEmail: z.email().max(320).optional(),
    clientPhone: z.string().trim().max(32).optional(),
    ...versionBody,
  })
  .strict();

const newVersionSchema = z.object(versionBody).strict();
const sendSchema = z.object({ validUntil: isoInstant.optional() }).strict();
const declineSchema = z.object({ reason: z.string().trim().max(200).optional() }).strict();

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

function parseValidUntil(raw: string, now: Date, allowEarlier = false): Date {
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new ValidationError('validUntil must be a valid timestamp');
  }
  if (!allowEarlier && value <= now) {
    throw new ValidationError('validUntil must be in the future');
  }
  return value;
}

function computeTotalsOrThrow(items: readonly QuoteItemInput[], depositPercent: number) {
  try {
    return computeQuoteTotals(items, depositPercent);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}

type QuoteItemRow = {
  id: string;
  description: string;
  quantity: number;
  unitPriceKobo: bigint;
  totalKobo: bigint;
  sortOrder: number;
};

function serializeItems(items: readonly QuoteItemRow[]) {
  return items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPriceKobo: toSafeNumber(item.unitPriceKobo),
      totalKobo: toSafeNumber(item.totalKobo),
    }));
}

function serializeVersion(
  version: {
    id: string;
    version: number;
    status: string;
    subtotalKobo: bigint;
    totalKobo: bigint;
    depositPercent: number;
    depositKobo: bigint;
    balanceKobo: bigint;
    validUntil: Date;
    notes: string | null;
    terms: string | null;
    sentAt: Date | null;
    acceptedAt: Date | null;
    declinedAt: Date | null;
    supersededAt: Date | null;
    createdAt: Date;
  },
  items: readonly QuoteItemRow[] = [],
) {
  return {
    id: version.id,
    version: version.version,
    status: version.status,
    subtotalKobo: toSafeNumber(version.subtotalKobo),
    totalKobo: toSafeNumber(version.totalKobo),
    depositPercent: version.depositPercent,
    depositKobo: toSafeNumber(version.depositKobo),
    balanceKobo: toSafeNumber(version.balanceKobo),
    validUntil: version.validUntil.toISOString(),
    notes: version.notes,
    terms: version.terms,
    sentAt: version.sentAt?.toISOString() ?? null,
    acceptedAt: version.acceptedAt?.toISOString() ?? null,
    declinedAt: version.declinedAt?.toISOString() ?? null,
    supersededAt: version.supersededAt?.toISOString() ?? null,
    createdAt: version.createdAt.toISOString(),
    items: serializeItems(items),
  };
}

export const quoteRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const drafters = [guards.requireMerchant, guards.requireRole('owner', 'front_desk')];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];
  const publicLimit = { config: { rateLimit: { max: config.rateLimitPublicMax } } };

  async function loadQuote(merchantId: string, quoteId: string) {
    const quote = await app.db.quote.findFirst({
      where: { id: quoteId, merchantId },
      include: {
        opportunity: true,
        versions: { orderBy: { version: 'desc' }, include: { items: true } },
      },
    });
    if (!quote) throw new NotFoundError('Quote not found');
    return quote;
  }

  app.post('/quotes', { preHandler: drafters }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = createQuoteSchema.parse(request.body);
    const now = new Date();
    const validUntil = parseValidUntil(body.validUntil, now);
    const totals = computeTotalsOrThrow(body.items, body.depositPercent);

    const merchant = await app.db.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { currency: true },
    });

    if (body.opportunityId) {
      const existing = await app.db.opportunity.findFirst({
        where: { id: body.opportunityId, merchantId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundError('Opportunity not found');
    }

    const quote = await app.db.$transaction(async (tx) => {
      let opportunityId = body.opportunityId ?? null;
      if (body.opportunity) {
        const created = await tx.opportunity.create({
          data: {
            merchantId,
            title: body.opportunity.title,
            clientName: body.opportunity.clientName,
            clientEmail: body.opportunity.clientEmail?.toLowerCase() ?? null,
            clientPhone: body.opportunity.clientPhone ?? null,
            notes: body.opportunity.notes ?? null,
            eventDate: body.opportunity.eventDate ? new Date(body.opportunity.eventDate) : null,
          },
        });
        opportunityId = created.id;
      }

      const created = await tx.quote.create({
        data: {
          merchantId,
          opportunityId,
          clientName: body.clientName,
          clientEmail: body.clientEmail?.toLowerCase() ?? null,
          clientPhone: body.clientPhone ?? null,
          currency: merchant.currency,
          status: 'draft',
          latestVersion: 1,
          versions: {
            create: {
              version: 1,
              status: 'draft',
              subtotalKobo: BigInt(totals.subtotalKobo),
              totalKobo: BigInt(totals.totalKobo),
              depositPercent: totals.depositPercent,
              depositKobo: BigInt(totals.depositKobo),
              balanceKobo: BigInt(totals.balanceKobo),
              validUntil,
              notes: body.notes ?? null,
              terms: body.terms ?? null,
              items: {
                create: body.items.map((item, index) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPriceKobo: BigInt(item.unitPriceKobo),
                  totalKobo: BigInt(item.unitPriceKobo * item.quantity),
                  sortOrder: index,
                })),
              },
            },
          },
        },
        include: { versions: { include: { items: true } } },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'quote.created',
        entityType: 'quote',
        entityId: created.id,
        after: { version: 1, totalKobo: totals.totalKobo },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return created;
    });

    return reply.status(201).send({
      quote: {
        id: quote.id,
        status: quote.status,
        currency: quote.currency,
        latestVersion: quote.latestVersion,
      },
      version: serializeVersion(quote.versions[0]!, quote.versions[0]!.items),
    });
  });

  app.get('/quotes', { preHandler: drafters }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z
          .enum(['draft', 'sent', 'accepted', 'declined', 'expired', 'superseded'])
          .optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const quotes = await app.db.quote.findMany({
      where: { merchantId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        opportunity: { select: { id: true, title: true, eventDate: true } },
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    return {
      quotes: quotes.map((quote) => ({
        id: quote.id,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        currency: quote.currency,
        status: quote.status,
        latestVersion: quote.latestVersion,
        opportunity: quote.opportunity,
        totalKobo: quote.versions[0] ? toSafeNumber(quote.versions[0].totalKobo) : 0,
        depositKobo: quote.versions[0] ? toSafeNumber(quote.versions[0].depositKobo) : 0,
        validUntil: quote.versions[0]?.validUntil.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
      })),
    };
  });

  app.get<{ Params: { id: string } }>('/quotes/:id', { preHandler: drafters }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const id = uuid.parse(request.params.id);
    const quote = await loadQuote(merchantId, id);

    return {
      quote: {
        id: quote.id,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        clientPhone: quote.clientPhone,
        currency: quote.currency,
        status: quote.status,
        latestVersion: quote.latestVersion,
        opportunity: quote.opportunity
          ? {
              id: quote.opportunity.id,
              title: quote.opportunity.title,
              eventDate: quote.opportunity.eventDate?.toISOString().slice(0, 10) ?? null,
              notes: quote.opportunity.notes,
            }
          : null,
        createdAt: quote.createdAt.toISOString(),
      },
      versions: quote.versions.map((version) => serializeVersion(version, version.items)),
    };
  });

  app.post<{ Params: { id: string } }>(
    '/quotes/:id/versions',
    { preHandler: drafters },
    async (request, reply) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = newVersionSchema.parse(request.body);
      const now = new Date();
      const validUntil = parseValidUntil(body.validUntil, now);
      const totals = computeTotalsOrThrow(body.items, body.depositPercent);

      const quote = await app.db.quote.findFirst({
        where: { id, merchantId },
        select: { id: true, latestVersion: true },
      });
      if (!quote) throw new NotFoundError('Quote not found');

      const nextVersion = quote.latestVersion + 1;

      const created = await app.db.$transaction(async (tx) => {
        const claimed = await tx.quote.updateMany({
          where: { id, merchantId, latestVersion: quote.latestVersion },
          data: { latestVersion: nextVersion },
        });
        if (claimed.count === 0) {
          throw new ConflictError('That quote changed while you were editing it');
        }

        const version = await tx.quoteVersion.create({
          data: {
            quoteId: id,
            version: nextVersion,
            status: 'draft',
            subtotalKobo: BigInt(totals.subtotalKobo),
            totalKobo: BigInt(totals.totalKobo),
            depositPercent: totals.depositPercent,
            depositKobo: BigInt(totals.depositKobo),
            balanceKobo: BigInt(totals.balanceKobo),
            validUntil,
            notes: body.notes ?? null,
            terms: body.terms ?? null,
            items: {
              create: body.items.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPriceKobo: BigInt(item.unitPriceKobo),
                totalKobo: BigInt(item.unitPriceKobo * item.quantity),
                sortOrder: index,
              })),
            },
          },
          include: { items: true },
        });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'quote.version_created',
          entityType: 'quote',
          entityId: id,
          after: { version: nextVersion, totalKobo: totals.totalKobo },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });

        return version;
      });

      return reply.status(201).send({ version: serializeVersion(created, created.items) });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/quotes/:id/send',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = sendSchema.parse(request.body ?? {});
      const now = new Date();

      const quote = await app.db.quote.findFirst({
        where: { id, merchantId },
        select: { id: true, latestVersion: true },
      });
      if (!quote) throw new NotFoundError('Quote not found');

      const version = await app.db.quoteVersion.findUnique({
        where: { quoteId_version: { quoteId: id, version: quote.latestVersion } },
      });
      if (!version) throw new NotFoundError('Quote version not found');
      if (version.status !== 'draft') {
        throw new ConflictError('Only a draft version can be sent');
      }
      if (version.totalKobo <= 0n) {
        throw new ValidationError('A quote with a zero total cannot be sent');
      }

      const validUntil = body.validUntil
        ? parseValidUntil(body.validUntil, now)
        : version.validUntil;
      const issued = issueQuoteShareToken();

      await app.db.$transaction(async (tx) => {
        // Retire any earlier send so its link can no longer be accepted.
        await tx.quoteVersion.updateMany({
          where: { quoteId: id, status: 'sent' },
          data: { status: 'superseded', supersededAt: now },
        });

        const claimed = await tx.quoteVersion.updateMany({
          where: { id: version.id, status: 'draft' },
          data: {
            status: 'sent',
            sentAt: now,
            shareTokenHash: issued.hash,
            shareTokenIssuedAt: now,
            validUntil,
          },
        });
        if (claimed.count === 0) {
          throw new ConflictError('That version changed while you were sending it');
        }

        await tx.quote.update({ where: { id }, data: { status: 'sent' } });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'quote.sent',
          entityType: 'quote',
          entityId: id,
          after: {
            version: version.version,
            totalKobo: toSafeNumber(version.totalKobo),
            validUntil: validUntil.toISOString(),
          },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
      });

      // The raw token is returned once, at send. Only its digest is stored.
      return {
        quoteId: id,
        version: version.version,
        shareToken: issued.token,
        sharePath: `/quote/${issued.token}`,
        validUntil: validUntil.toISOString(),
      };
    },
  );

  // -------------------------------------------------------------------------
  // Public client surface (token is the capability)
  // -------------------------------------------------------------------------

  app.get<{ Params: { token: string } }>('/public/quotes/:token', publicLimit, async (request) => {
    const token = shareToken.parse(request.params.token);
    const now = new Date();

    const version = await app.db.quoteVersion.findUnique({
      where: { shareTokenHash: hashToken(token) },
      include: {
        items: true,
        quote: {
          include: {
            merchant: { select: { name: true, slug: true, currency: true } },
            opportunity: { select: { title: true, eventDate: true } },
          },
        },
      },
    });
    if (!version) throw new NotFoundError('Quote not found');

    let status: string = version.status;
    if (version.status === 'sent' && version.validUntil <= now) {
      // Lazy expiry: the client sees the real state even if no sweeper ran.
      await app.db.quoteVersion.updateMany({
        where: { id: version.id, status: 'sent' },
        data: { status: 'expired' },
      });
      status = 'expired';
    }

    return {
      merchant: {
        name: version.quote.merchant.name,
        slug: version.quote.merchant.slug,
      },
      quote: {
        title: version.quote.opportunity?.title ?? null,
        eventDate: version.quote.opportunity?.eventDate?.toISOString().slice(0, 10) ?? null,
        clientName: version.quote.clientName,
        currency: version.quote.currency,
        version: version.version,
        status,
        items: serializeItems(version.items),
        subtotalKobo: toSafeNumber(version.subtotalKobo),
        totalKobo: toSafeNumber(version.totalKobo),
        depositPercent: version.depositPercent,
        depositKobo: toSafeNumber(version.depositKobo),
        balanceKobo: toSafeNumber(version.balanceKobo),
        validUntil: version.validUntil.toISOString(),
        notes: version.notes,
        terms: version.terms,
        canAccept:
          acceptanceBlockReason(
            {
              status,
              version: version.version,
              latestVersion: version.quote.latestVersion,
              validUntil: version.validUntil,
            },
            now,
          ) === null,
      },
    };
  });

  app.post<{ Params: { token: string } }>(
    '/public/quotes/:token/accept',
    publicLimit,
    async (request) => {
      const token = shareToken.parse(request.params.token);
      const now = new Date();

      const version = await app.db.quoteVersion.findUnique({
        where: { shareTokenHash: hashToken(token) },
        include: { quote: { select: { id: true, merchantId: true, latestVersion: true } } },
      });
      if (!version) throw new NotFoundError('Quote not found');

      const blockReason = acceptanceBlockReason(
        {
          status: version.status,
          version: version.version,
          latestVersion: version.quote.latestVersion,
          validUntil: version.validUntil,
        },
        now,
      );
      if (blockReason) {
        if (version.status === 'sent' && version.validUntil <= now) {
          await app.db.quoteVersion.updateMany({
            where: { id: version.id, status: 'sent' },
            data: { status: 'expired' },
          });
        }
        throw new ConflictError(blockReason);
      }

      await app.db.$transaction(async (tx) => {
        const claimed = await tx.quoteVersion.updateMany({
          where: { id: version.id, status: 'sent' },
          data: { status: 'accepted', acceptedAt: now },
        });
        if (claimed.count === 0) {
          throw new ConflictError('This quote changed while you were accepting it');
        }

        await tx.quote.update({
          where: { id: version.quote.id },
          data: { status: 'accepted' },
        });

        await writeAudit(tx, {
          merchantId: version.quote.merchantId,
          actorId: null,
          actorRole: 'client',
          action: 'quote.accepted',
          entityType: 'quote',
          entityId: version.quote.id,
          after: {
            version: version.version,
            totalKobo: toSafeNumber(version.totalKobo),
            depositKobo: toSafeNumber(version.depositKobo),
          },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
      });

      return {
        accepted: true,
        quoteId: version.quote.id,
        version: version.version,
        acceptedAt: now.toISOString(),
        totalKobo: toSafeNumber(version.totalKobo),
        depositKobo: toSafeNumber(version.depositKobo),
        balanceKobo: toSafeNumber(version.balanceKobo),
      };
    },
  );

  app.post<{ Params: { token: string } }>(
    '/public/quotes/:token/decline',
    publicLimit,
    async (request) => {
      const token = shareToken.parse(request.params.token);
      const body = declineSchema.parse(request.body ?? {});
      const now = new Date();

      const version = await app.db.quoteVersion.findUnique({
        where: { shareTokenHash: hashToken(token) },
        include: { quote: { select: { id: true, merchantId: true, latestVersion: true } } },
      });
      if (!version) throw new NotFoundError('Quote not found');

      const blockReason = acceptanceBlockReason(
        {
          status: version.status,
          version: version.version,
          latestVersion: version.quote.latestVersion,
          validUntil: version.validUntil,
        },
        now,
      );
      if (blockReason) throw new ConflictError(blockReason);

      await app.db.$transaction(async (tx) => {
        const claimed = await tx.quoteVersion.updateMany({
          where: { id: version.id, status: 'sent' },
          data: { status: 'declined', declinedAt: now },
        });
        if (claimed.count === 0) {
          throw new ConflictError('This quote changed while you were declining it');
        }

        await tx.quote.update({ where: { id: version.quote.id }, data: { status: 'declined' } });

        await writeAudit(tx, {
          merchantId: version.quote.merchantId,
          actorId: null,
          actorRole: 'client',
          action: 'quote.declined',
          entityType: 'quote',
          entityId: version.quote.id,
          after: {
            version: version.version,
            reason: body.reason ?? null,
          },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });
      });

      return { declined: true, status: 'declined', declinedAt: now.toISOString() };
    },
  );
};
