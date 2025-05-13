/*
  Warnings:

  - You are about to drop the column `updated_at` on the `art_generation` table. All the data in the column will be lost.
  - You are about to drop the column `view_count` on the `post` table. All the data in the column will be lost.
  - You are about to drop the `_CollectionToPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CollectionToPost" DROP CONSTRAINT "_CollectionToPost_A_fkey";

-- DropForeignKey
ALTER TABLE "_CollectionToPost" DROP CONSTRAINT "_CollectionToPost_B_fkey";

-- AlterTable
ALTER TABLE "art_generation" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "post" DROP COLUMN "view_count",
ADD COLUMN     "collectionId" INTEGER;

-- DropTable
DROP TABLE "_CollectionToPost";

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
