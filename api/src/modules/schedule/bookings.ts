import { randomBytes } from 'node:crypto';
import type { Booking, PrismaClient } from '@prisma/client';
import { writeAudit } from '../../platform/audit.js';
import { ConflictError, InternalError, NotFoundError } from '../../platform/errors.js';

/**
 * Turning a hold into a booking. Both paths that can do this — a customer
 * confirming directly and a verified Paystack webhook — must produce exactly
 * the same row, so the logic lives here rather than in either route.
 */

export interface ConfirmHoldInput {
  readonly holdId: string;
  readonly clientName: string;
  readonly clientEmail?: string | null | undefined;
  readonly clientPhone?: string | null | undefined;
  readonly notes?: string | null | undefined;
}

export interface RequestMeta {
  readonly ip?: string | null;
  readonly userAgent?: string | null;
  readonly requestId?: string | null;
}

export function bookingReference(): string {
  return `VL-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InternalError('Stored amount exceeds the safe integer range');
  }
  return Number(value);
}

export function serializeBooking(booking: Booking) {
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

/**
 * Claims the hold (so a concurrent confirmation or the expiry sweep cannot also
 * consume it), creates the booking from the service snapshot, and moves the
 * allocation from hold to booking in one transaction.
 *
 * `now` is injected so tests can drive expiry deterministically.
 */
export async function confirmHold(
  db: PrismaClient,
  input: ConfirmHoldInput,
  meta: RequestMeta = {},
  now: Date = new Date(),
): Promise<Booking> {
  const hold = await db.bookingHold.findUnique({ where: { id: input.holdId } });
  if (!hold) throw new NotFoundError('Hold not found');
  if (hold.status !== 'active') throw new ConflictError('That hold is no longer active');
  if (hold.expiresAt <= now) throw new ConflictError('That hold has expired');

  const service = await db.service.findUnique({ where: { id: hold.serviceId } });
  if (!service) throw new NotFoundError('Service not found');

  return db.$transaction(async (tx) => {
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
        clientName: input.clientName,
        clientEmail: input.clientEmail?.toLowerCase() ?? null,
        clientPhone: input.clientPhone ?? null,
        notes: input.notes ?? null,
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
      data: { kind: 'booking', bookingId: created.id, holdId: null },
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
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      requestId: meta.requestId ?? null,
    });

    return created;
  });
}
