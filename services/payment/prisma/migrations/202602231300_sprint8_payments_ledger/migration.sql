CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');
CREATE TYPE "SettlementStatus" AS ENUM ('NOT_SETTLED', 'SETTLED', 'FAILED');
CREATE TYPE "LedgerEntryType" AS ENUM ('TRIP_REVENUE', 'PLATFORM_COMMISSION', 'DRIVER_EARNING', 'BONUS_DISCOUNT', 'REFUND');
CREATE TYPE "LedgerActor" AS ENUM ('DRIVER', 'PLATFORM');

CREATE TABLE "TripPayment" (
  "id" TEXT PRIMARY KEY,
  "trip_id" TEXT NOT NULL UNIQUE,
  "passenger_user_id" TEXT NOT NULL,
  "driver_user_id" TEXT NOT NULL,
  "amount_total" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "commission_bps_applied" INTEGER NOT NULL,
  "commission_amount" INTEGER NOT NULL,
  "driver_net_amount" INTEGER NOT NULL,
  "mp_payment_id" TEXT,
  "mp_preference_id" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "settlement_status" "SettlementStatus" NOT NULL DEFAULT 'NOT_SETTLED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TripPayment_driver_user_id_created_at_idx" ON "TripPayment"("driver_user_id", "created_at");

CREATE TABLE "LedgerEntry" (
  "id" TEXT PRIMARY KEY,
  "actor_type" "LedgerActor" NOT NULL,
  "actor_user_id" TEXT,
  "trip_id" TEXT,
  "type" "LedgerEntryType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LedgerEntry_actor_type_actor_user_id_created_at_idx" ON "LedgerEntry"("actor_type", "actor_user_id", "created_at");

CREATE TABLE "DriverPayoutSummary" (
  "driver_user_id" TEXT PRIMARY KEY,
  "total_gross" BIGINT NOT NULL DEFAULT 0,
  "total_commission" BIGINT NOT NULL DEFAULT 0,
  "total_bonus_discount" BIGINT NOT NULL DEFAULT 0,
  "total_net" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
