ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "payload_json" JSONB NOT NULL DEFAULT '{}'::jsonb;
