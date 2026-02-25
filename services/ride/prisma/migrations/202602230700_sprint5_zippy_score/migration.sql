CREATE TYPE "ActorType" AS ENUM ('DRIVER','PASSENGER');
CREATE TYPE "ScoreEventType" AS ENUM ('TRIP_COMPLETED_CLEAN','DRIVER_CANCEL_LATE','PASSENGER_CANCEL_LATE','DRIVER_NO_SHOW','PASSENGER_NO_SHOW','ENTERED_RED_ZONE','ROUTE_DEVIATION_MAJOR','ROUTE_DEVIATION_MINOR','TRACKING_LOST_MAJOR','OTP_FAILED_MULTIPLE','MANUAL_ADJUST');
CREATE TYPE "RestrictionStatus" AS ENUM ('NONE','WARNING','LIMITED','BLOCKED');
CREATE TYPE "RestrictionReason" AS ENUM ('LOW_SCORE_AUTO','SAFETY_PATTERN','FRAUD_PATTERN','MANUAL_ADMIN');

ALTER TABLE "DriverPresence" ADD COLUMN "is_limited" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UserScore" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 100,
  "status" "RestrictionStatus" NOT NULL DEFAULT 'NONE',
  "last_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ScoreEvent" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "type" "ScoreEventType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "trip_id" TEXT,
  "safety_alert_id" TEXT,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserRestriction" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "status" "RestrictionStatus" NOT NULL,
  "reason" "RestrictionReason" NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserScore_user_id_actor_type_key" ON "UserScore" ("user_id","actor_type");
CREATE INDEX "UserScore_actor_type_status_idx" ON "UserScore" ("actor_type","status");
CREATE INDEX "UserScore_score_idx" ON "UserScore" ("score");
CREATE INDEX "ScoreEvent_user_id_created_at_idx" ON "ScoreEvent" ("user_id","created_at");
CREATE INDEX "ScoreEvent_trip_id_idx" ON "ScoreEvent" ("trip_id");
CREATE INDEX "UserRestriction_user_id_ends_at_idx" ON "UserRestriction" ("user_id","ends_at");
CREATE INDEX "UserRestriction_status_idx" ON "UserRestriction" ("status");

ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_user_id_actor_type_fkey" FOREIGN KEY ("user_id", "actor_type") REFERENCES "UserScore"("user_id", "actor_type") ON DELETE CASCADE;
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_user_id_actor_type_fkey" FOREIGN KEY ("user_id", "actor_type") REFERENCES "UserScore"("user_id", "actor_type") ON DELETE CASCADE;
