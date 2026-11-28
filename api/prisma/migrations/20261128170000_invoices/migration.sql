-- Vela invoices (Day 5).
-- An accepted quote version produces a deposit (or full) invoice; the balance
-- is issued only after the deposit is paid. Numbers are sequential per merchant
-- and allocated with an atomic counter update. Public payment links store a
-- digest only, like quote links.

CREATE TYPE "InvoiceKind" AS ENUM ('deposit', 'balance', 'full');
CREATE TYPE "InvoiceStatus" AS ENUM ('open', 'paid', 'void');

CREATE TABLE "invoice_counters" (
    "merchant_id" UUID NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("merchant_id")
);

ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "quote_version_id" UUID,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'open',
    "number" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "amount_kobo" BIGINT NOT NULL,
    "paid_kobo" BIGINT NOT NULL DEFAULT 0,
    "client_name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "public_token_hash" CHAR(64),
    "public_token_issued_at" TIMESTAMPTZ(6),
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_number_positive"
    CHECK ("number" >= 1);

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currency_format"
    CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amounts_shape"
    CHECK (
        "amount_kobo" > 0
        AND "paid_kobo" >= 0
        AND "paid_kobo" <= "amount_kobo"
    );

-- A paid invoice has its full amount allocated and a paid timestamp; a voided
-- invoice records when it was voided. Neither can drift.
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_shape"
    CHECK (
        ("status" = 'paid') = ("paid_at" IS NOT NULL)
        AND ("status" <> 'paid' OR "paid_kobo" = "amount_kobo")
    );
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_shape"
    CHECK (("status" = 'void') = ("voided_at" IS NOT NULL));

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_token_shape"
    CHECK (("public_token_hash" IS NULL) = ("public_token_issued_at" IS NULL));

CREATE UNIQUE INDEX "invoices_merchant_number_key"
    ON "invoices" ("merchant_id", "number");
CREATE UNIQUE INDEX "invoices_quote_version_kind_key"
    ON "invoices" ("quote_version_id", "kind");
CREATE UNIQUE INDEX "invoices_public_token_hash_key"
    ON "invoices" ("public_token_hash");
CREATE INDEX "invoices_merchant_created_idx"
    ON "invoices" ("merchant_id", "created_at" DESC);
CREATE INDEX "invoices_status_idx" ON "invoices" ("status");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_version_id_fkey"
    FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Payments can now target an invoice instead of a hold or booking.
-- ---------------------------------------------------------------------------

ALTER TABLE "payments" ADD COLUMN "invoice_id" UUID;

ALTER TABLE "payments" DROP CONSTRAINT "payments_single_target";
ALTER TABLE "payments" ADD CONSTRAINT "payments_single_target"
    CHECK (
        ("hold_id" IS NOT NULL)::int
        + ("booking_id" IS NOT NULL)::int
        + ("invoice_id" IS NOT NULL)::int
        = 1
    );

CREATE INDEX "payments_invoice_idx" ON "payments" ("invoice_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
