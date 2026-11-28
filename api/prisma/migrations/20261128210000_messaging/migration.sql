-- Per-merchant integration switches. Everything is opt-in: a new merchant has
-- WhatsApp and the agent off until the owner turns them on.
CREATE TABLE "merchant_integrations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID NOT NULL,
  "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
  "agent_enabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsapp_phone_number_id" VARCHAR(64),
  "whatsapp_token_ciphertext" TEXT,
  "whatsapp_token_last4" VARCHAR(8),
  "agent_monthly_draft_limit" INTEGER NOT NULL DEFAULT 200,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_integrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_integrations_merchant_id_key" UNIQUE ("merchant_id"),
  CONSTRAINT "merchant_integrations_agent_limit_check" CHECK ("agent_monthly_draft_limit" >= 0),
  CONSTRAINT "merchant_integrations_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "MessageStatus" AS ENUM ('received', 'queued', 'sent', 'delivered', 'failed');
CREATE TYPE "AgentDraftStatus" AS ENUM ('pending', 'approved', 'rejected', 'sent', 'failed');

CREATE TABLE "whatsapp_threads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID NOT NULL,
  "wa_id" VARCHAR(32) NOT NULL,
  "client_name" VARCHAR(120),
  "last_inbound_at" TIMESTAMPTZ(6),
  "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "opted_out_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_threads_merchant_id_wa_id_key" UNIQUE ("merchant_id", "wa_id"),
  CONSTRAINT "whatsapp_threads_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "whatsapp_threads_merchant_last_message_idx"
  ON "whatsapp_threads" ("merchant_id", "last_message_at" DESC);

CREATE TABLE "whatsapp_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID NOT NULL,
  "thread_id" UUID NOT NULL,
  "direction" "MessageDirection" NOT NULL,
  "status" "MessageStatus" NOT NULL,
  "provider_message_id" VARCHAR(120),
  "body" VARCHAR(4096) NOT NULL,
  "error" VARCHAR(200),
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_messages_provider_message_id_key" UNIQUE ("provider_message_id"),
  CONSTRAINT "whatsapp_messages_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "whatsapp_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "whatsapp_messages_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "whatsapp_messages_thread_created_idx"
  ON "whatsapp_messages" ("thread_id", "created_at" DESC);

CREATE TABLE "agent_drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID NOT NULL,
  "thread_id" UUID,
  "status" "AgentDraftStatus" NOT NULL DEFAULT 'pending',
  "goal" VARCHAR(500) NOT NULL,
  "context" JSONB NOT NULL,
  "draft_body" VARCHAR(2000) NOT NULL,
  "model" VARCHAR(64) NOT NULL,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_drafts_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_drafts_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "whatsapp_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "agent_drafts_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "agent_drafts_merchant_created_idx"
  ON "agent_drafts" ("merchant_id", "created_at" DESC);
