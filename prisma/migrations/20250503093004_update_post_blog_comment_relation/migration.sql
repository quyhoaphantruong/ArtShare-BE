/*
  Warnings:

  - You are about to drop the column `blog_id` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `post_id` on the `comment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_blog_id_fkey";

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_post_id_fkey";

-- DropIndex
DROP INDEX "comment_blog_id_idx";

-- DropIndex
DROP INDEX "comment_post_id_idx";

-- AlterTable
ALTER TABLE "comment" DROP COLUMN "blog_id",
DROP COLUMN "post_id";
