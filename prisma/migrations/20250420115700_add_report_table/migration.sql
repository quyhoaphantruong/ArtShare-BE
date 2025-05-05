-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'BLOG', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateTable
CREATE TABLE "report" (
    "id" SERIAL NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_id" INTEGER NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_reporter_id_idx" ON "report"("reporter_id");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "report_target_id_target_type_idx" ON "report"("target_id", "target_type");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
