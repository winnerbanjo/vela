import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../../src/platform/db.js';
import { hasDatabase, testConfig } from '../helpers/config.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uniqueSlug(): string {
  return `cat-${randomUUID().slice(0, 8)}`;
}

describe.skipIf(!hasDatabase)('catalogue schema invariants', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await createPrismaClient(testConfig());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** Runs inside a transaction that is always rolled back by the rejection. */
  async function expectRejected(fn: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    await expect(prisma.$transaction(fn)).rejects.toThrow();
  }

  it('rejects a deposit larger than the service price', async () => {
    await expectRejected(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name: 'Deposit Co', slug: uniqueSlug() },
      });

      await tx.service.create({
        data: {
          merchantId: merchant.id,
          name: 'Oversold',
          durationMinutes: 45,
          priceKobo: 10_000n,
          depositKobo: 20_000n,
        },
      });
    });
  });

  it('rejects durations outside the supported window and blank names', async () => {
    await expectRejected(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name: 'Duration Co', slug: uniqueSlug() },
      });

      await tx.service.create({
        data: { merchantId: merchant.id, name: 'Too short', durationMinutes: 4, priceKobo: 0n },
      });
    });

    await expectRejected(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name: 'Blank Co', slug: uniqueSlug() },
      });

      await tx.service.create({
        data: { merchantId: merchant.id, name: '   ', durationMinutes: 45, priceKobo: 0n },
      });
    });
  });

  it('keeps one cover portfolio item per merchant', async () => {
    await expectRejected(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name: 'Cover Co', slug: uniqueSlug() },
      });

      await tx.portfolioItem.createMany({
        data: [
          {
            merchantId: merchant.id,
            title: 'First',
            imageUrl: 'https://cdn.example.com/one.jpg',
            isCover: true,
          },
          {
            merchantId: merchant.id,
            title: 'Second',
            imageUrl: 'https://cdn.example.com/two.jpg',
            isCover: true,
          },
        ],
      });
    });
  });

  it('requires https portfolio images', async () => {
    await expectRejected(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { name: 'Insecure Co', slug: uniqueSlug() },
      });

      await tx.portfolioItem.create({
        data: {
          merchantId: merchant.id,
          title: 'Plain http',
          imageUrl: 'http://example.com/a.jpg',
        },
      });
    });
  });

  it('requires a custom domain before it can be marked verified', async () => {
    await expectRejected(async (tx) => {
      await tx.merchant.create({
        data: {
          name: 'Domain Co',
          slug: uniqueSlug(),
          customDomainVerifiedAt: new Date(),
        },
      });
    });
  });

  it('rejects malformed trades and unknown inbox modes', async () => {
    await expectRejected(async (tx) => {
      await tx.merchant.create({
        data: { name: 'Trade Co', slug: uniqueSlug(), trade: 'Not A Trade' },
      });
    });

    await expectRejected(async (tx) => {
      await tx.merchant.create({
        data: { name: 'Inbox Co', slug: uniqueSlug(), inboxMode: 'sometimes' },
      });
    });
  });

  it('creates a catalogue record with generated UUIDs and kobo integers', async () => {
    const slug = uniqueSlug();
    const result = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({ data: { name: 'Studio Co', slug } });
      const service = await tx.service.create({
        data: {
          merchantId: merchant.id,
          name: 'Signature Haircut',
          durationMinutes: 45,
          bufferMinutes: 10,
          priceKobo: 1_000_000n,
          depositKobo: 200_000n,
        },
      });

      return { merchant, service };
    });

    expect(UUID_PATTERN.test(result.service.id)).toBe(true);
    expect(result.service.priceKobo).toBe(1_000_000n);
    expect(result.merchant.hasUnpublishedChanges).toBe(true);
    expect(result.merchant.inboxMode).toBe('draft');
  });
});
