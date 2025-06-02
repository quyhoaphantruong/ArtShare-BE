/*
  Warnings:

  - The `status` column on the `ScheduledPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AutoPostStatus" AS ENUM ('PENDING', 'POSTED', 'CANCELLED', 'ERROR', 'PROCESSING');

-- AlterTable
ALTER TABLE "ScheduledPost" DROP COLUMN "status",
ADD COLUMN     "status" "AutoPostStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "PostStatus";
