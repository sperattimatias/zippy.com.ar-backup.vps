-- Sprint 7: Levels + Monthly bonus
CREATE TYPE "LevelTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');
CREATE TYPE "PeriodStatus" AS ENUM ('DRAFT', 'FINALIZED');
CREATE TYPE "BonusType" AS ENUM ('COMMISSION_DISCOUNT');
CREATE TYPE "BonusStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

CREATE TABLE "UserLevel" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "tier" "LevelTier" NOT NULL,
  "computed_at" TIMESTAMP(3) NOT NULL,
  "valid_until" TIMESTAMP(3),
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "UserLevel_user_id_actor_type_key" ON "UserLevel"("user_id","actor_type");

CREATE TABLE "UserLevelHistory" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "tier" "LevelTier" NOT NULL,
  "computed_at" TIMESTAMP(3) NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UserLevelHistory_user_id_created_at_idx" ON "UserLevelHistory"("user_id","created_at");

CREATE TABLE "MonthlyPerformance" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_type" "ActorType" NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "trips_completed" INTEGER NOT NULL DEFAULT 0,
  "trips_cancelled_late" INTEGER NOT NULL DEFAULT 0,
  "no_show_count" INTEGER NOT NULL DEFAULT 0,
  "avg_score" INTEGER NOT NULL DEFAULT 100,
  "safety_major_alerts" INTEGER NOT NULL DEFAULT 0,
  "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cancel_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "performance_index" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "PeriodStatus" NOT NULL DEFAULT 'FINALIZED',
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MonthlyPerformance_user_id_actor_type_year_month_key" ON "MonthlyPerformance"("user_id","actor_type","year","month");
CREATE INDEX "MonthlyPerformance_year_month_performance_index_idx" ON "MonthlyPerformance"("year","month","performance_index");

CREATE TABLE "MonthlyBonusLedger" (
  "id" TEXT PRIMARY KEY,
  "driver_user_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "bonus_type" "BonusType" NOT NULL,
  "discount_bps" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "BonusStatus" NOT NULL DEFAULT 'ACTIVE',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MonthlyBonusLedger_driver_user_id_year_month_key" ON "MonthlyBonusLedger"("driver_user_id","year","month");

CREATE TABLE "CommissionPolicy" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value_json" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "CommissionPolicy" ("id", "key", "value_json", "updated_at") VALUES
  (gen_random_uuid()::text, 'default_commission_bps', '1000', NOW()),
  (gen_random_uuid()::text, 'level_rules', '{"driver":{"bronze":{"score_gte":60},"silver":{"score_gte":75,"trips_completed_last30_gte":30,"cancel_rate_30d_lt":0.08},"gold":{"score_gte":85,"trips_completed_last30_gte":80,"cancel_rate_30d_lt":0.05,"safety_major_alerts_30d_eq":0},"diamond":{"score_gte":92,"trips_completed_last30_gte":150,"cancel_rate_30d_lt":0.03,"safety_major_alerts_30d_eq":0,"no_show_30d_eq":0}},"passenger":{"bronze":{"score_gte":60},"silver":{"score_gte":75,"trips_completed_last30_gte":20,"cancel_rate_30d_lt":0.10},"gold":{"score_gte":85,"trips_completed_last30_gte":50,"cancel_rate_30d_lt":0.06},"diamond":{"score_gte":92,"trips_completed_last60_gte":80,"cancel_rate_60d_lt":0.04}}}', NOW()),
  (gen_random_uuid()::text, 'bonus_rules', '{"top_10_discount_bps":300,"top_3_discount_bps":500,"top_1_discount_bps":800,"min_trips_completed":40,"require_no_show_eq":0,"require_safety_major_alerts_eq":0,"commission_floor_bps":200}', NOW());
