CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "email_verified_at" TIMESTAMP(3),
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Role" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "UserRole" (
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RefreshToken" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "replaced_by_token_id" TEXT,
  "user_agent" TEXT,
  "ip" TEXT
);

CREATE INDEX "EmailVerificationCode_user_id_expires_at_idx" ON "EmailVerificationCode" ("user_id", "expires_at");
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken" ("user_id");
CREATE INDEX "RefreshToken_token_hash_idx" ON "RefreshToken" ("token_hash");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE;
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "RefreshToken"("id") ON DELETE SET NULL;
