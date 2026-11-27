-- Vela scheduling migration (Day 3).
-- Forward-only. Opening hours, date overrides, holds, bookings, and the
-- allocation table whose exclusion constraint is the single source of truth
-- for "two customers, one slot".

-- ---------------------------------------------------------------------------
-- Merchant scheduling settings
-- ---------------------------------------------------------------------------

ALTER TABLE "merchants"
  ADD COLUMN "lead_time_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "slot_interval_minutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "hold_ttl_minutes" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_lead_time_range"
  CHECK ("lead_time_minutes" BETWEEN 0 AND 20160);

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_slot_interval_range"
  CHECK ("slot_interval_minutes" BETWEEN 5 AND 120);

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_hold_ttl_range"
  CHECK ("hold_ttl_minutes" BETWEEN 5 AND 60);

-- ---------------------------------------------------------------------------
-- Opening hours (weekly, merchant-local minutes from midnight)
-- ---------------------------------------------------------------------------

CREATE TABLE "availability_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "staff_id" UUID,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_weekday_range"
  CHECK ("weekday" BETWEEN 0 AND 6);

-- Merged, non-empty windows only. Creating slots requires start < end.
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_minutes_range"
  CHECK ("start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute");

-- One window per resource per weekday start. NULL staff means "the whole
-- business", so COALESCE keeps that row unique too.
CREATE UNIQUE INDEX "availability_rules_unique_window"
  ON "availability_rules" (
    "merchant_id",
    COALESCE("staff_id", '00000000-0000-0000-0000-000000000000'::uuid),
    "weekday",
    "start_minute"
  );

CREATE INDEX "availability_rules_merchant_weekday_idx"
  ON "availability_rules" ("merchant_id", "weekday");

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Date overrides
-- ---------------------------------------------------------------------------

CREATE TABLE "availability_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "staff_id" UUID,
    "date" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "reason" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- A closed day has no hours; an open override must carry usable hours.
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_shape"
  CHECK (
    ("closed" = true AND "start_minute" IS NULL AND "end_minute" IS NULL)
    OR ("closed" = false AND "start_minute" IS NOT NULL AND "end_minute" IS NOT NULL
        AND "start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute")
  );

CREATE UNIQUE INDEX "availability_overrides_unique_date"
  ON "availability_overrides" (
    "merchant_id",
    COALESCE("staff_id", '00000000-0000-0000-0000-000000000000'::uuid),
    "date"
  );

CREATE INDEX "availability_overrides_merchant_date_idx"
  ON "availability_overrides" ("merchant_id", "date");

ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Enums for holds, bookings, allocations
-- ---------------------------------------------------------------------------

CREATE TYPE "HoldStatus" AS ENUM ('active', 'converted', 'expired', 'released');
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE "BookingSource" AS ENUM ('online', 'walk_in');
CREATE TYPE "AllocationKind" AS ENUM ('hold', 'booking');

-- ---------------------------------------------------------------------------
-- Holds (short TTL reservation made before payment)
-- ---------------------------------------------------------------------------

CREATE TABLE "booking_holds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "staff_id" UUID,
    "resource_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_interval"
  CHECK ("ends_at" > "starts_at");

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_expiry"
  CHECK ("expires_at" > "created_at");

CREATE INDEX "booking_holds_merchant_expires_idx"
  ON "booking_holds" ("merchant_id", "expires_at");

CREATE INDEX "booking_holds_status_expires_idx"
  ON "booking_holds" ("status", "expires_at");

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "staff_id" UUID,
    "hold_id" UUID,
    "resource_id" UUID NOT NULL,
    "reference" VARCHAR(24) NOT NULL,
    "client_name" VARCHAR(120) NOT NULL,
    "client_email" VARCHAR(320),
    "client_phone" VARCHAR(32),
    "notes" VARCHAR(1000),
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "source" "BookingSource" NOT NULL DEFAULT 'online',
    "price_kobo" BIGINT NOT NULL,
    "deposit_kobo" BIGINT NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_interval"
  CHECK ("ends_at" > "starts_at");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_money"
  CHECK ("price_kobo" >= 0 AND "deposit_kobo" >= 0 AND "deposit_kobo" <= "price_kobo");

-- Cancellation state and its timestamp move together.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_shape"
  CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL));

CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings" ("reference");
CREATE UNIQUE INDEX "bookings_hold_id_key" ON "bookings" ("hold_id");
CREATE INDEX "bookings_merchant_starts_idx" ON "bookings" ("merchant_id", "starts_at");
CREATE INDEX "bookings_merchant_status_idx" ON "bookings" ("merchant_id", "status");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hold_id_fkey"
  FOREIGN KEY ("hold_id") REFERENCES "booking_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Allocations: the arbitration point for concurrent bookings
-- ---------------------------------------------------------------------------

CREATE TABLE "resource_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "kind" "AllocationKind" NOT NULL,
    "hold_id" UUID,
    "booking_id" UUID,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- Exactly one owner: a hold, or a booking. Never both, never neither.
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_owner"
  CHECK (
    (("hold_id" IS NOT NULL AND "booking_id" IS NULL AND "kind" = 'hold')
     OR ("hold_id" IS NULL AND "booking_id" IS NOT NULL AND "kind" = 'booking'))
  );

ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_interval"
  CHECK ("ends_at" > "starts_at");

CREATE UNIQUE INDEX "resource_allocations_hold_id_key" ON "resource_allocations" ("hold_id");
CREATE UNIQUE INDEX "resource_allocations_booking_id_key" ON "resource_allocations" ("booking_id");
CREATE INDEX "resource_allocations_merchant_starts_idx"
  ON "resource_allocations" ("merchant_id", "starts_at");
CREATE INDEX "resource_allocations_resource_starts_idx"
  ON "resource_allocations" ("resource_id", "starts_at");

-- The constraint that wins the race. Two rows for the same resource whose
-- half-open intervals intersect cannot both commit; the loser gets 23P01 and
-- the API turns that into a 409. Requires btree_gist (Day 1 migration).
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_no_overlap"
  EXCLUDE USING gist (
    "resource_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  );

ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_hold_id_fkey"
  FOREIGN KEY ("hold_id") REFERENCES "booking_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
