-- Vela catalogue migration (Day 2).
-- Forward-only. Adds merchant profile fields plus services and portfolio items,
-- with the invariants those tables must hold independently of the application.

-- ---------------------------------------------------------------------------
-- Merchant profile (dashboard: website, settings)
-- ---------------------------------------------------------------------------

ALTER TABLE "merchants"
  ADD COLUMN "trade" VARCHAR(32) NOT NULL DEFAULT 'other',
  ADD COLUMN "bio" VARCHAR(1000),
  ADD COLUMN "location" VARCHAR(200),
  ADD COLUMN "phone" VARCHAR(32),
  ADD COLUMN "contact_email" VARCHAR(320),
  ADD COLUMN "custom_domain" VARCHAR(253),
  ADD COLUMN "custom_domain_verified_at" TIMESTAMPTZ(6),
  ADD COLUMN "published_at" TIMESTAMPTZ(6),
  ADD COLUMN "has_unpublished_changes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "inbox_mode" VARCHAR(16) NOT NULL DEFAULT 'draft';

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_trade_format"
  CHECK ("trade" ~ '^[a-z][a-z0-9_]{1,31}$');

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_inbox_mode_allowed"
  CHECK ("inbox_mode" IN ('draft', 'auto'));

-- Contact email mirrors users.email: stored lowercase, optional.
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_contact_email_lowercase"
  CHECK ("contact_email" IS NULL OR "contact_email" = lower("contact_email"));

-- A verified custom domain must exist; a domain cannot be verified before set.
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_custom_domain_verified"
  CHECK ("custom_domain_verified_at" IS NULL OR "custom_domain" IS NOT NULL);

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_custom_domain_lowercase"
  CHECK ("custom_domain" IS NULL OR "custom_domain" = lower("custom_domain"));

CREATE UNIQUE INDEX "merchants_custom_domain_key"
  ON "merchants" ("custom_domain")
  WHERE "custom_domain" IS NOT NULL AND "deleted_at" IS NULL;

-- ---------------------------------------------------------------------------
-- Services (dashboard: Services, storefront catalogue)
-- ---------------------------------------------------------------------------

CREATE TYPE "ServiceStatus" AS ENUM ('active', 'archived');

CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "duration_minutes" INTEGER NOT NULL,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "price_kobo" BIGINT NOT NULL,
    "deposit_kobo" BIGINT NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'active',
    "staff_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "services_merchant_id_status_idx" ON "services"("merchant_id", "status");
CREATE INDEX "services_staff_id_idx" ON "services"("staff_id");

ALTER TABLE "services" ADD CONSTRAINT "services_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "services" ADD CONSTRAINT "services_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Duration covers a real appointment window; buffer is occupancy only.
ALTER TABLE "services" ADD CONSTRAINT "services_duration_bounds"
  CHECK ("duration_minutes" BETWEEN 5 AND 1440);

ALTER TABLE "services" ADD CONSTRAINT "services_buffer_bounds"
  CHECK ("buffer_minutes" BETWEEN 0 AND 240);

ALTER TABLE "services" ADD CONSTRAINT "services_price_non_negative"
  CHECK ("price_kobo" >= 0);

-- A deposit larger than the service price would leave a negative balance.
ALTER TABLE "services" ADD CONSTRAINT "services_deposit_within_price"
  CHECK ("deposit_kobo" >= 0 AND "deposit_kobo" <= "price_kobo");

ALTER TABLE "services" ADD CONSTRAINT "services_name_not_blank"
  CHECK (length(btrim("name")) > 0);

-- ---------------------------------------------------------------------------
-- Portfolio items (dashboard: Gallery lookbook / Website)
-- ---------------------------------------------------------------------------

CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "service_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "caption" VARCHAR(300),
    "image_url" VARCHAR(2048) NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portfolio_items_merchant_id_sort_order_idx"
  ON "portfolio_items"("merchant_id", "sort_order");

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_image_url_https"
  CHECK ("image_url" ~ '^https://');

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_title_not_blank"
  CHECK (length(btrim("title")) > 0);

-- Only one cover image per merchant at a time.
CREATE UNIQUE INDEX "portfolio_items_one_cover_per_merchant"
  ON "portfolio_items" ("merchant_id")
  WHERE "is_cover" AND "deleted_at" IS NULL;

COMMENT ON TABLE "services" IS 'Price and deposit are integer kobo; deleted_at is a soft archive.';
COMMENT ON TABLE "portfolio_items" IS 'Public lookbook entries; image_url must be https (signed R2 URL or CDN).';
