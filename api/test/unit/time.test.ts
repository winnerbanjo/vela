import { describe, expect, it } from 'vitest';
import {
  localDateLabel,
  localMonthLabel,
  startOfDayInZone,
  startOfMonthInZone,
} from '../../src/shared/time.js';

describe('tenant calendar boundaries', () => {
  it('starts the UTC day at midnight UTC', () => {
    expect(startOfDayInZone('UTC', new Date('2026-11-28T17:45:00Z')).toISOString()).toBe(
      '2026-11-28T00:00:00.000Z',
    );
  });

  it('starts the Lagos day at 23:00 UTC the evening before', () => {
    expect(startOfDayInZone('Africa/Lagos', new Date('2026-11-28T09:30:00Z')).toISOString()).toBe(
      '2026-11-27T23:00:00.000Z',
    );
  });

  it('crosses into the next Lagos day at 23:00 UTC', () => {
    expect(startOfDayInZone('Africa/Lagos', new Date('2026-11-28T23:05:00Z')).toISOString()).toBe(
      '2026-11-28T23:00:00.000Z',
    );
  });

  it('starts the month in the tenant timezone', () => {
    expect(startOfMonthInZone('Africa/Lagos', new Date('2026-11-30T23:30:00Z')).toISOString()).toBe(
      '2026-11-30T23:00:00.000Z',
    );
  });

  it('labels the local date and month', () => {
    const at = new Date('2026-11-30T23:30:00Z');
    expect(localDateLabel('Africa/Lagos', at)).toBe('2026-12-01');
    expect(localMonthLabel('Africa/Lagos', at)).toBe('2026-12');
  });

  it('rejects an invalid timezone', () => {
    expect(() => startOfDayInZone('Mars/Olympus', new Date())).toThrow(RangeError);
  });
});
