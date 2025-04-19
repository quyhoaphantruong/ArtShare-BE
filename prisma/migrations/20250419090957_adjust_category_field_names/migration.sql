/*
  Warnings:

  - You are about to drop the column `cate_type` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "category" DROP COLUMN "cate_type",
DROP COLUMN "url",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "example_images" TEXT[],
ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'ATTRIBUTE';
