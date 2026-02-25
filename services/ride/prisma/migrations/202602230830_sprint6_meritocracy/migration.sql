CREATE TYPE "PremiumZoneType" AS ENUM ('PREMIUM','EVENT','TERMINAL','HIGH_DEMAND');
CREATE TYPE "BadgeTier" AS ENUM ('EXCELLENT','TRUSTED','WATCHLIST','RESTRICTED');
ALTER TYPE "ScoreEventType" ADD VALUE 'TRIP_RECOVERY_BONUS';

CREATE TABLE "AppConfig" (
  "key" TEXT PRIMARY KEY,
  "value_json" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PremiumZone" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" "PremiumZoneType" NOT NULL,
  "polygon_json" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "min_driver_score" INTEGER NOT NULL DEFAULT 75,
  "min_passenger_score" INTEGER NOT NULL DEFAULT 60,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "UserBadge" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "tier" "BadgeTier" NOT NULL,
  "label" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PeakGateEvent" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "allowed" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserBadge_user_id_actor_type_key" ON "UserBadge" ("user_id","actor_type");
CREATE INDEX "PremiumZone_type_is_active_idx" ON "PremiumZone" ("type","is_active");
CREATE INDEX "PeakGateEvent_user_id_created_at_idx" ON "PeakGateEvent" ("user_id","created_at");

INSERT INTO "AppConfig" ("key", "value_json", "updated_at") VALUES
('score_thresholds', '{"badge": {"excellent": 90, "trusted": 75, "watchlist": 60}, "status": {"none": 80, "warning": 60, "limited": 40}}'::jsonb, CURRENT_TIMESTAMP),
('peak_hours', '{"timezone":"America/Argentina/Cordoba","windows":[{"days":[1,2,3,4,5],"start":"07:00","end":"09:00"},{"days":[1,2,3,4,5],"start":"12:00","end":"14:00"},{"days":[0,1,2,3,4,5,6],"start":"18:00","end":"22:30"},{"days":[5,6],"start":"23:00","end":"04:00"}],"driver_min_score":50,"passenger_min_score":45}'::jsonb, CURRENT_TIMESTAMP),
('premium_zones', '{"deny_low_passenger":false,"deny_low_driver":false}'::jsonb, CURRENT_TIMESTAMP),
('matching_weights', '{"w_score":0.45,"w_distance":0.35,"w_reliability":0.15,"w_status":0.05,"w_peak":0.10,"w_zone":0.10,"top_n":15,"expand_to":30,"expand_after_s":15}'::jsonb, CURRENT_TIMESTAMP),
('recovery_rules', '{"limited_clean_trips":5,"limited_bonus":5,"blocked_clean_trips":3,"daily_cap":6}'::jsonb, CURRENT_TIMESTAMP);
