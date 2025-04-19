/*
  Warnings:

  - You are about to drop the column `target_id` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `target_type` on the `comment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_blog_fkey";

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_post_fkey";

-- DropIndex
DROP INDEX "comment_target_id_target_type_idx";

-- AlterTable
ALTER TABLE "comment" DROP COLUMN "target_id",
DROP COLUMN "target_type",
ADD COLUMN     "blog_id" INTEGER,
ADD COLUMN     "post_id" INTEGER;

-- CreateIndex
CREATE INDEX "comment_post_id_idx" ON "comment"("post_id");

-- CreateIndex
CREATE INDEX "comment_blog_id_idx" ON "comment"("blog_id");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
