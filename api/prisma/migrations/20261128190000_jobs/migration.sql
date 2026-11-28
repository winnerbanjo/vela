-- Vela jobs (Day 5).
-- A verified deposit on an accepted quote creates a job. One job per quote
-- version, one intake submission per job, and a digest-only portal token the
-- client uses to view the job and fill in intake.

CREATE TYPE "JobStatus" AS ENUM ('intake_pending', 'in_progress', 'delivered', 'cancelled');

CREATE TABLE "intake_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "intake_templates" ADD CONSTRAINT "intake_templates_questions_array"
    CHECK (jsonb_typeof("questions") = 'array');

CREATE INDEX "intake_templates_merchant_idx"
    ON "intake_templates" ("merchant_id", "updated_at" DESC);

ALTER TABLE "intake_templates" ADD CONSTRAINT "intake_templates_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "quote_version_id" UUID NOT NULL,
    "invoice_id" UUID,
    "intake_template_id" UUID,
    "title" VARCHAR(160) NOT NULL,
    "client_name" VARCHAR(120) NOT NULL,
    "client_email" VARCHAR(320),
    "client_phone" VARCHAR(32),
    "event_date" DATE,
    "status" "JobStatus" NOT NULL DEFAULT 'intake_pending',
    "portal_token_hash" CHAR(64),
    "portal_token_issued_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_delivered_shape"
    CHECK (("status" = 'delivered') = ("delivered_at" IS NOT NULL));
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cancelled_shape"
    CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL));
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_portal_token_shape"
    CHECK (("portal_token_hash" IS NULL) = ("portal_token_issued_at" IS NULL));

CREATE UNIQUE INDEX "jobs_quote_version_id_key" ON "jobs" ("quote_version_id");
CREATE UNIQUE INDEX "jobs_invoice_id_key" ON "jobs" ("invoice_id");
CREATE UNIQUE INDEX "jobs_portal_token_hash_key" ON "jobs" ("portal_token_hash");
CREATE INDEX "jobs_merchant_created_idx" ON "jobs" ("merchant_id", "created_at" DESC);
CREATE INDEX "jobs_status_idx" ON "jobs" ("status");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_version_id_fkey"
    FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_intake_template_id_fkey"
    FOREIGN KEY ("intake_template_id") REFERENCES "intake_templates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "intake_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "template_id" UUID,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_submissions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_answers_object"
    CHECK (jsonb_typeof("answers") = 'object');

CREATE UNIQUE INDEX "intake_submissions_job_id_key" ON "intake_submissions" ("job_id");

ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "intake_templates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
