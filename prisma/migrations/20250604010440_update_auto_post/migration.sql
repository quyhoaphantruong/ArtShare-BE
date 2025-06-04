/*
  Warnings:

  - Made the column `updated_at` on table `auto_post` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "AutoPostStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "auto_post" ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "n8n_execution_id" TEXT,
ADD COLUMN     "n8n_triggered_at" TIMESTAMP(3),
ADD COLUMN     "platform_post_id" TEXT,
ADD COLUMN     "posted_at" TIMESTAMP(3),
ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" SET NOT NULL;
