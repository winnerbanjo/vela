-- The booking is only created after the provider confirms payment, so the
-- customer's details must survive from initialize to webhook. They are stored
-- with the payment rather than in a separate draft table.
ALTER TABLE "payments" ADD COLUMN "metadata" JSONB;
