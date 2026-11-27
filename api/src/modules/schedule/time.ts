/**
 * Timezone-aware minute arithmetic.
 *
 * Opening hours are stored as minutes from local midnight so they survive
 * daylight-saving changes: 09:00 stays 09:00 even when the UTC offset moves.
 * Conversion happens only at the edges, with `Intl`, so there is no date
 * library dependency and no hand-rolled offset table to get stale.
 */

export const MINUTES_PER_DAY = 1440;

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses `YYYY-MM-DD` and rejects dates that do not exist (e.g. 2026-02-31). */
export function parseDateOnly(value: string): DateParts {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return { year, month, day };
}

export function formatDateOnly({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Adds days on the calendar, independent of any timezone. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateOnly(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateOnly({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/** 0 = Sunday … 6 = Saturday. Pure calendar arithmetic, no timezone involved. */
export function weekdayOf(date: string): number {
  const { year, month, day } = parseDateOnly(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new RangeError(`Unknown timezone: ${timeZone}`);
  }
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  assertTimeZone(timeZone);
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(Math.floor(instant.getTime() / 1000) * 1000));

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = formatted.find((candidate) => candidate.type === type);
    if (!part) throw new RangeError(`Unable to read ${type} for ${timeZone}`);
    return Number(part.value);
  };

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/** The zone's UTC offset at `instant`, in milliseconds (positive east of UTC). */
export function zonedOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a local calendar date plus minutes-from-midnight into an instant.
 * Two passes handle the case where the offset itself depends on the result
 * (the hour before and after a DST transition).
 *
 * An ambiguous local time (clocks went back) resolves to the first occurrence;
 * a skipped local time (clocks went forward) resolves forward past the gap.
 */
export function zonedMinutesToInstant(date: string, minute: number, timeZone: string): Date {
  const dayOffset = Math.floor(minute / MINUTES_PER_DAY);
  const minuteOfDay = minute - dayOffset * MINUTES_PER_DAY;
  const target = dayOffset === 0 ? date : addDays(date, dayOffset);
  const { year, month, day } = parseDateOnly(target);

  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  let instant = naive;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = naive - zonedOffsetMs(new Date(instant), timeZone);
  }
  return new Date(instant);
}

/** Reads an instant as local calendar date and minutes-from-midnight. */
export function instantToZonedMinute(
  instant: Date,
  timeZone: string,
): { date: string; minute: number } {
  const parts = zonedParts(instant, timeZone);
  return {
    date: formatDateOnly(parts),
    minute: parts.hour * 60 + parts.minute,
  };
}
