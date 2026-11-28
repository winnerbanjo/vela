import type { BookingStatus } from '@prisma/client';
import { ConflictError } from '../../platform/errors.js';

/**
 * Booking lifecycle. Only these moves are legal; anything else is a bug in the
 * caller, so it is rejected rather than silently written.
 *
 * confirmed ─→ cancelled | completed | no_show
 * terminal  ─→ nothing
 */
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  confirmed: ['cancelled', 'completed', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictError(`A ${from} booking cannot become ${to}`);
  }
}

export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ['confirmed'];
