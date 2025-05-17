-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "commentLikeComment_id" INTEGER,
ADD COLUMN     "commentLikeUser_id" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "is_onboard" BOOLEAN NOT NULL DEFAULT false;
