CREATE TYPE "RidePaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded');

ALTER TABLE "Ride"
  ADD COLUMN "payment_status" "RidePaymentStatus" NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "paid_at" TIMESTAMP(3);
