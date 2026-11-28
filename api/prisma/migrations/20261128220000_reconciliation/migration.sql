-- Reconciliation is read-only over payments and the append-only ledger. It
-- records what it checked and the discrepancies a human must resolve, never
-- "fixing" money by writing a compensating row.
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('running', 'completed', 'failed');
CREATE TYPE "ReconciliationExceptionKind" AS ENUM (
  'ledger_mismatch',
  'refund_mismatch',
  'stuck_pending',
  'amount_mismatch',
  'paid_without_target'
);
CREATE TYPE "ReconciliationExceptionStatus" AS ENUM ('open', 'resolved');

CREATE TABLE "reconciliation_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID,
  "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'running',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "payments_checked" INTEGER NOT NULL DEFAULT 0,
  "exceptions_found" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reconciliation_runs_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "reconciliation_runs_created_idx" ON "reconciliation_runs" ("created_at" DESC);

CREATE TABLE "reconciliation_exceptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "run_id" UUID NOT NULL,
  "merchant_id" UUID NOT NULL,
  "payment_id" UUID,
  "kind" "ReconciliationExceptionKind" NOT NULL,
  "status" "ReconciliationExceptionStatus" NOT NULL DEFAULT 'open',
  "detail" VARCHAR(500) NOT NULL,
  "amount_kobo" BIGINT NOT NULL DEFAULT 0,
  "resolved_at" TIMESTAMPTZ(6),
  "resolved_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reconciliation_exceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reconciliation_exceptions_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reconciliation_exceptions_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reconciliation_exceptions_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "reconciliation_exceptions_resolved_by_fkey"
    FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Re-running the job must not open the same finding twice; a resolved finding
-- may legitimately reappear if the underlying problem returns.
CREATE UNIQUE INDEX "reconciliation_exceptions_open_idx"
  ON "reconciliation_exceptions" ("merchant_id", "payment_id", "kind")
  WHERE "status" = 'open' AND "payment_id" IS NOT NULL;

CREATE INDEX "reconciliation_exceptions_merchant_status_idx"
  ON "reconciliation_exceptions" ("merchant_id", "status", "created_at" DESC);
