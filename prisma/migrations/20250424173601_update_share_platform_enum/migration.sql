/*
  Warnings:

  - The values [TWITTER,LINKEDIN] on the enum `SharePlatform` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SharePlatform_new" AS ENUM ('FACEBOOK', 'GOOGLE');
ALTER TABLE "share" ALTER COLUMN "share_platform" TYPE "SharePlatform_new" USING ("share_platform"::text::"SharePlatform_new");
ALTER TYPE "SharePlatform" RENAME TO "SharePlatform_old";
ALTER TYPE "SharePlatform_new" RENAME TO "SharePlatform";
DROP TYPE "SharePlatform_old";
COMMIT;
