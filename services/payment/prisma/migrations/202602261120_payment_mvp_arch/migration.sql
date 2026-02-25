CREATE TYPE "PaymentMvpStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE "PaymentMvp" (
  "id" TEXT PRIMARY KEY,
  "ride_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "status" "PaymentMvpStatus" NOT NULL DEFAULT 'pending',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "provider_payment_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PaymentMvpEvent" (
  "id" TEXT PRIMARY KEY,
  "payment_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PaymentMvp_ride_id_created_at_idx" ON "PaymentMvp"("ride_id", "created_at");
CREATE INDEX "PaymentMvp_status_created_at_idx" ON "PaymentMvp"("status", "created_at");
CREATE INDEX "PaymentMvpEvent_payment_id_created_at_idx" ON "PaymentMvpEvent"("payment_id", "created_at");

ALTER TABLE "PaymentMvpEvent"
  ADD CONSTRAINT "PaymentMvpEvent_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "PaymentMvp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
