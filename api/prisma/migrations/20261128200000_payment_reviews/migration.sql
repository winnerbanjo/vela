-- Operator review of flagged payments. The queue is derived, not stored: a
-- payment with a failure reason and no reviewed_at is waiting for a human.
ALTER TABLE "payments" ADD COLUMN "reviewed_at" TIMESTAMPTZ(6);
ALTER TABLE "payments" ADD COLUMN "reviewed_by" UUID;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX "payments_review_open_idx"
  ON "payments" ("created_at" DESC)
  WHERE "reviewed_at" IS NULL AND "failure_reason" IS NOT NULL;
