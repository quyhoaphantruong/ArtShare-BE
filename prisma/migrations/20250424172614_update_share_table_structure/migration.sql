/*
  Warnings:

  - You are about to drop the column `target_id` on the `share` table. All the data in the column will be lost.
  - You are about to drop the column `target_type` on the `share` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,post_id]` on the table `share` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,blog_id]` on the table `share` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "share" DROP CONSTRAINT "share_blog_fkey";

-- DropForeignKey
ALTER TABLE "share" DROP CONSTRAINT "share_post_fkey";

-- DropIndex
DROP INDEX "share_target_id_target_type_idx";

-- AlterTable
ALTER TABLE "share" DROP COLUMN "target_id",
DROP COLUMN "target_type",
ADD COLUMN     "blog_id" INTEGER,
ADD COLUMN     "post_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_post_share" ON "share"("user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_blog_share" ON "share"("user_id", "blog_id");

-- AddForeignKey
ALTER TABLE "share" ADD CONSTRAINT "share_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share" ADD CONSTRAINT "share_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
