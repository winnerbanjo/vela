-- Vela payments migration (Day 4).
-- Forward-only. Payments, provider events, and an append-only ledger.
-- The webhook is untrusted input: rows are persisted before they are acted on,
-- and every provider event id is unique so a retry cannot duplicate a booking.

CREATE TYPE "PaymentProvider" AS ENUM ('paystack');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'abandoned', 'refunded');
CREATE TYPE "LedgerKind" AS ENUM ('charge', 'refund');

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "hold_id" UUID,
    "booking_id" UUID,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'paystack',
    "reference" VARCHAR(64) NOT NULL,
    "provider_reference" VARCHAR(100),
    "amount_kobo" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "channel" VARCHAR(32),
    "failure_reason" VARCHAR(200),
    "authorization_url" VARCHAR(2048),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive"
  CHECK ("amount_kobo" > 0);

ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_format"
  CHECK ("currency" ~ '^[A-Z]{3}$');

-- A payment that reached the provider's books has a paid timestamp, and one
-- that never did must not pretend otherwise.
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_at_shape"
  CHECK (("status" IN ('succeeded', 'refunded')) = ("paid_at" IS NOT NULL));

-- A payment is for exactly one hold or one booking, never both.
ALTER TABLE "payments" ADD CONSTRAINT "payments_single_target"
  CHECK (("hold_id" IS NULL) <> ("booking_id" IS NULL));

CREATE UNIQUE INDEX "payments_reference_key" ON "payments" ("reference");
CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments" ("provider_reference");
CREATE INDEX "payments_merchant_created_idx" ON "payments" ("merchant_id", "created_at" DESC);
CREATE INDEX "payments_hold_idx" ON "payments" ("hold_id");
CREATE INDEX "payments_status_idx" ON "payments" ("status");

ALTER TABLE "payments" ADD CONSTRAINT "payments_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_hold_id_fkey"
  FOREIGN KEY ("hold_id") REFERENCES "booking_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Provider events (webhook deliveries)
-- ---------------------------------------------------------------------------

CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "PaymentProvider" NOT NULL DEFAULT 'paystack',
    "event_id" VARCHAR(120) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_verified" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ(6),
    "note" VARCHAR(200),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_id" UUID,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_events_event_id_key" ON "payment_events" ("event_id");
CREATE INDEX "payment_events_received_idx" ON "payment_events" ("received_at" DESC);

ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Ledger (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "payment_id" UUID,
    "kind" "LedgerKind" NOT NULL,
    "amount_kobo" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "memo" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- Sign carries meaning: charges are positive, refunds negative. A zero row is
-- always a bug.
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_sign"
  CHECK (
    ("kind" = 'charge' AND "amount_kobo" > 0)
    OR ("kind" = 'refund' AND "amount_kobo" < 0)
  );

CREATE INDEX "ledger_entries_merchant_created_idx"
  ON "ledger_entries" ("merchant_id", "created_at" DESC);

CREATE INDEX "ledger_entries_payment_idx" ON "ledger_entries" ("payment_id");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "ledger_entries_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_entries_no_mutation"
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "ledger_entries_append_only"();
