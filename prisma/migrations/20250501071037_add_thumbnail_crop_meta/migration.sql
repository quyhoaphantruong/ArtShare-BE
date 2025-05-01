/*
  Warnings:

  - You are about to drop the column `embeddedVideos` on the `blog` table. All the data in the column will be lost.
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
ALTER TABLE "blog" DROP COLUMN "embeddedVideos",
ADD COLUMN     "embedded_videos" TEXT[];

-- AlterTable
ALTER TABLE "comment" DROP COLUMN "target_id",
DROP COLUMN "target_type",
ADD COLUMN     "blog_id" INTEGER,
ADD COLUMN     "post_id" INTEGER;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "thumbnail_crop_meta" JSONB;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "followers_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followings_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail_url" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CollectionToPost" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CollectionToPost_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Collection_user_id_idx" ON "Collection"("user_id");

-- CreateIndex
CREATE INDEX "_CollectionToPost_B_index" ON "_CollectionToPost"("B");

-- CreateIndex
CREATE INDEX "comment_blog_id_idx" ON "comment"("blog_id");

-- CreateIndex
CREATE INDEX "comment_post_id_idx" ON "comment"("post_id");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToPost" ADD CONSTRAINT "_CollectionToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToPost" ADD CONSTRAINT "_CollectionToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
