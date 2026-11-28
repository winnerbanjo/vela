import { describe, expect, it } from 'vitest';
import {
  allocationFor,
  computeSlots,
  type SlotQuery,
} from '../../src/modules/schedule/availability.js';
import { assertTransition, canTransition } from '../../src/modules/schedule/state.js';
import {
  addDays,
  instantToZonedMinute,
  parseDateOnly,
  weekdayOf,
  zonedMinutesToInstant,
} from '../../src/modules/schedule/time.js';

const LAGOS = 'Africa/Lagos';

function baseQuery(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: '2026-12-07', // Monday
    timeZone: LAGOS,
    weekly: [{ weekday: 1, startMinute: 9 * 60, endMinute: 17 * 60 }],
    overrides: [],
    busy: [],
    durationMinutes: 45,
    bufferMinutes: 10,
    slotIntervalMinutes: 15,
    leadTimeMinutes: 0,
    now: new Date('2026-12-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('calendar arithmetic', () => {
  it('parses real dates and rejects impossible ones', () => {
    expect(parseDateOnly('2026-12-07')).toEqual({ year: 2026, month: 12, day: 7 });
    expect(() => parseDateOnly('2026-02-31')).toThrow(/Invalid calendar date/);
    expect(() => parseDateOnly('07/12/2026')).toThrow(/Invalid calendar date/);
  });

  it('counts weekdays without a timezone', () => {
    expect(weekdayOf('2026-11-27')).toBe(5); // Friday
    expect(weekdayOf('2026-12-06')).toBe(0); // Sunday
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('converts local opening times to UTC in a fixed-offset zone', () => {
    // Lagos is UTC+1 all year: 09:00 local is 08:00Z.
    expect(zonedMinutesToInstant('2026-12-07', 9 * 60, LAGOS).toISOString()).toBe(
      '2026-12-07T08:00:00.000Z',
    );
    expect(instantToZonedMinute(new Date('2026-12-07T08:00:00.000Z'), LAGOS)).toEqual({
      date: '2026-12-07',
      minute: 540,
    });
  });

  it('handles a DST transition instead of assuming a fixed offset', () => {
    // US clocks spring forward on 2026-03-08: 02:00 local does not exist.
    const before = zonedMinutesToInstant('2026-03-08', 60, 'America/New_York');
    const after = zonedMinutesToInstant('2026-03-08', 180, 'America/New_York');

    expect(before.toISOString()).toBe('2026-03-08T06:00:00.000Z'); // 01:00 EST
    expect(after.toISOString()).toBe('2026-03-08T07:00:00.000Z'); // 03:00 EDT
    expect(after.getTime() - before.getTime()).toBe(60 * 60_000);
  });
});

describe('availability engine', () => {
  it('produces the PRD 45 + 10 example', () => {
    const slots = computeSlots(baseQuery());

    expect(slots).toHaveLength(30);
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-12-07T08:00:00.000Z'); // 09:00
    // 16:15 is the last start that finishes (17:00) by closing time.
    expect(slots.at(-1)?.startsAt.toISOString()).toBe('2026-12-07T15:15:00.000Z');
    expect(slots.at(-1)?.endsAt.toISOString()).toBe('2026-12-07T16:00:00.000Z');
    // The buffer may run past closing; it is cleanup, not service time.
    expect(slots.at(-1)?.occupiedUntil.toISOString()).toBe('2026-12-07T16:10:00.000Z');
  });

  it('keeps the 10-minute buffer free for the next booking', () => {
    const slots = computeSlots(
      baseQuery({
        busy: [
          {
            start: new Date('2026-12-07T08:00:00.000Z'), // 09:00 local
            end: new Date('2026-12-07T08:55:00.000Z'), // 09:55 local, incl. buffer
          },
        ],
      }),
    );

    expect(slots[0]?.startsAt.toISOString()).toBe('2026-12-07T09:00:00.000Z'); // 10:00
    expect(
      slots.some((slot) => slot.startsAt.getTime() === Date.parse('2026-12-07T08:45:00Z')),
    ).toBe(false);
  });

  it('drops slots that the lead time has already passed', () => {
    const slots = computeSlots(
      baseQuery({ leadTimeMinutes: 120, now: new Date('2026-12-07T08:00:00.000Z') }),
    );

    // Now is 09:00 local; plus 2h means nothing before 11:00 local.
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-12-07T10:00:00.000Z');
  });

  it('treats a closed override as no availability', () => {
    const slots = computeSlots(
      baseQuery({
        overrides: [{ date: '2026-12-07', closed: true, startMinute: null, endMinute: null }],
      }),
    );
    expect(slots).toEqual([]);
  });

  it('lets an open override replace the weekly window', () => {
    const slots = computeSlots(
      baseQuery({
        overrides: [{ date: '2026-12-07', closed: false, startMinute: 600, endMinute: 720 }],
      }),
    );

    expect(slots[0]?.startsAt.toISOString()).toBe('2026-12-07T09:00:00.000Z'); // 10:00
    expect(slots.at(-1)?.startsAt.toISOString()).toBe('2026-12-07T10:15:00.000Z'); // 11:15
  });

  it('returns nothing on a day without a rule', () => {
    const slots = computeSlots(baseQuery({ date: '2026-12-08' })); // Tuesday
    expect(slots).toEqual([]);
  });

  it('derives the interval from the service, never from a client', () => {
    const interval = allocationFor(new Date('2026-12-07T08:00:00.000Z'), 45, 10);
    expect(interval.startsAt.toISOString()).toBe('2026-12-07T08:00:00.000Z');
    expect(interval.endsAt.toISOString()).toBe('2026-12-07T08:55:00.000Z');
  });

  it('rejects nonsense durations instead of guessing', () => {
    expect(() => computeSlots(baseQuery({ durationMinutes: 0 }))).toThrow(RangeError);
    expect(() => computeSlots(baseQuery({ slotIntervalMinutes: 0 }))).toThrow(RangeError);
  });
});

describe('booking state machine', () => {
  it('allows only the documented transitions', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'no_show')).toBe(true);

    expect(canTransition('cancelled', 'confirmed')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('no_show', 'confirmed')).toBe(false);
  });

  it('throws a 409 for an illegal move', () => {
    expect(() => assertTransition('cancelled', 'completed')).toThrow(/cannot become/);
  });
});
