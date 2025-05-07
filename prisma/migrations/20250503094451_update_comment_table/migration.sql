/*
  Warnings:

  - Added the required column `target_id` to the `comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target_type` to the `comment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "target_id" INTEGER NOT NULL,
ADD COLUMN     "target_type" "TargetType" NOT NULL;

-- CreateIndex
CREATE INDEX "comment_target_id_target_type_idx" ON "comment"("target_id", "target_type");
