/**
 * Calendar boundaries in a merchant's IANA timezone.
 *
 * Bookings store UTC instants, but "today" and "this month" are tenant-local
 * questions. These helpers convert a local calendar date back to the UTC
 * instant that starts it, so a dashboard summary never counts yesterday's
 * evening in Lagos as today.
 */

function zoneOffsetMs(timeZone: string, at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';

  const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)) * 60_000;
}

function localDateParts(timeZone: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);

  const read = (type: string): number => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new RangeError(`Could not read ${type} in ${timeZone}`);
    return Number(value);
  };

  return { year: read('year'), month: read('month'), day: read('day') };
}

/** The instant at which the local calendar date begins in `timeZone`. */
function localMidnight(timeZone: string, year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  // The offset can change at the boundary (DST); a second pass settles it.
  const first = guess - zoneOffsetMs(timeZone, new Date(guess));
  const second = guess - zoneOffsetMs(timeZone, new Date(first));
  return new Date(second);
}

export function startOfDayInZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month, day } = localDateParts(timeZone, at);
  return localMidnight(timeZone, year, month, day);
}

export function startOfMonthInZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month } = localDateParts(timeZone, at);
  return localMidnight(timeZone, year, month, 1);
}

/** `YYYY-MM-DD` in the tenant's timezone, for display and comparison. */
export function localDateLabel(timeZone: string, at: Date = new Date()): string {
  const { year, month, day } = localDateParts(timeZone, at);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `YYYY-MM` in the tenant's timezone. */
export function localMonthLabel(timeZone: string, at: Date = new Date()): string {
  const { year, month } = localDateParts(timeZone, at);
  return `${year}-${String(month).padStart(2, '0')}`;
}
