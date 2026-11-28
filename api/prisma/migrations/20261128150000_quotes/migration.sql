-- Vela quotes (Day 5).
-- A quote is a stable identity; every send creates an immutable version whose
-- totals are computed server-side. Only the digest of the share token is stored,
-- and sending a newer version retires the previous one.

CREATE TYPE "QuoteStatus" AS ENUM (
    'draft', 'sent', 'accepted', 'declined', 'expired', 'superseded'
);

-- ---------------------------------------------------------------------------
-- Opportunities (client enquiries, dated or undated)
-- ---------------------------------------------------------------------------

CREATE TABLE "opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "client_name" VARCHAR(120) NOT NULL,
    "client_email" VARCHAR(320),
    "client_phone" VARCHAR(32),
    "notes" VARCHAR(2000),
    "event_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunities_merchant_created_idx"
    ON "opportunities" ("merchant_id", "created_at" DESC);

ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------

CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "client_name" VARCHAR(120) NOT NULL,
    "client_email" VARCHAR(320),
    "client_phone" VARCHAR(32),
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "latest_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_currency_format"
    CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_latest_version_non_negative"
    CHECK ("latest_version" >= 0);

CREATE INDEX "quotes_merchant_created_idx"
    ON "quotes" ("merchant_id", "created_at" DESC);
CREATE INDEX "quotes_status_idx" ON "quotes" ("status");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Quote versions
-- ---------------------------------------------------------------------------

CREATE TABLE "quote_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "subtotal_kobo" BIGINT NOT NULL,
    "total_kobo" BIGINT NOT NULL,
    "deposit_percent" INTEGER NOT NULL,
    "deposit_kobo" BIGINT NOT NULL,
    "balance_kobo" BIGINT NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "notes" VARCHAR(2000),
    "terms" VARCHAR(2000),
    "share_token_hash" CHAR(64),
    "share_token_issued_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "superseded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_version_positive"
    CHECK ("version" >= 1);

ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_amounts_shape"
    CHECK (
        "subtotal_kobo" >= 0
        AND "total_kobo" = "subtotal_kobo"
        AND "deposit_percent" BETWEEN 0 AND 100
        AND "deposit_kobo" >= 0
        AND "balance_kobo" >= 0
        AND "deposit_kobo" + "balance_kobo" = "total_kobo"
    );

-- A version that has been shown to a client has a send timestamp, and one that
-- was never sent has no share token.
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_send_shape"
    CHECK (("status" <> 'draft') = ("sent_at" IS NOT NULL));
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_share_shape"
    CHECK (("share_token_hash" IS NULL) = ("share_token_issued_at" IS NULL));
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_accepted_shape"
    CHECK (("status" = 'accepted') = ("accepted_at" IS NOT NULL));
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_declined_shape"
    CHECK (("status" = 'declined') = ("declined_at" IS NOT NULL));
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_superseded_shape"
    CHECK (("status" = 'superseded') = ("superseded_at" IS NOT NULL));

CREATE UNIQUE INDEX "quote_versions_quote_version_key"
    ON "quote_versions" ("quote_id", "version");
CREATE UNIQUE INDEX "quote_versions_share_token_hash_key"
    ON "quote_versions" ("share_token_hash");
CREATE INDEX "quote_versions_status_valid_until_idx"
    ON "quote_versions" ("status", "valid_until");

ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Line items
-- ---------------------------------------------------------------------------

CREATE TABLE "quote_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_kobo" BIGINT NOT NULL,
    "total_kobo" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_amounts_shape"
    CHECK (
        "quantity" BETWEEN 1 AND 10000
        AND "unit_price_kobo" >= 0
        AND "total_kobo" = "unit_price_kobo" * "quantity"
    );

CREATE INDEX "quote_line_items_version_sort_idx"
    ON "quote_line_items" ("version_id", "sort_order");

ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_version_id_fkey"
    FOREIGN KEY ("version_id") REFERENCES "quote_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
