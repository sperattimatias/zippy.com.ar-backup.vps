CREATE TYPE "TripStatus" AS ENUM ('DRAFT','REQUESTED','BIDDING','MATCHED','DRIVER_EN_ROUTE','ARRIVED','OTP_PENDING','IN_PROGRESS','COMPLETED','CANCELLED_BY_PASSENGER','CANCELLED_BY_DRIVER','EXPIRED_NO_DRIVER');
CREATE TYPE "CancelReason" AS ENUM ('PASSENGER_CHANGED_MIND','DRIVER_NO_SHOW','PASSENGER_NO_SHOW','PRICE_DISAGREE','SAFETY','OTHER');
CREATE TYPE "TripBidStatus" AS ENUM ('PENDING','WITHDRAWN','ACCEPTED','REJECTED','AUTO_SELECTED');
CREATE TYPE "VehicleCategory" AS ENUM ('MOTO','AUTO');
CREATE TYPE "TripActor" AS ENUM ('DRIVER','PASSENGER');

CREATE TABLE "Trip" (
  "id" TEXT PRIMARY KEY,
  "passenger_user_id" TEXT NOT NULL,
  "driver_user_id" TEXT,
  "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
  "origin_lat" DOUBLE PRECISION NOT NULL,
  "origin_lng" DOUBLE PRECISION NOT NULL,
  "origin_address" TEXT NOT NULL,
  "dest_lat" DOUBLE PRECISION NOT NULL,
  "dest_lng" DOUBLE PRECISION NOT NULL,
  "dest_address" TEXT NOT NULL,
  "distance_km" DOUBLE PRECISION,
  "eta_minutes" INTEGER,
  "price_base" INTEGER NOT NULL,
  "price_final" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "bidding_expires_at" TIMESTAMP(3),
  "matched_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "cancel_reason" "CancelReason",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TripBid" (
  "id" TEXT PRIMARY KEY,
  "trip_id" TEXT NOT NULL,
  "driver_user_id" TEXT NOT NULL,
  "price_offer" INTEGER NOT NULL,
  "eta_to_pickup_minutes" INTEGER,
  "status" "TripBidStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DriverPresence" (
  "driver_user_id" TEXT PRIMARY KEY,
  "is_online" BOOLEAN NOT NULL DEFAULT false,
  "last_lat" DOUBLE PRECISION,
  "last_lng" DOUBLE PRECISION,
  "last_seen_at" TIMESTAMP(3),
  "vehicle_category" "VehicleCategory" NOT NULL
);

CREATE TABLE "TripLocation" (
  "id" TEXT PRIMARY KEY,
  "trip_id" TEXT NOT NULL,
  "actor" "TripActor" NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "speed" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TripEvent" (
  "id" TEXT PRIMARY KEY,
  "trip_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "type" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TripOTP" (
  "trip_id" TEXT PRIMARY KEY,
  "otp_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified_at" TIMESTAMP(3)
);

CREATE INDEX "Trip_passenger_user_id_created_at_idx" ON "Trip" ("passenger_user_id","created_at");
CREATE INDEX "Trip_driver_user_id_created_at_idx" ON "Trip" ("driver_user_id","created_at");
CREATE INDEX "Trip_status_bidding_expires_at_idx" ON "Trip" ("status","bidding_expires_at");
CREATE INDEX "TripBid_trip_id_idx" ON "TripBid" ("trip_id");
CREATE INDEX "TripBid_driver_user_id_idx" ON "TripBid" ("driver_user_id");
CREATE INDEX "TripBid_trip_id_price_offer_idx" ON "TripBid" ("trip_id","price_offer");
CREATE INDEX "DriverPresence_is_online_last_seen_at_idx" ON "DriverPresence" ("is_online","last_seen_at");
CREATE INDEX "TripLocation_trip_id_created_at_idx" ON "TripLocation" ("trip_id","created_at");
CREATE INDEX "TripEvent_trip_id_created_at_idx" ON "TripEvent" ("trip_id","created_at");

ALTER TABLE "TripBid" ADD CONSTRAINT "TripBid_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
ALTER TABLE "TripLocation" ADD CONSTRAINT "TripLocation_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
ALTER TABLE "TripOTP" ADD CONSTRAINT "TripOTP_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
