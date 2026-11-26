-- Vela foundation migration (Day 1).
-- Forward-only. Applied by `prisma migrate deploy`; never edited after merge.
--
-- Contents:
--   1. Required extensions (btree_gist is needed by the booking exclusion
--      constraint that lands with resource_allocations; pgcrypto by the stack).
--   2. Prisma-generated DDL for merchants, users, sessions, otp_codes, audit_logs.
--   3. Invariants Prisma cannot express: CHECKs, partial/functional unique
--      indexes, and the append-only audit guard.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'front_desk', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('invited', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('onboarding', 'active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('verify_email', 'login', 'reset_password', 'staff_invite');

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(63) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Africa/Lagos',
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "MerchantStatus" NOT NULL DEFAULT 'onboarding',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(32),
    "name" VARCHAR(120) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'staff',
    "status" "UserStatus" NOT NULL DEFAULT 'invited',
    "password_hash" VARCHAR(255),
    "email_verified_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_reason" VARCHAR(64),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "email" VARCHAR(320) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID,
    "actor_id" UUID,
    "actor_role" VARCHAR(32),
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(64),
    "before" JSONB,
    "after" JSONB,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "request_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");

-- CreateIndex
CREATE INDEX "users_merchant_id_idx" ON "users"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "otp_codes_email_purpose_created_at_idx" ON "otp_codes"("email", "purpose", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_merchant_id_created_at_idx" ON "audit_logs"("merchant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Invariants Prisma cannot express
-- ---------------------------------------------------------------------------

-- Public slugs appear in provider URLs: lowercase, hyphenated, URL-safe.
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_slug_format"
  CHECK ("slug" ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$');

-- Platform admins are the only accounts without a merchant.
ALTER TABLE "users" ADD CONSTRAINT "users_merchant_matches_role"
  CHECK ((role = 'admin') = ("merchant_id" IS NULL));

-- Invited staff have no password yet; active or suspended accounts must.
ALTER TABLE "users" ADD CONSTRAINT "users_active_has_password"
  CHECK ("status" = 'invited' OR "password_hash" IS NOT NULL);

-- Emails are normalised before insert; the unique indexes below rely on it.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase"
  CHECK ("email" = lower("email"));

-- One account per email per merchant, one platform admin per email.
CREATE UNIQUE INDEX "users_merchant_email_key"
  ON "users" ("merchant_id", lower("email"))
  WHERE "deleted_at" IS NULL AND "merchant_id" IS NOT NULL;

CREATE UNIQUE INDEX "users_platform_email_key"
  ON "users" (lower("email"))
  WHERE "deleted_at" IS NULL AND "merchant_id" IS NULL;

-- A session cannot be born expired or revoked before it existed.
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_time_order"
  CHECK ("expires_at" > "created_at" AND ("revoked_at" IS NULL OR "revoked_at" >= "created_at"));

-- Verification attempts are bounded by the row's own policy.
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_attempt_bounds"
  CHECK ("attempts" >= 0 AND "attempts" <= "max_attempts" AND "expires_at" > "created_at");

-- Audit rows are append-only: money, role, and booking history must never be
-- rewritable through the application connection. Retention jobs run as a
-- separate role with ALTER TABLE ... DISABLE TRIGGER.
CREATE FUNCTION "audit_logs_reject_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_reject_mutation"();

COMMENT ON TABLE "users" IS 'PII: name, email, phone. Erasure anonymises these columns.';
COMMENT ON TABLE "otp_codes" IS 'Hashed one-time codes; plaintext codes are never stored.';
COMMENT ON TABLE "sessions" IS 'Refresh token hashes with rotation families; reuse revokes the family.';
COMMENT ON TABLE "audit_logs" IS 'Append-only security audit trail (1 year retention).';
