/*
  Warnings:

  - You are about to drop the column `commentLikeComment_id` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `commentLikeUser_id` on the `comment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "comment" DROP COLUMN "commentLikeComment_id",
DROP COLUMN "commentLikeUser_id";
