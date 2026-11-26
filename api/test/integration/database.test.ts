import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertMerchantId, createPrismaClient, withTenant } from '../../src/platform/db.js';
import { hasDatabase, testConfig } from '../helpers/config.js';

function uniqueSlug(): string {
  return `test-${randomUUID().slice(0, 8)}`;
}

describe.skipIf(!hasDatabase)('database foundation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await createPrismaClient(testConfig());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has the extensions the platform depends on', async () => {
    const rows = await prisma.$queryRaw<{ extname: string }[]>`
      select extname from pg_extension where extname in ('btree_gist', 'pgcrypto') order by extname
    `;

    expect(rows.map((row) => row.extname)).toEqual(['btree_gist', 'pgcrypto']);
  });

  it('pins app.merchant_id for the transaction only', async () => {
    const merchantId = randomUUID();

    const inside = await withTenant(
      prisma,
      merchantId,
      (tx) =>
        tx.$queryRaw<{ value: string | null }[]>`
        select current_setting('app.merchant_id', true) as value
      `,
    );

    expect(inside[0]?.value).toBe(merchantId);

    const outside = await prisma.$queryRaw<{ value: string | null }[]>`
      select current_setting('app.merchant_id', true) as value
    `;

    expect(outside[0]?.value).not.toBe(merchantId);
  });

  it('rejects malformed merchant ids before running a query', () => {
    expect(() => assertMerchantId('not-a-uuid')).toThrow(/valid merchant id/);
    expect(() => assertMerchantId('')).toThrow(/valid merchant id/);
  });

  it('keeps audit rows append-only', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const row = await tx.auditLog.create({
          data: { action: 'test.append_only', entityType: 'test' },
        });
        await tx.auditLog.update({ where: { id: row.id }, data: { action: 'tampered' } });
      }),
    ).rejects.toThrow(/append-only/);

    const leftover = await prisma.auditLog.count({ where: { action: 'test.append_only' } });
    expect(leftover).toBe(0);
  });

  it('enforces case-insensitive email uniqueness per merchant', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({
          data: { name: 'Duplicate Co', slug: uniqueSlug() },
        });

        const base = {
          merchantId: merchant.id,
          name: 'Owner',
          role: 'owner' as const,
          status: 'active' as const,
          passwordHash: 'argon2-placeholder',
        };

        await tx.user.create({ data: { ...base, email: 'owner@example.com' } });
        await tx.user.create({ data: { ...base, email: 'owner@example.com' } });
      }),
    ).rejects.toThrow(/Unique constraint|users_merchant_email_key/i);
  });

  it('rejects mixed-case emails at the database boundary', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({
          data: { name: 'Case Co', slug: uniqueSlug() },
        });

        await tx.user.create({
          data: {
            merchantId: merchant.id,
            email: 'Owner@Example.com',
            name: 'Owner',
            role: 'owner',
            status: 'active',
            passwordHash: 'argon2-placeholder',
          },
        });
      }),
    ).rejects.toThrow(/check constraint|users_email_lowercase/i);
  });
});
