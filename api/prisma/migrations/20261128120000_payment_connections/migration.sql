-- Vela payment connections (Day 4.5).
-- A merchant either settles through the platform's Paystack account (split to a
-- verified subaccount) or connects their own Paystack secret key. Credentials
-- and full account numbers are stored only as AES-256-GCM ciphertext.

CREATE TYPE "PaymentMode" AS ENUM ('platform', 'direct');
CREATE TYPE "PaymentConnectionStatus" AS ENUM ('active', 'disabled');

-- Existing payments were all initialized against the platform account.
ALTER TABLE "payments"
    ADD COLUMN "settlement_mode" "PaymentMode" NOT NULL DEFAULT 'platform';

CREATE TABLE "payment_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'platform',
    "status" "PaymentConnectionStatus" NOT NULL DEFAULT 'active',
    "secret_key_ciphertext" TEXT,
    "secret_key_last4" VARCHAR(8),
    "secret_key_fingerprint" VARCHAR(64),
    "provider_verified_at" TIMESTAMPTZ(6),
    "subaccount_code" VARCHAR(64),
    "bank_code" VARCHAR(8),
    "bank_name" VARCHAR(80),
    "account_name" VARCHAR(120),
    "account_number_ciphertext" TEXT,
    "account_number_last4" VARCHAR(8),
    "bank_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_settings_merchant_id_key"
    ON "payment_settings" ("merchant_id");

ALTER TABLE "payment_settings"
    ADD CONSTRAINT "payment_settings_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
