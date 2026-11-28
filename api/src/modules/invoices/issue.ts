import { Prisma, type Invoice, type PrismaClient } from '@prisma/client';
import { writeAudit } from '../../platform/audit.js';
import { InternalError } from '../../platform/errors.js';
import { generateOpaqueToken, hashToken } from '../identity/tokens.js';

/**
 * Invoice issuance and settlement.
 *
 * Numbers are allocated from a per-merchant counter with a single atomic
 * upsert, so two acceptances cannot take the same invoice number. The deposit
 * (or full) invoice is created at acceptance; the balance invoice is created
 * only when the deposit payment is confirmed by a verified webhook.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export interface InvoiceAmounts {
  readonly totalKobo: bigint;
  readonly depositKobo: bigint;
  readonly balanceKobo: bigint;
}

export interface IssueInvoiceInput {
  readonly merchantId: string;
  readonly quoteVersionId?: string | null;
  readonly kind: 'deposit' | 'balance' | 'full';
  readonly amountKobo: bigint;
  readonly currency: string;
  readonly clientName: string;
  readonly description: string;
  readonly dueAt?: Date | null;
}

export interface IssuedInvoice {
  readonly invoice: Invoice;
  /** Raw token, returned to the caller only once. */
  readonly publicToken: string | null;
}

/** Atomically takes the next invoice number for this merchant. */
export async function nextInvoiceNumber(db: Db, merchantId: string): Promise<number> {
  const rows = await db.$queryRaw<{ last_number: number }[]>`
    INSERT INTO invoice_counters (merchant_id, last_number)
    VALUES (${merchantId}::uuid, 1)
    ON CONFLICT (merchant_id)
    DO UPDATE SET last_number = invoice_counters.last_number + 1
    RETURNING last_number
  `;
  const row = rows[0];
  if (!row) throw new InternalError('Could not allocate an invoice number');
  return row.last_number;
}

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function issueInvoice(
  db: Db,
  input: IssueInvoiceInput,
  options: { publicToken?: boolean; now?: Date } = {},
): Promise<IssuedInvoice> {
  const now = options.now ?? new Date();
  const number = await nextInvoiceNumber(db, input.merchantId);
  const token = options.publicToken === false ? null : generateOpaqueToken();

  const invoice = await db.invoice.create({
    data: {
      merchantId: input.merchantId,
      quoteVersionId: input.quoteVersionId ?? null,
      kind: input.kind,
      number,
      currency: input.currency,
      amountKobo: input.amountKobo,
      clientName: input.clientName,
      description: input.description.slice(0, 200),
      dueAt: input.dueAt ?? daysFrom(now, 7),
      ...(token ? { publicTokenHash: hashToken(token), publicTokenIssuedAt: now } : {}),
    },
  });

  return { invoice, publicToken: token };
}

export interface AcceptanceInvoiceInput {
  readonly merchantId: string;
  readonly quoteVersionId: string;
  readonly quoteVersion: number;
  readonly clientName: string;
  readonly currency: string;
  readonly amounts: InvoiceAmounts;
  readonly now?: Date;
}

export interface AcceptanceInvoiceResult {
  readonly invoice: Invoice;
  readonly publicToken: string;
}

/**
 * Called inside the acceptance transaction: a deposit invoice when a deposit
 * is configured, otherwise one full invoice. With a zero deposit there is no
 * second invoice to issue later.
 */
export async function issueInvoicesForAcceptance(
  tx: Prisma.TransactionClient,
  input: AcceptanceInvoiceInput,
): Promise<AcceptanceInvoiceResult> {
  const now = input.now ?? new Date();
  const isDeposit = input.amounts.depositKobo > 0n;
  const amountKobo = isDeposit ? input.amounts.depositKobo : input.amounts.totalKobo;

  if (amountKobo <= 0n) {
    throw new InternalError('An accepted quote must produce a positive invoice');
  }

  const issued = await issueInvoice(
    tx,
    {
      merchantId: input.merchantId,
      quoteVersionId: input.quoteVersionId,
      kind: isDeposit ? 'deposit' : 'full',
      amountKobo,
      currency: input.currency,
      clientName: input.clientName,
      description: `${isDeposit ? 'Deposit' : 'Full payment'} — quote v${input.quoteVersion}`,
    },
    { now },
  );

  await writeAudit(tx, {
    merchantId: input.merchantId,
    actorId: null,
    actorRole: 'client',
    action: 'invoice.issued',
    entityType: 'invoice',
    entityId: issued.invoice.id,
    after: {
      number: issued.invoice.number,
      kind: issued.invoice.kind,
      amountKobo: Number(amountKobo),
    },
  });

  if (!issued.publicToken) {
    throw new InternalError('An acceptance invoice needs a payment link');
  }

  return { invoice: issued.invoice, publicToken: issued.publicToken };
}

