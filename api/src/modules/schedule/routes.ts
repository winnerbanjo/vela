import { randomBytes } from 'node:crypto';
import type { Booking, Service } from '@prisma/client';
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
import { allocationFor, computeSlots } from './availability.js';
import { expireHolds } from './holds.js';
import { assertTransition } from './state.js';
import { addDays, instantToZonedMinute, zonedMinutesToInstant } from './time.js';

/**
 * Scheduling, holds, and bookings. Mounted at /api.
 *
 * Delay: `now` is read once per request and passed down, so a slow request
 * cannot compute availability against one instant and allocate against another.
 */

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const isoInstant = z.iso.datetime({ offset: true });

const rulesSchema = z
  .object({
    rules: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            startMinute: z.number().int().min(0).max(1439),
            endMinute: z.number().int().min(1).max(1440),
          })
          .strict()
          .refine((window) => window.startMinute < window.endMinute, {
            message: 'A window must end after it starts',
            path: ['endMinute'],
          }),
      )
      .max(60),
    leadTimeMinutes: z.number().int().min(0).max(20_160).optional(),
    slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
    holdTtlMinutes: z.number().int().min(5).max(60).optional(),
  })
  .strict();

const overrideSchema = z
  .object({
    date: dateOnly,
    closed: z.boolean().default(false),
    startMinute: z.number().int().min(0).max(1439).optional(),
    endMinute: z.number().int().min(1).max(1440).optional(),
    reason: z.string().trim().max(120).optional(),
  })
  .strict()
  .refine(
    (value) => value.closed || (value.startMinute !== undefined && value.endMinute !== undefined),
    {
      message: 'Open overrides need start and end minutes',
      path: ['startMinute'],
    },
  )
  .refine(
    (value) =>
      value.startMinute === undefined ||
      value.endMinute === undefined ||
      value.startMinute < value.endMinute,
    { message: 'A window must end after it starts', path: ['endMinute'] },
  );

const holdSchema = z
  .object({
    slug: z.string().trim().min(1).max(63),
    serviceId: uuid,
    staffId: uuid.optional(),
    startsAt: isoInstant,
  })
  .strict();

