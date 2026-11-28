import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/apps/api/app.js';
import { addDays, instantToZonedMinute } from '../../src/modules/schedule/time.js';
import { createAccount, TEST_ORIGIN, type TestAccount } from '../helpers/account.js';
import { hasDatabase, testConfig } from '../helpers/config.js';
import { resetDatabase } from '../helpers/db.js';

const TZ = 'Africa/Lagos';
const PRICE_KOBO = 1_000_000;
const DEPOSIT_KOBO = 200_000;

describe.skipIf(!hasDatabase)('scheduling, holds, and bookings', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // The 50-way race is a load test, not a rate-limit test.
    app = await buildApp(testConfig({ CORS_ORIGINS: TEST_ORIGIN, RATE_LIMIT_PUBLIC_MAX: '5000' }));
  });

  beforeEach(async () => {
    await resetDatabase(app.db);
  });

  afterAll(async () => {
    await app.close();
  });

  function auth(cookie: string) {
    return { cookie, origin: TEST_ORIGIN };
  }

  /** A studio open 09:00–17:00 every day, one 45-minute service with a 10-minute buffer. */
  async function setupStudio(): Promise<{
    account: TestAccount;
    serviceId: string;
    date: string;
  }> {
    const account = await createAccount(app);

    const service = await app.inject({
      method: 'POST',
      url: '/api/services',
      headers: auth(account.cookie),
      payload: {
        name: 'Signature Haircut',
        durationMinutes: 45,
        bufferMinutes: 10,
        priceKobo: PRICE_KOBO,
        depositKobo: DEPOSIT_KOBO,
      },
    });
    expect(service.statusCode).toBe(201);

    const rules = await app.inject({
      method: 'PUT',
      url: '/api/availability/rules',
      headers: auth(account.cookie),
      payload: {
        rules: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        })),
      },
    });
    expect(rules.statusCode).toBe(200);

    const today = instantToZonedMinute(new Date(), TZ).date;
    return { account, serviceId: service.json().service.id as string, date: addDays(today, 3) };
  }

  async function slots(slug: string, serviceId: string, date: string) {
    const response = await app.inject({
      method: 'GET',
      url: `/api/availability/slots?slug=${slug}&serviceId=${serviceId}&date=${date}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().slots as { startsAt: string; endsAt: string }[];
  }

  async function hold(slug: string, serviceId: string, startsAt: string) {
    return app.inject({
      method: 'POST',
      url: '/api/holds',
      headers: { origin: TEST_ORIGIN },
      payload: { slug, serviceId, startsAt },
    });
  }

  it('offers the 45 + 10 grid and refuses client-supplied end times or prices', async () => {
    const { account, serviceId, date } = await setupStudio();
    const available = await slots(account.slug, serviceId, date);

    expect(available).toHaveLength(30);
    // 09:00 in Lagos (UTC+1) is 08:00Z.
    expect(available[0]).toEqual({
      startsAt: `${date}T08:00:00.000Z`,
      endsAt: `${date}T08:45:00.000Z`,
    });
    expect(available.at(-1)?.startsAt).toBe(`${date}T15:15:00.000Z`); // 16:15 local

    // The schema is strict: unknown fields are rejected, so a client cannot
    // smuggle an end time or a price into the allocation.
    const smuggled = await app.inject({
      method: 'POST',
      url: '/api/holds',
      headers: { origin: TEST_ORIGIN },
      payload: {
        slug: account.slug,
        serviceId,
        startsAt: available[0]?.startsAt,
        endTime: `${date}T09:00:00.000Z`,
        priceKobo: 1,
      },
    });
    expect(smuggled.statusCode).toBe(400);
  });

  it('holds a slot for the configured TTL and removes it from availability', async () => {
    const { account, serviceId, date } = await setupStudio();
    const available = await slots(account.slug, serviceId, date);
    const first = available[0]?.startsAt as string;

    const created = await hold(account.slug, serviceId, first);
    expect(created.statusCode).toBe(201);
    const holdId = created.json().hold.id as string;

    const expiresAt = new Date(created.json().hold.expiresAt as string).getTime();
    const ttlMinutes = (expiresAt - Date.now()) / 60_000;
    expect(ttlMinutes).toBeGreaterThan(13);
    expect(ttlMinutes).toBeLessThanOrEqual(15);

    const afterHold = await slots(account.slug, serviceId, date);
    expect(afterHold.some((slot) => slot.startsAt === first)).toBe(false);

    const released = await app.inject({ method: 'DELETE', url: `/api/holds/${holdId}` });
    expect(released.statusCode).toBe(200);

    const afterRelease = await slots(account.slug, serviceId, date);
    expect(afterRelease.some((slot) => slot.startsAt === first)).toBe(true);
  });

  it('gives the last slot to exactly one of 50 simultaneous customers', async () => {
    const { account, serviceId, date } = await setupStudio();
    const available = await slots(account.slug, serviceId, date);
    const lastSlot = available.at(-1)?.startsAt as string;

    const attempts = await Promise.all(
      Array.from({ length: 50 }, () => hold(account.slug, serviceId, lastSlot)),
    );

    const statuses = attempts.map((attempt) => attempt.statusCode);
    expect(statuses.filter((status) => status !== 201 && status !== 409)).toEqual([]);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(49);

    const allocations = await app.db.resourceAllocation.count({
      where: { merchantId: account.merchantId, startsAt: new Date(lastSlot) },
    });
    expect(allocations).toBe(1);
  }, 60_000);

  it('confirms one hold into one booking, snapshotting price and deposit', async () => {
    const { account, serviceId, date } = await setupStudio();
    const first = (await slots(account.slug, serviceId, date))[0]?.startsAt as string;
    const created = await hold(account.slug, serviceId, first);
    const holdId = created.json().hold.id as string;

    const confirmed = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: {
        holdId,
        clientName: 'Amaka Obi',
        clientEmail: 'Amaka@Example.com',
        clientPhone: '+2348012345678',
        // Ignored by the strict schema; the service price is authoritative.
        priceKobo: 1,
      },
    });

    expect(confirmed.statusCode).toBe(400);

    const valid = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, clientName: 'Amaka Obi', clientEmail: 'Amaka@Example.com' },
    });

    expect(valid.statusCode).toBe(201);
    const booking = valid.json().booking;
    expect(booking).toMatchObject({
      reference: expect.stringMatching(/^VL-[0-9A-F]{8}$/),
      status: 'confirmed',
      source: 'online',
      priceKobo: PRICE_KOBO,
      depositKobo: DEPOSIT_KOBO,
      clientEmail: 'amaka@example.com',
      startsAt: first,
    });

    const allocation = await app.db.resourceAllocation.findFirst({
      where: { bookingId: booking.id },
    });
    expect(allocation?.kind).toBe('booking');
    expect(allocation?.holdId).toBeNull();

    const audit = await app.db.auditLog.findFirst({
      where: { action: 'booking.confirmed', entityId: booking.id },
    });
    expect(audit?.actorRole).toBe('client');

    const replay = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, clientName: 'Someone Else' },
    });
    expect(replay.statusCode).toBe(409);
  });

  it('expires a hold and frees the slot without waiting for the sweeper timer', async () => {
    const { account, serviceId, date } = await setupStudio();
    const first = (await slots(account.slug, serviceId, date))[0]?.startsAt as string;
    const created = await hold(account.slug, serviceId, first);
    const holdId = created.json().hold.id as string;

    // Push the hold into the past; created_at moves too so the DB check holds.
    await app.db.bookingHold.update({
      where: { id: holdId },
      data: {
        createdAt: new Date(Date.now() - 3_600_000),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const afterExpiry = await slots(account.slug, serviceId, date);
    expect(afterExpiry.some((slot) => slot.startsAt === first)).toBe(true);

    const second = await hold(account.slug, serviceId, first);
    expect(second.statusCode).toBe(201);

    const expired = await app.db.bookingHold.findUnique({ where: { id: holdId } });
    expect(expired?.status).toBe('expired');

    const staleConfirmation = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, clientName: 'Too Late' },
    });
    expect(staleConfirmation.statusCode).toBe(409);
  });

  it('keeps bookings tenant-scoped', async () => {
    const { account, serviceId, date } = await setupStudio();
    const other = await createAccount(app);
    const first = (await slots(account.slug, serviceId, date))[0]?.startsAt as string;
    const holdId = (await hold(account.slug, serviceId, first)).json().hold.id as string;
    const booking = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId, clientName: 'Amaka Obi' },
    });
    const bookingId = booking.json().booking.id as string;

    const hijack = await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/cancel`,
      headers: auth(other.cookie),
      payload: { reason: 'not mine' },
    });
    expect(hijack.statusCode).toBe(404);

    const mine = await app.inject({
      method: 'GET',
      url: '/api/bookings',
      headers: auth(account.cookie),
    });
    expect(mine.json().bookings).toHaveLength(1);
  });

  it('cancels once, frees the slot, and refuses a second cancel', async () => {
    const { account, serviceId, date } = await setupStudio();
    const first = (await slots(account.slug, serviceId, date))[0]?.startsAt as string;
    const holdId = (await hold(account.slug, serviceId, first)).json().hold.id as string;
    const booking = (
      await app.inject({
        method: 'POST',
        url: '/api/bookings',
        headers: { origin: TEST_ORIGIN },
        payload: { holdId, clientName: 'Amaka Obi' },
      })
    ).json().booking;

    const cancelled = await app.inject({
      method: 'POST',
      url: `/api/bookings/${booking.id}/cancel`,
      headers: auth(account.cookie),
      payload: { reason: 'Client called' },
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().booking.status).toBe('cancelled');

    const reopened = await slots(account.slug, serviceId, date);
    expect(reopened.some((slot) => slot.startsAt === first)).toBe(true);

    const again = await app.inject({
      method: 'POST',
      url: `/api/bookings/${booking.id}/cancel`,
      headers: auth(account.cookie),
    });
    expect(again.statusCode).toBe(409);
  });

  it('refuses an overlapping walk-in but accepts one on a free slot', async () => {
    const { account, serviceId, date } = await setupStudio();
    const available = await slots(account.slug, serviceId, date);

    const held = await hold(account.slug, serviceId, available[0]?.startsAt as string);
    await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: { origin: TEST_ORIGIN },
      payload: { holdId: held.json().hold.id, clientName: 'Amaka Obi' },
    });

    const overlapping = await app.inject({
      method: 'POST',
      url: '/api/bookings/walk-in',
      headers: auth(account.cookie),
      payload: {
        serviceId,
        startsAt: `${date}T08:30:00.000Z`, // inside the 09:00–09:55 local block
        clientName: 'Walk In',
      },
    });
    expect(overlapping.statusCode).toBe(409);

    const free = await app.inject({
      method: 'POST',
      url: '/api/bookings/walk-in',
      headers: auth(account.cookie),
      payload: { serviceId, startsAt: `${date}T12:00:00.000Z`, clientName: 'Walk In' },
    });
    expect(free.statusCode).toBe(201);
    expect(free.json().booking.source).toBe('walk_in');
  });

  it('refuses a reschedule onto a taken slot and leaves the original intact', async () => {
    const { account, serviceId, date } = await setupStudio();

    async function book(startsAt: string) {
      const held = await hold(account.slug, serviceId, startsAt);
      const confirmed = await app.inject({
        method: 'POST',
        url: '/api/bookings',
        headers: { origin: TEST_ORIGIN },
        payload: { holdId: held.json().hold.id, clientName: 'Amaka Obi' },
      });
      return confirmed.json().booking;
    }

    const early = await book(`${date}T08:00:00.000Z`);
    const later = await book(`${date}T10:00:00.000Z`);

    const moved = await app.inject({
      method: 'POST',
      url: `/api/bookings/${early.id}/reschedule`,
      headers: auth(account.cookie),
      payload: { startsAt: later.startsAt },
    });
    expect(moved.statusCode).toBe(409);

    const stored = await app.db.booking.findUnique({ where: { id: early.id } });
    expect(stored?.startsAt.toISOString()).toBe(early.startsAt);

    const valid = await app.inject({
      method: 'POST',
      url: `/api/bookings/${early.id}/reschedule`,
      headers: auth(account.cookie),
      payload: { startsAt: `${date}T13:00:00.000Z` },
    });
    expect(valid.statusCode).toBe(200);
    expect(valid.json().booking.startsAt).toBe(`${date}T13:00:00.000Z`);
  });

  it('enforces the no-overlap constraint at the database level', async () => {
    const { account, serviceId, date } = await setupStudio();
    const first = (await slots(account.slug, serviceId, date))[0]?.startsAt as string;
    const holdId = (await hold(account.slug, serviceId, first)).json().hold.id as string;

    const competing = await app.db.bookingHold.create({
      data: {
        merchantId: account.merchantId,
        serviceId,
        resourceId: account.merchantId,
        startsAt: new Date(`${date}T08:30:00.000Z`),
        endsAt: new Date(`${date}T09:15:00.000Z`),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });

    // A second allocation for the same resource and instant must be rejected
    // by Postgres, not only by the API.
    await expect(
      app.db.resourceAllocation.create({
        data: {
          merchantId: account.merchantId,
          resourceId: account.merchantId,
          kind: 'hold',
          holdId: competing.id,
          startsAt: new Date(`${date}T08:30:00.000Z`),
          endsAt: new Date(`${date}T09:15:00.000Z`),
        },
      }),
    ).rejects.toThrow();

    const allocations = await app.db.resourceAllocation.count({ where: { holdId } });
    expect(allocations).toBe(1);
  });
});