export interface SettledInvoice {
  readonly invoice: Invoice;
  readonly paid: boolean;
  readonly balanceInvoice: Invoice | null;
}

/**
 * Applies a verified payment to its invoice. Idempotent: a second delivery for
 * the same payment finds the invoice already paid and does nothing.
 *
 * The caller has already verified the webhook signature and recorded the
 * ledger row; this function only moves the invoice state.
 */
export async function settleInvoicePayment(
  db: PrismaClient,
  payment: {
    readonly id: string;
    readonly merchantId: string;
    readonly invoiceId: string | null;
    readonly amountKobo: bigint;
  },
  meta: { requestId?: string | null } = {},
  now: Date = new Date(),
): Promise<SettledInvoice | null> {
  if (!payment.invoiceId) return null;

  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: payment.invoiceId as string, merchantId: payment.merchantId },
    });
    if (!invoice) return null;

    const claimed = await tx.invoice.updateMany({
      where: {
        id: invoice.id,
        status: 'open',
        amountKobo: payment.amountKobo,
      },
      data: { status: 'paid', paidKobo: payment.amountKobo, paidAt: now },
    });

    if (claimed.count === 0) {
      return { invoice, paid: false, balanceInvoice: null };
    }

    const paidInvoice = {
      ...invoice,
      status: 'paid' as const,
      paidKobo: payment.amountKobo,
      paidAt: now,
    };

    await writeAudit(tx, {
      merchantId: payment.merchantId,
      actorId: null,
      actorRole: 'provider',
      action: 'invoice.paid',
      entityType: 'invoice',
      entityId: invoice.id,
      after: {
        number: invoice.number,
        kind: invoice.kind,
        amountKobo: Number(payment.amountKobo),
        paymentId: payment.id,
      },
      requestId: meta.requestId ?? null,
    });

    // Only a cleared deposit unlocks the balance invoice.
    let balanceInvoice: Invoice | null = null;
    if (invoice.kind === 'deposit' && invoice.quoteVersionId) {
      const version = await tx.quoteVersion.findUnique({
        where: { id: invoice.quoteVersionId },
        select: { balanceKobo: true, version: true },
      });

      if (version && version.balanceKobo > 0n) {
        try {
          const issued = await issueInvoice(
            tx,
            {
              merchantId: invoice.merchantId,
              quoteVersionId: invoice.quoteVersionId,
              kind: 'balance',
              amountKobo: version.balanceKobo,
              currency: invoice.currency,
              clientName: invoice.clientName,
              description: `Balance — quote v${version.version}`,
            },
            { publicToken: false, now },
          );
          balanceInvoice = issued.invoice;

          await writeAudit(tx, {
            merchantId: payment.merchantId,
            actorId: null,
            actorRole: 'provider',
            action: 'invoice.issued',
            entityType: 'invoice',
            entityId: issued.invoice.id,
            after: {
              number: issued.invoice.number,
              kind: 'balance',
              amountKobo: Number(version.balanceKobo),
              follows: invoice.id,
            },
            requestId: meta.requestId ?? null,
          });
        } catch (error) {
          // A concurrent delivery may already have issued it; the unique
          // (quote_version_id, kind) index makes that a no-op, not a failure.
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            balanceInvoice = await tx.invoice.findUnique({
              where: {
                quoteVersionId_kind: {
                  quoteVersionId: invoice.quoteVersionId,
                  kind: 'balance',
                },
              },
            });
          } else {
            throw error;
          }
        }
      }
    }

    return { invoice: paidInvoice, paid: true, balanceInvoice };
  });
}