const confirmSchema = z
  .object({
    holdId: uuid,
    clientName: z.string().trim().min(2).max(120),
    clientEmail: z.email().max(320).optional(),
    clientPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,32}$/, 'Use a phone number with 7 to 32 digits')
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const walkInSchema = z
  .object({
    serviceId: uuid,
    staffId: uuid.nullable().optional(),
    startsAt: isoInstant,
    clientName: z.string().trim().min(2).max(120),
    clientPhone: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const rescheduleSchema = z
  .object({ startsAt: isoInstant, staffId: uuid.nullable().optional() })
  .strict();

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

function isExclusionViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { message?: unknown; meta?: { code?: unknown; message?: unknown } };
  const text = [candidate.message, candidate.meta?.message, candidate.meta?.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return text.includes('23P01') || text.includes('resource_allocations_no_overlap');
}

function bookingReference(): string {
  return `VL-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function serializeBooking(booking: Booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    notes: booking.notes,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    status: booking.status,
    source: booking.source,
    priceKobo: toSafeNumber(booking.priceKobo),
    depositKobo: toSafeNumber(booking.depositKobo),
    createdAt: booking.createdAt.toISOString(),
  };
}

interface HoldRow {
  id: string;
  starts_at: Date;
  ends_at: Date;
  expires_at: Date;
  status: string;
}

/** The resource whose calendar the allocation blocks: a staff member, or the business. */
function resourceFor(merchantId: string, staffId: string | null): string {
  return staffId ?? merchantId;
}

function intervalFor(service: Service, startsAt: Date) {
  return allocationFor(startsAt, service.durationMinutes, service.bufferMinutes);
}

export const scheduleRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];
  const staffOnly = [guards.requireMerchant];

  async function merchantBySlug(slug: string) {
    const merchant = await app.db.merchant.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        timezone: true,
        leadTimeMinutes: true,
        slotIntervalMinutes: true,
        holdTtlMinutes: true,
      },
    });
    if (!merchant) throw new NotFoundError('Studio not found');
    return merchant;
  }

  async function serviceFor(merchantId: string, serviceId: string) {
    const service = await app.db.service.findFirst({
      where: { id: serviceId, merchantId, deletedAt: null, status: 'active' },
    });
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  async function assertStaff(merchantId: string, staffId: string | null | undefined) {
    if (!staffId) return;
    const staff = await app.db.user.findFirst({
      where: { id: staffId, merchantId, deletedAt: null, status: 'active' },
      select: { id: true },
    });
    if (!staff) throw new ValidationError('That staff member does not belong to this business');
  }

  interface ScheduleQueryInput {
    merchantId: string;
    timeZone: string;
    resourceId: string;
    service: Service;
    date: string;
    now: Date;
    leadTimeMinutes: number;
    slotIntervalMinutes: number;
    includeStaffWindows: boolean;
  }

  async function slotsFor(input: ScheduleQueryInput) {
    const dayStart = zonedMinutesToInstant(input.date, 0, input.timeZone);
    const dayEnd = zonedMinutesToInstant(input.date, 1440, input.timeZone);

    const weekly = await app.db.availabilityRule.findMany({
      where: {
        merchantId: input.merchantId,
        ...(input.includeStaffWindows ? {} : { staffId: null }),
      },
    });

    const overrides = (
      await app.db.availabilityOverride.findMany({
        where: { merchantId: input.merchantId, date: new Date(`${input.date}T00:00:00.000Z`) },
      })
    ).map((override) => ({
      date: override.date.toISOString().slice(0, 10),
      closed: override.closed,
      startMinute: override.startMinute,
      endMinute: override.endMinute,
    }));

    const busy = await app.db.resourceAllocation.findMany({
      where: {
        merchantId: input.merchantId,
        resourceId: input.resourceId,
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { startsAt: true, endsAt: true },
    });

    return computeSlots({
      date: input.date,
      timeZone: input.timeZone,
      weekly,
      overrides,
      busy: busy.map((allocation) => ({ start: allocation.startsAt, end: allocation.endsAt })),
      durationMinutes: input.service.durationMinutes,
      bufferMinutes: input.service.bufferMinutes,
      slotIntervalMinutes: input.slotIntervalMinutes,
      leadTimeMinutes: input.leadTimeMinutes,
      now: input.now,
    });
  }

  async function nextAvailableSlotIds(
    merchantId: string,
    timeZone: string,
    resourceId: string,
    service: Service,
    fromDate: string,
    now: Date,
    settings: { leadTimeMinutes: number; slotIntervalMinutes: number },
  ): Promise<{ date: string; startsAt: string; endsAt: string }[]> {
    const results: { date: string; startsAt: string; endsAt: string }[] = [];
    for (let offset = 0; offset < 14 && results.length < 5; offset += 1) {
      const date = offset === 0 ? fromDate : addDays(fromDate, offset);
      const slots = await slotsFor({
        merchantId,
        timeZone,
        resourceId,
        service,
        date,
        now,
        leadTimeMinutes: settings.leadTimeMinutes,
        slotIntervalMinutes: settings.slotIntervalMinutes,
        includeStaffWindows: resourceId !== merchantId,
      });
      for (const slot of slots) {
        if (results.length >= 5) break;
        results.push({
          date,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
        });
      }
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Opening hours and overrides (merchant settings)
  // -------------------------------------------------------------------------

  app.get('/availability/rules', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const [merchant, rules] = await Promise.all([
      app.db.merchant.findUniqueOrThrow({
        where: { id: merchantId },
        select: {
          timezone: true,
          leadTimeMinutes: true,
          slotIntervalMinutes: true,
          holdTtlMinutes: true,
        },
      }),
      app.db.availabilityRule.findMany({
        where: { merchantId, staffId: null },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
    ]);

    return {
      timezone: merchant.timezone,
      leadTimeMinutes: merchant.leadTimeMinutes,
      slotIntervalMinutes: merchant.slotIntervalMinutes,
      holdTtlMinutes: merchant.holdTtlMinutes,
      rules: rules.map((rule) => ({
        id: rule.id,
        weekday: rule.weekday,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      })),
    };
  });

  app.put('/availability/rules', { preHandler: ownerOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const body = rulesSchema.parse(request.body);

    const windows = [...body.rules].sort(
      (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
    );
    for (let index = 1; index < windows.length; index += 1) {
      const previous = windows[index - 1];
      const current = windows[index];
      if (previous && current && previous.weekday === current.weekday) {
        if (current.startMinute < previous.endMinute) {
          throw new ValidationError('Opening windows for the same day cannot overlap');
        }
      }
    }

    const saved = await app.db.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({ where: { merchantId, staffId: null } });
      if (windows.length > 0) {
        await tx.availabilityRule.createMany({
          data: windows.map((window) => ({
            merchantId,
            staffId: null,
            weekday: window.weekday,
            startMinute: window.startMinute,
            endMinute: window.endMinute,
          })),
        });
      }

      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          ...(body.leadTimeMinutes === undefined ? {} : { leadTimeMinutes: body.leadTimeMinutes }),
          ...(body.slotIntervalMinutes === undefined
            ? {}
            : { slotIntervalMinutes: body.slotIntervalMinutes }),
          ...(body.holdTtlMinutes === undefined ? {} : { holdTtlMinutes: body.holdTtlMinutes }),
        },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'availability.rules_updated',
        entityType: 'availability_rule',
        after: { windows: body.rules.length, leadTimeMinutes: body.leadTimeMinutes ?? null },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return tx.availabilityRule.findMany({
        where: { merchantId, staffId: null },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      });
    });

    return {
      rules: saved.map((rule) => ({
        id: rule.id,
        weekday: rule.weekday,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      })),
    };
  });

  app.get('/availability/overrides', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({ from: dateOnly.optional(), to: dateOnly.optional() })
      .parse(request.query ?? {});

    const overrides = await app.db.availabilityOverride.findMany({
      where: {
        merchantId,
        staffId: null,
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
                ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'asc' },
    });

    return {
      overrides: overrides.map((override) => ({
        id: override.id,
        date: override.date.toISOString().slice(0, 10),
        closed: override.closed,
        startMinute: override.startMinute,
        endMinute: override.endMinute,
        reason: override.reason,
      })),
    };
  });

  app.post('/availability/overrides', { preHandler: ownerOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = overrideSchema.parse(request.body);

    const existing = await app.db.availabilityOverride.findFirst({
      where: {
        merchantId,
        staffId: null,
        date: new Date(`${body.date}T00:00:00.000Z`),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('That date already has an override; remove it first');
    }

    const override = await app.db.availabilityOverride.create({
      data: {
        merchantId,
        staffId: null,
        date: new Date(`${body.date}T00:00:00.000Z`),
        closed: body.closed,
        startMinute: body.closed ? null : (body.startMinute ?? null),
        endMinute: body.closed ? null : (body.endMinute ?? null),
        reason: body.reason ?? null,
      },
    });

    return reply.status(201).send({
      override: {
        id: override.id,
        date: body.date,
        closed: override.closed,
        startMinute: override.startMinute,
        endMinute: override.endMinute,
        reason: override.reason,
      },
    });
  });

  app.delete<{ Params: { id: string } }>(
    '/availability/overrides/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const deleted = await app.db.availabilityOverride.deleteMany({
        where: { id, merchantId },
      });
      if (deleted.count === 0) throw new NotFoundError('Override not found');
      return { message: 'Override removed.' };
    },
  );

  // -------------------------------------------------------------------------
  // Public availability
  // -------------------------------------------------------------------------

  app.get(
    '/availability/slots',
    { config: { rateLimit: { max: config.rateLimitPublicMax, timeWindow: '1 minute' } } },
    async (request) => {
      const query = z
        .object({
          slug: z.string().trim().min(1).max(63),
          serviceId: uuid,
          date: dateOnly,
          staffId: uuid.optional(),
        })
        .parse(request.query ?? {});

      const merchant = await merchantBySlug(query.slug);
      const service = await serviceFor(merchant.id, query.serviceId);
      await assertStaff(merchant.id, query.staffId ?? service.staffId);

      const now = new Date();
      await expireHolds(app.db, now, merchant.id);

      const resourceId = resourceFor(merchant.id, query.staffId ?? service.staffId);
      const slots = await slotsFor({
        merchantId: merchant.id,
        timeZone: merchant.timezone,
        resourceId,
        service,
        date: query.date,
        now,
        leadTimeMinutes: merchant.leadTimeMinutes,
        slotIntervalMinutes: merchant.slotIntervalMinutes,
        includeStaffWindows: Boolean(query.staffId ?? service.staffId),
      });

      return {
        date: query.date,
        timezone: merchant.timezone,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        slots: slots.map((slot) => ({
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
        })),
      };
    },
  );

  // -------------------------------------------------------------------------
  // Holds: the 15-minute reservation before payment
  // -------------------------------------------------------------------------

  app.post(
    '/holds',
    { config: { rateLimit: { max: config.rateLimitPublicMax, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = holdSchema.parse(request.body);
      const merchant = await merchantBySlug(body.slug);
      const service = await serviceFor(merchant.id, body.serviceId);
      await assertStaff(merchant.id, body.staffId ?? service.staffId);

      const now = new Date();
      const requestedStart = new Date(body.startsAt);
      if (requestedStart <= now) {
        throw new ValidationError('That time is in the past');
      }

      await expireHolds(app.db, now, merchant.id);

      const resourceId = resourceFor(merchant.id, body.staffId ?? service.staffId);
      const { date } = instantToZonedMinute(requestedStart, merchant.timezone);
      const slots = await slotsFor({
        merchantId: merchant.id,
        timeZone: merchant.timezone,
        resourceId,
        service,
        date,
        now,
        leadTimeMinutes: merchant.leadTimeMinutes,
        slotIntervalMinutes: merchant.slotIntervalMinutes,
        includeStaffWindows: Boolean(body.staffId ?? service.staffId),
      });

      const chosen = slots.find((slot) => slot.startsAt.getTime() === requestedStart.getTime());
      if (!chosen) {
        throw new ConflictError('That time is no longer available');
      }

      const expiresAt = new Date(now.getTime() + merchant.holdTtlMinutes * 60_000);

      try {
        // One statement, two rows: a data-modifying CTE keeps the hold and its
        // allocation atomic without an interactive transaction. Under a burst
        // of 50 attempts an interactive transaction holds a pool connection
        // while it waits on the exclusion constraint, which starves the pool;
        // a single statement releases it as soon as it commits or fails.
        const rows = await app.db.$queryRaw<HoldRow[]>`
          WITH hold AS (
            INSERT INTO "booking_holds"
              ("merchant_id", "service_id", "staff_id", "resource_id", "starts_at", "ends_at", "expires_at")
            VALUES (
              ${merchant.id}::uuid,
              ${service.id}::uuid,
              ${body.staffId ?? service.staffId ?? null}::uuid,
              ${resourceId}::uuid,
              ${chosen.startsAt},
              ${chosen.occupiedUntil},
              ${expiresAt}
            )
            RETURNING "id", "merchant_id", "resource_id", "starts_at", "ends_at", "expires_at", "status"
          ), allocation AS (
            INSERT INTO "resource_allocations"
              ("merchant_id", "resource_id", "kind", "hold_id", "starts_at", "ends_at")
            SELECT "merchant_id", "resource_id", 'hold'::"AllocationKind", "id", "starts_at", "ends_at"
            FROM hold
            RETURNING 1
          )
          SELECT "id", "starts_at", "ends_at", "expires_at", "status"::text AS "status"
          FROM hold
        `;

        const hold = rows[0];
        if (!hold) throw new InternalError('Hold insert returned no row');

        return reply.status(201).send({
          hold: {
            id: hold.id,
            startsAt: hold.starts_at.toISOString(),
            endsAt: hold.ends_at.toISOString(),
            expiresAt: hold.expires_at.toISOString(),
            status: hold.status,
          },
        });
      } catch (error) {
        if (isExclusionViolation(error)) {
          throw new ConflictError('Another customer just took that time');
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/holds/:id',
    { config: { rateLimit: { max: config.rateLimitPublicMax, timeWindow: '1 minute' } } },
    async (request) => {
      const id = uuid.parse(request.params.id);
      await app.db.$transaction(async (tx) => {
        const released = await tx.bookingHold.updateMany({
          where: { id, status: 'active' },
          data: { status: 'released' },
        });
        if (released.count > 0) {
          await tx.resourceAllocation.deleteMany({ where: { holdId: id } });
        }
      });
      return { message: 'Hold released.' };
    },
  );

  // -------------------------------------------------------------------------
  // Bookings
  // -------------------------------------------------------------------------

  app.post(
    '/bookings',
    { config: { rateLimit: { max: config.rateLimitPublicMax, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = confirmSchema.parse(request.body);
      const now = new Date();

      const hold = await app.db.bookingHold.findUnique({ where: { id: body.holdId } });
      if (!hold) throw new NotFoundError('Hold not found');
      if (hold.status !== 'active') throw new ConflictError('That hold is no longer active');
      if (hold.expiresAt <= now) throw new ConflictError('That hold has expired');

      const service = await app.db.service.findUnique({ where: { id: hold.serviceId } });
      if (!service) throw new NotFoundError('Service not found');

      try {
        const booking = await app.db.$transaction(async (tx) => {
          const claimed = await tx.bookingHold.updateMany({
            where: { id: hold.id, status: 'active', expiresAt: { gt: now } },
            data: { status: 'converted' },
          });
          if (claimed.count === 0) {
            throw new ConflictError('That hold has expired');
          }

          const created = await tx.booking.create({
            data: {
              merchantId: hold.merchantId,
              serviceId: hold.serviceId,
              staffId: hold.staffId,
              holdId: hold.id,
              resourceId: hold.resourceId,
              reference: bookingReference(),
              clientName: body.clientName,
              clientEmail: body.clientEmail?.toLowerCase() ?? null,
              clientPhone: body.clientPhone ?? null,
              notes: body.notes ?? null,
              startsAt: hold.startsAt,
              endsAt: hold.endsAt,
              status: 'confirmed',
              source: 'online',
              priceKobo: service.priceKobo,
              depositKobo: service.depositKobo,
            },
          });

          const moved = await tx.resourceAllocation.updateMany({
            where: { holdId: hold.id },
            data: {
              kind: 'booking',
              bookingId: created.id,
              holdId: null,
            },
          });
          if (moved.count !== 1) {
            throw new InternalError('Hold allocation went missing');
          }

          await writeAudit(tx, {
            merchantId: hold.merchantId,
            actorId: null,
            actorRole: 'client',
            action: 'booking.confirmed',
            entityType: 'booking',
            entityId: created.id,
            after: { reference: created.reference, startsAt: created.startsAt.toISOString() },
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? null,
            requestId: request.id,
          });

          return created;
        });

        return reply.status(201).send({ booking: serializeBooking(booking) });
      } catch (error) {
        if (isExclusionViolation(error)) {
          throw new ConflictError('Another customer just took that time');
        }
        throw error;
      }
    },
  );

  app.get('/bookings', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        from: isoInstant.optional(),
        to: isoInstant.optional(),
        status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
      })
      .parse(request.query ?? {});

    const from = query.from ? new Date(query.from) : new Date(Date.now() - 60 * 60_000);
    const to = query.to ? new Date(query.to) : new Date(from.getTime() + 7 * 24 * 60 * 60_000);
    if (to.getTime() - from.getTime() > 90 * 24 * 60 * 60_000) {
      throw new ValidationError('Request at most 90 days at a time');
    }

    const bookings = await app.db.booking.findMany({
      where: {
        merchantId,
        startsAt: { gte: from, lt: to },
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });

    return { bookings: bookings.map(serializeBooking) };
  });

  app.post('/bookings/walk-in', { preHandler: staffOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = walkInSchema.parse(request.body);

    const service = await serviceFor(merchantId, body.serviceId);
    await assertStaff(merchantId, body.staffId ?? service.staffId);

    const startsAt = new Date(body.startsAt);
    if (startsAt < new Date(Date.now() - 15 * 60_000)) {
      throw new ValidationError('A walk-in cannot be booked more than 15 minutes in the past');
    }

    const resourceId = resourceFor(merchantId, body.staffId ?? service.staffId);
    const interval = intervalFor(service, startsAt);

    try {
      const booking = await app.db.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: {
            merchantId,
            serviceId: service.id,
            staffId: body.staffId ?? service.staffId ?? null,
            resourceId,
            reference: bookingReference(),
            clientName: body.clientName,
            clientPhone: body.clientPhone ?? null,
            notes: body.notes ?? null,
            startsAt: interval.startsAt,
            endsAt: interval.endsAt,
            status: 'confirmed',
            source: 'walk_in',
            priceKobo: service.priceKobo,
            depositKobo: service.depositKobo,
          },
        });

        await tx.resourceAllocation.create({
          data: {
            merchantId,
            resourceId,
            kind: 'booking',
            bookingId: created.id,
            startsAt: interval.startsAt,
            endsAt: interval.endsAt,
          },
        });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'booking.walk_in_created',
          entityType: 'booking',
          entityId: created.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });

        return created;
      });

      return reply.status(201).send({ booking: serializeBooking(booking) });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new ConflictError('That staff member already has an appointment then');
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>(
    '/bookings/:id/cancel',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = z
        .object({ reason: z.string().trim().max(200).optional() })
        .parse(request.body ?? {});
      const now = new Date();

      const booking = await app.db.booking.findFirst({ where: { id, merchantId } });
      if (!booking) throw new NotFoundError('Booking not found');
      assertTransition(booking.status, 'cancelled');

      const updated = await app.db.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({
          where: { id, merchantId, status: booking.status },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            cancelReason: body.reason ?? null,
          },
        });
        if (result.count === 0) {
          throw new ConflictError('That booking changed while you were cancelling it');
        }

        // Cancelling frees the slot immediately; reminders are cancelled by the
        // job worker (Day 3+), which keys off booking.status.
        await tx.resourceAllocation.deleteMany({ where: { bookingId: id } });

        await writeAudit(tx, {
          merchantId,
          actorId: request.auth?.userId ?? null,
          actorRole: request.auth?.role ?? null,
          action: 'booking.cancelled',
          entityType: 'booking',
          entityId: id,
          before: { status: booking.status },
          after: { status: 'cancelled', reason: body.reason ?? null },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
          requestId: request.id,
        });

        return tx.booking.findUniqueOrThrow({ where: { id } });
      });

      return { booking: serializeBooking(updated) };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/bookings/:id/reschedule',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = rescheduleSchema.parse(request.body);

      const booking = await app.db.booking.findFirst({
        where: { id, merchantId },
        include: { service: true },
      });
      if (!booking) throw new NotFoundError('Booking not found');
      if (booking.status !== 'confirmed') {
        throw new ConflictError('Only confirmed bookings can be moved');
      }
      await assertStaff(merchantId, body.staffId ?? booking.staffId);

      const startsAt = new Date(body.startsAt);
      if (startsAt <= new Date()) {
        throw new ValidationError('Pick a time in the future');
      }

      const interval = intervalFor(booking.service, startsAt);
      const resourceId = resourceFor(merchantId, body.staffId ?? booking.staffId);

      try {
        const updated = await app.db.$transaction(async (tx) => {
          await tx.resourceAllocation.updateMany({
            where: { bookingId: id },
            data: { startsAt: interval.startsAt, endsAt: interval.endsAt, resourceId },
          });

          const result = await tx.booking.update({
            where: { id },
            data: {
              startsAt: interval.startsAt,
              endsAt: interval.endsAt,
              staffId: body.staffId === undefined ? booking.staffId : body.staffId,
              resourceId,
            },
          });

          await writeAudit(tx, {
            merchantId,
            actorId: request.auth?.userId ?? null,
            actorRole: request.auth?.role ?? null,
            action: 'booking.rescheduled',
            entityType: 'booking',
            entityId: id,
            before: { startsAt: booking.startsAt.toISOString() },
            after: { startsAt: interval.startsAt.toISOString() },
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? null,
            requestId: request.id,
          });

          return result;
        });

        return { booking: serializeBooking(updated) };
      } catch (error) {
        if (isExclusionViolation(error)) {
          throw new ConflictError('That staff member is already booked then');
        }
        throw error;
      }
    },
  );

  // Exposed for the dashboard's "next available" hint on an empty day.
  app.get('/availability/next', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({ serviceId: uuid, from: dateOnly.optional() })
      .parse(request.query ?? {});

    const [merchant, service] = await Promise.all([
      app.db.merchant.findUniqueOrThrow({
        where: { id: merchantId },
        select: { timezone: true, leadTimeMinutes: true, slotIntervalMinutes: true },
      }),
      serviceFor(merchantId, query.serviceId),
    ]);

    const now = new Date();
    const { date } = instantToZonedMinute(now, merchant.timezone);
    const from = query.from ?? date;
    await expireHolds(app.db, now, merchantId);

    const resourceId = resourceFor(merchantId, service.staffId);
    return {
      timezone: merchant.timezone,
      slots: await nextAvailableSlotIds(
        merchantId,
        merchant.timezone,
        resourceId,
        service,
        from,
        now,
        merchant,
      ),
    };
  });
};
