-- AlterTable
ALTER TABLE "user" ADD COLUMN     "followers_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followings_count" INTEGER NOT NULL DEFAULT 0;
