CREATE TYPE "GeoZoneType" AS ENUM ('SAFE','CAUTION','RED');
CREATE TYPE "SafetyAlertType" AS ENUM ('ENTERED_RED_ZONE','ENTERED_CAUTION_ZONE','ROUTE_DEVIATION_MAJOR','ROUTE_DEVIATION_MINOR','TRACKING_LOST','OTP_FAILED_MULTIPLE','DRIVER_CANCEL_PATTERN','PASSENGER_CANCEL_PATTERN','MANUAL_SOS_TRIGGER');
CREATE TYPE "SafetyAlertStatus" AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED');
CREATE TYPE "DeviationLevel" AS ENUM ('NONE','MINOR','MAJOR');

CREATE TABLE "GeoZone" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" "GeoZoneType" NOT NULL,
  "polygon_json" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TripRouteBaseline" (
  "trip_id" TEXT PRIMARY KEY,
  "polyline_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TripSafetyState" (
  "trip_id" TEXT PRIMARY KEY,
  "safety_score" INTEGER NOT NULL DEFAULT 100,
  "last_driver_location_at" TIMESTAMP(3),
  "last_zone_type" "GeoZoneType",
  "deviation_level" "DeviationLevel" NOT NULL DEFAULT 'NONE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "SafetyAlert" (
  "id" TEXT PRIMARY KEY,
  "trip_id" TEXT NOT NULL,
  "type" "SafetyAlertType" NOT NULL,
  "status" "SafetyAlertStatus" NOT NULL DEFAULT 'OPEN',
  "severity" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged_at" TIMESTAMP(3),
  "acknowledged_by_user_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_user_id" TEXT
);

CREATE INDEX "GeoZone_type_is_active_idx" ON "GeoZone" ("type","is_active");
CREATE INDEX "SafetyAlert_status_created_at_idx" ON "SafetyAlert" ("status","created_at");

ALTER TABLE "TripRouteBaseline" ADD CONSTRAINT "TripRouteBaseline_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
ALTER TABLE "TripSafetyState" ADD CONSTRAINT "TripSafetyState_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE;
