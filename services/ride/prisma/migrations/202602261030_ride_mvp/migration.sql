CREATE TYPE "RideStatus" AS ENUM ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled');

CREATE TABLE "Ride" (
  "id" TEXT PRIMARY KEY,
  "passenger_user_id" TEXT NOT NULL,
  "assigned_driver_id" TEXT,
  "status" "RideStatus" NOT NULL DEFAULT 'requested',
  "origin_lat" DOUBLE PRECISION NOT NULL,
  "origin_lng" DOUBLE PRECISION NOT NULL,
  "destination_lat" DOUBLE PRECISION NOT NULL,
  "destination_lng" DOUBLE PRECISION NOT NULL,
  "fare_estimated" DOUBLE PRECISION NOT NULL,
  "fare_final" DOUBLE PRECISION,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "arrived_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "RideLifecycleEvent" (
  "id" TEXT PRIMARY KEY,
  "ride_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Ride_passenger_user_id_created_at_idx" ON "Ride"("passenger_user_id", "created_at");
CREATE INDEX "Ride_assigned_driver_id_created_at_idx" ON "Ride"("assigned_driver_id", "created_at");
CREATE INDEX "Ride_status_created_at_idx" ON "Ride"("status", "created_at");
CREATE INDEX "RideLifecycleEvent_ride_id_created_at_idx" ON "RideLifecycleEvent"("ride_id", "created_at");

ALTER TABLE "RideLifecycleEvent"
  ADD CONSTRAINT "RideLifecycleEvent_ride_id_fkey"
  FOREIGN KEY ("ride_id") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
