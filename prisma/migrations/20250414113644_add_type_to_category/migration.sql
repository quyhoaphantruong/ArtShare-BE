/*
  Warnings:

  - Made the column `url` on table `category` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('MEDIUM', 'ATTRIBUTE');

-- DropIndex
DROP INDEX "category_url_key";

-- AlterTable
ALTER TABLE "category" ADD COLUMN     "cate_type" "CategoryType" NOT NULL DEFAULT 'ATTRIBUTE',
ALTER COLUMN "url" SET NOT NULL;
