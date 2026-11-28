-- Authentication hardening (Day 2).
-- Adds the record needed for login throttling and makes owner emails unique
-- across the platform (one person, one owner account).

CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "ip" VARCHAR(45),
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_email_created_at_idx"
  ON "login_attempts"("email", "created_at" DESC);

CREATE INDEX "login_attempts_created_at_idx"
  ON "login_attempts"("created_at");

-- Emails are stored lowercase on users (users_email_lowercase).
CREATE UNIQUE INDEX "users_owner_email_key"
  ON "users" ("email")
  WHERE "role" = 'owner' AND "deleted_at" IS NULL;

COMMENT ON TABLE "login_attempts" IS 'Short-lived throttling records; prunable after 24 hours.';
