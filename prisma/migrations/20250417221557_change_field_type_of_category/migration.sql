/*
  Warnings:

  - You are about to drop the column `url` on the `category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "category" DROP COLUMN "url",
ADD COLUMN     "urls" TEXT[];
