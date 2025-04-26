/*
  Warnings:

  - The primary key for the `like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `target_id` on the `like` table. All the data in the column will be lost.
  - You are about to drop the column `target_type` on the `like` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,post_id]` on the table `like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,blog_id]` on the table `like` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "like" DROP CONSTRAINT "like_blog_fkey";

-- DropForeignKey
ALTER TABLE "like" DROP CONSTRAINT "like_post_fkey";

-- DropIndex
DROP INDEX "like_target_id_target_type_idx";

-- AlterTable
ALTER TABLE "like" DROP CONSTRAINT "like_pkey",
DROP COLUMN "target_id",
DROP COLUMN "target_type",
ADD COLUMN     "blog_id" INTEGER,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "post_id" INTEGER,
ADD CONSTRAINT "like_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_post_like" ON "like"("user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_blog_like" ON "like"("user_id", "blog_id");

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
