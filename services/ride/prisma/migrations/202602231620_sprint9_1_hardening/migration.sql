ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'RISK_DECAY';
ALTER TABLE "FraudCase" ADD COLUMN IF NOT EXISTS "last_signal_at" TIMESTAMP(3);

INSERT INTO "AppConfig" ("key","value_json","updated_at")
VALUES ('fraud_thresholds', '{"repeated_pair_24h":4,"repeated_pair_7d":12,"passenger_trips_per_hour":6,"passenger_payments_per_hour":4,"driver_trips_per_hour":8,"shared_ip_users_24h":6,"shared_device_users_24h":3,"low_distance_km":1.0,"repeated_pair_requires_low_distance":true,"repeated_pair_low_distance_km":2.0,"repeated_pair_same_origin_radius_m":250,"repeated_pair_same_dest_radius_m":250,"repeated_pair_min_trips_for_pattern":6,"signal_dedupe_window_minutes":30,"low_case_autoclose_days":14,"risk_decay_points_per_30d":5,"shared_ip_severity_max":"LOW"}', NOW())
ON CONFLICT ("key") DO UPDATE SET "value_json" = EXCLUDED."value_json", "updated_at" = NOW();
