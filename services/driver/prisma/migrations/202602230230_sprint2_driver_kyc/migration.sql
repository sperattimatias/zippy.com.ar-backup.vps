CREATE TYPE "DriverProfileStatus" AS ENUM ('PENDING_DOCS', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "DriverDocumentType" AS ENUM ('SELFIE', 'DNI_FRONT', 'DNI_BACK', 'LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION');
CREATE TYPE "DriverEventType" AS ENUM ('DRIVER_REQUESTED', 'DOC_UPLOADED', 'STATUS_CHANGED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'NOTE_ADDED');
CREATE TYPE "VehicleCategory" AS ENUM ('MOTO', 'AUTO');

CREATE TABLE "DriverProfile" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "status" "DriverProfileStatus" NOT NULL DEFAULT 'PENDING_DOCS',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "approved_at" TIMESTAMP(3),
  "approved_by_user_id" TEXT,
  "rejected_at" TIMESTAMP(3),
  "rejected_by_user_id" TEXT,
  "rejection_reason" TEXT,
  "notes" TEXT
);

CREATE TABLE "DriverDocument" (
  "id" TEXT PRIMARY KEY,
  "driver_profile_id" TEXT NOT NULL,
  "type" "DriverDocumentType" NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DriverEvent" (
  "id" TEXT PRIMARY KEY,
  "driver_profile_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "type" "DriverEventType" NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Vehicle" (
  "id" TEXT PRIMARY KEY,
  "driver_profile_id" TEXT NOT NULL UNIQUE,
  "category" "VehicleCategory" NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "plate" TEXT,
  "color" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "DriverDocument_driver_profile_id_type_idx" ON "DriverDocument" ("driver_profile_id", "type");
CREATE INDEX "DriverEvent_driver_profile_id_created_at_idx" ON "DriverEvent" ("driver_profile_id", "created_at");

ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "DriverProfile"("id") ON DELETE CASCADE;
ALTER TABLE "DriverEvent" ADD CONSTRAINT "DriverEvent_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "DriverProfile"("id") ON DELETE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "DriverProfile"("id") ON DELETE CASCADE;
