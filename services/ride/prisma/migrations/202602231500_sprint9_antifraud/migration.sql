CREATE TYPE "FraudSignalType" AS ENUM (
  'REPEATED_PAIR_TRIPS','HIGH_VELOCITY_TRIPS','HIGH_VELOCITY_PAYMENTS','SHARED_IP_MULTIPLE_USERS','SHARED_DEVICE_FINGERPRINT','MULTIPLE_ACCOUNTS_SAME_DRIVER','EXCESSIVE_REFUNDS','PAYMENT_REJECT_RATE_HIGH','SUSPICIOUS_ROUTE_PATTERN','MANUAL_REVIEW_TRIGGER'
);
CREATE TYPE "FraudSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "FraudCaseStatus" AS ENUM ('OPEN','IN_REVIEW','RESOLVED','DISMISSED');
CREATE TYPE "HoldType" AS ENUM ('PAYOUT_HOLD','FEATURE_LIMIT','ACCOUNT_BLOCK');
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE','RELEASED','EXPIRED');

CREATE TABLE "ClientFingerprint" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "ip_hash" TEXT NOT NULL,
  "user_agent_hash" TEXT NOT NULL,
  "device_fingerprint_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ClientFingerprint_ip_hash_created_at_idx" ON "ClientFingerprint"("ip_hash","created_at");
CREATE INDEX "ClientFingerprint_device_fingerprint_hash_created_at_idx" ON "ClientFingerprint"("device_fingerprint_hash","created_at");

CREATE TABLE "FraudSignal" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT,
  "trip_id" TEXT,
  "payment_id" TEXT,
  "type" "FraudSignalType" NOT NULL,
  "severity" "FraudSeverity" NOT NULL,
  "score_delta" INTEGER NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FraudSignal_type_created_at_idx" ON "FraudSignal"("type","created_at");
CREATE INDEX "FraudSignal_user_id_created_at_idx" ON "FraudSignal"("user_id","created_at");

CREATE TABLE "FraudCase" (
  "id" TEXT PRIMARY KEY,
  "primary_user_id" TEXT,
  "status" "FraudCaseStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "FraudSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "related_trip_ids" JSONB,
  "related_user_ids" JSONB,
  "related_payment_ids" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_to_user_id" TEXT
);
CREATE INDEX "FraudCase_status_severity_created_at_idx" ON "FraudCase"("status","severity","created_at");

CREATE TABLE "FraudCaseSignalLink" (
  "id" TEXT PRIMARY KEY,
  "fraud_case_id" TEXT NOT NULL REFERENCES "FraudCase"("id") ON DELETE CASCADE,
  "fraud_signal_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("fraud_case_id","fraud_signal_id")
);

CREATE TABLE "FinancialRiskScore" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "score" INTEGER NOT NULL DEFAULT 0,
  "level" TEXT NOT NULL DEFAULT 'LOW',
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserHold" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "hold_type" "HoldType" NOT NULL,
  "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UserHold_user_id_status_idx" ON "UserHold"("user_id","status");

INSERT INTO "AppConfig" ("key","value_json","updated_at")
VALUES ('fraud_thresholds', '{"repeated_pair_24h":4,"repeated_pair_7d":12,"passenger_trips_per_hour":6,"passenger_payments_per_hour":4,"driver_trips_per_hour":8,"shared_ip_users_24h":6,"shared_device_users_24h":3,"low_distance_km":1.0}', NOW())
ON CONFLICT ("key") DO UPDATE SET "value_json" = EXCLUDED."value_json", "updated_at" = NOW();
