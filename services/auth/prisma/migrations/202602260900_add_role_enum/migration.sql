CREATE TYPE "RoleName" AS ENUM ('passenger', 'driver', 'admin', 'sos');

ALTER TABLE "Role"
  ALTER COLUMN "name" TYPE "RoleName"
  USING "name"::"RoleName";
