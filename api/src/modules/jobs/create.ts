import { Prisma, type Invoice, type Job } from '@prisma/client';
import { writeAudit } from '../../platform/audit.js';
import { parseStoredQuestions } from './job.js';

/**
 * Creates the job that a paid quote turns into.
 *
 * Called inside the invoice-settlement transaction, so a job exists if and only
 * if the deposit (or full payment) is recorded as paid. The unique
 * `quote_version_id` index makes a repeated call harmless.
 */
export async function createJobForInvoice(
  tx: Prisma.TransactionClient,
  invoice: Invoice,
  meta: { requestId?: string | null } = {},
): Promise<Job | null> {
  if (!invoice.quoteVersionId) return null;

  const existing = await tx.job.findUnique({
    where: { quoteVersionId: invoice.quoteVersionId },
  });
  if (existing) return existing;

  const version = await tx.quoteVersion.findUnique({
    where: { id: invoice.quoteVersionId },
    include: {
      quote: { include: { opportunity: true } },
    },
  });
  if (!version) return null;

  const template = await tx.intakeTemplate.findFirst({
    where: { merchantId: invoice.merchantId },
    orderBy: { updatedAt: 'desc' },
  });
  const hasQuestions = template ? parseStoredQuestions(template.questions).length > 0 : false;

  const title = (
    version.quote.opportunity?.title ?? `Project for ${version.quote.clientName}`
  ).slice(0, 160);

  try {
    const job = await tx.job.create({
      data: {
        merchantId: invoice.merchantId,
        quoteVersionId: version.id,
        invoiceId: invoice.id,
        intakeTemplateId: hasQuestions ? (template?.id ?? null) : null,
        title,
        clientName: version.quote.clientName,
        clientEmail: version.quote.clientEmail,
        clientPhone: version.quote.clientPhone,
        eventDate: version.quote.opportunity?.eventDate ?? null,
        status: hasQuestions ? 'intake_pending' : 'in_progress',
      },
    });

    await writeAudit(tx, {
      merchantId: invoice.merchantId,
      actorId: null,
      actorRole: 'provider',
      action: 'job.created',
      entityType: 'job',
      entityId: job.id,
      after: {
        quoteVersionId: version.id,
        invoiceId: invoice.id,
        status: job.status,
        eventDate: job.eventDate?.toISOString().slice(0, 10) ?? null,
      },
      requestId: meta.requestId ?? null,
    });

    return job;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return tx.job.findUnique({ where: { quoteVersionId: version.id } });
    }
    throw error;
  }
}
