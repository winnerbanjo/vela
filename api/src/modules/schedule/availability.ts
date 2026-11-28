import { MINUTES_PER_DAY, weekdayOf, zonedMinutesToInstant } from './time.js';

/**
 * Pure slot generator. Given opening hours, one date, and the intervals that
 * are already taken, it returns every start time a service of the requested
 * length can begin without overlapping anything.
 *
 * Two rules matter and are asserted in the tests:
 *  - a booking occupies `duration + buffer`; the buffer is cleanup time after
 *    the client leaves, so it must be free but may run past closing time;
 *  - the service itself must finish by closing time.
 */

export interface WeeklyWindow {
  readonly weekday: number;
  readonly startMinute: number;
  readonly endMinute: number;
}

export interface DateOverride {
  readonly date: string;
  readonly closed: boolean;
  readonly startMinute: number | null;
  readonly endMinute: number | null;
}

export interface BusyInterval {
  readonly start: Date;
  readonly end: Date;
}

export interface Slot {
  /** When the appointment starts. */
  readonly startsAt: Date;
  /** When the service ends. */
  readonly endsAt: Date;
  /** When the resource is free again, including the buffer. */
  readonly occupiedUntil: Date;
}

export interface SlotQuery {
  readonly date: string;
  readonly timeZone: string;
  readonly weekly: readonly WeeklyWindow[];
  readonly overrides: readonly DateOverride[];
  readonly busy: readonly BusyInterval[];
  readonly durationMinutes: number;
  readonly bufferMinutes: number;
  readonly slotIntervalMinutes: number;
  readonly leadTimeMinutes: number;
  readonly now: Date;
  readonly maxSlots?: number;
}

const DEFAULT_MAX_SLOTS = 96;

function windowsForDate(query: SlotQuery): WeeklyWindow[] {
  const override = query.overrides.find((candidate) => candidate.date === query.date);
  if (override) {
    if (override.closed || override.startMinute === null || override.endMinute === null) {
      return [];
    }
    return [
      {
        weekday: weekdayOf(query.date),
        startMinute: override.startMinute,
        endMinute: override.endMinute,
      },
    ];
  }

  const weekday = weekdayOf(query.date);
  return query.weekly.filter((window) => window.weekday === weekday);
}

function overlaps(start: Date, end: Date, busy: readonly BusyInterval[]): boolean {
  return busy.some((interval) => start < interval.end && end > interval.start);
}

export function computeSlots(query: SlotQuery): Slot[] {
  if (!Number.isInteger(query.durationMinutes) || query.durationMinutes <= 0) {
    throw new RangeError('durationMinutes must be a positive integer');
  }
  if (!Number.isInteger(query.slotIntervalMinutes) || query.slotIntervalMinutes <= 0) {
    throw new RangeError('slotIntervalMinutes must be a positive integer');
  }

  const bufferMinutes = Math.max(0, query.bufferMinutes);
  const earliest = new Date(query.now.getTime() + Math.max(0, query.leadTimeMinutes) * 60_000);
  const maxSlots = query.maxSlots ?? DEFAULT_MAX_SLOTS;

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const window of windowsForDate(query)) {
    const windowStart = Math.max(0, Math.min(window.startMinute, MINUTES_PER_DAY));
    const windowEnd = Math.max(0, Math.min(window.endMinute, MINUTES_PER_DAY));

    for (
      let minute = windowStart;
      minute + query.durationMinutes <= windowEnd;
      minute += query.slotIntervalMinutes
    ) {
      const startsAt = zonedMinutesToInstant(query.date, minute, query.timeZone);
      if (startsAt < earliest) continue;
      if (seen.has(startsAt.getTime())) continue;

      const endsAt = new Date(startsAt.getTime() + query.durationMinutes * 60_000);
      const occupiedUntil = new Date(endsAt.getTime() + bufferMinutes * 60_000);

      if (overlaps(startsAt, occupiedUntil, query.busy)) continue;

      seen.add(startsAt.getTime());
      slots.push({ startsAt, endsAt, occupiedUntil });
      if (slots.length >= maxSlots) return slots;
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Turns a requested start into the interval the resource will actually hold.
 * The client never supplies the end time: it is derived from the service so a
 * 45-minute service cannot be booked as 15 minutes of the calendar.
 */
export function allocationFor(
  startsAt: Date,
  durationMinutes: number,
  bufferMinutes: number,
): { startsAt: Date; endsAt: Date } {
  const endsAt = new Date(startsAt.getTime() + (durationMinutes + bufferMinutes) * 60_000);
  return { startsAt, endsAt };
}

/** True when `startsAt` sits on the merchant's slot grid for that date. */
export function isOnGrid(query: SlotQuery, startsAt: Date): boolean {
  return computeSlots(query).some((slot) => slot.startsAt.getTime() === startsAt.getTime());
}
