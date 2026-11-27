import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Security-relevant mutations write one row here. The table is append-only in
 * Postgres, so history cannot be rewritten through the application connection.
 */

export interface AuditEntry {
  readonly merchantId: string | null;
  readonly actorId: string | null;
  readonly actorRole: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly before?: Prisma.InputJsonValue;
  readonly after?: Prisma.InputJsonValue;
  readonly ip?: string | null;
  readonly userAgent?: string | null;
  readonly requestId?: string | null;
}

type Db = PrismaClient | Prisma.TransactionClient;

export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      merchantId: entry.merchantId,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ...(entry.before === undefined ? {} : { before: entry.before }),
      ...(entry.after === undefined ? {} : { after: entry.after }),
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, 255) ?? null,
      requestId: entry.requestId ?? null,
    },
  });
}
