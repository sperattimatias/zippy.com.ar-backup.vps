ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'REFUND_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'COMMISSION_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'DRIVER_NET_REVERSAL';

DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('CREATED', 'PROCESSING', 'APPROVED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TripPayment" ADD COLUMN IF NOT EXISTS "refunded_amount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "TripRefund" (
  "id" TEXT NOT NULL,
  "trip_payment_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'CREATED',
  "mp_refund_id" TEXT,
  "idempotency_key" TEXT,
  "payload_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TripRefund_trip_payment_id_created_at_idx" ON "TripRefund"("trip_payment_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "TripRefund_mp_refund_id_key" ON "TripRefund"("mp_refund_id");
CREATE UNIQUE INDEX IF NOT EXISTS "TripRefund_idempotency_key_key" ON "TripRefund"("idempotency_key");

CREATE TABLE IF NOT EXISTS "BonusAdjustmentPending" (
  "id" TEXT NOT NULL,
  "driver_user_id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusAdjustmentPending_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BonusAdjustmentPending_driver_user_id_year_month_idx" ON "BonusAdjustmentPending"("driver_user_id", "year", "month");

DO $$ BEGIN
  ALTER TABLE "TripRefund" ADD CONSTRAINT "TripRefund_trip_payment_id_fkey" FOREIGN KEY ("trip_payment_id") REFERENCES "TripPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
