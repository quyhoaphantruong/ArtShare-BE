-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'DISMISSED';

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "target_url" TEXT;
