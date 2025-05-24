-- AlterTable
ALTER TABLE "report" ADD COLUMN     "moderator_id" TEXT,
ADD COLUMN     "resolution_comment" TEXT,
ADD COLUMN     "resolved_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
