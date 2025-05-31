/*
  Warnings:

  - The values [REVIEWED] on the enum `ReportStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReportStatus_new" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
ALTER TABLE "report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "report" ALTER COLUMN "status" TYPE "ReportStatus_new" USING ("status"::text::"ReportStatus_new");
ALTER TYPE "ReportStatus" RENAME TO "ReportStatus_old";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
DROP TYPE "ReportStatus_old";
ALTER TABLE "report" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
