/*
  Warnings:

  - You are about to drop the column `facebookAccessToken` on the `ScheduledPost` table. All the data in the column will be lost.
  - Added the required column `encryptedFacebookAccessToken` to the `ScheduledPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScheduledPost" DROP COLUMN "facebookAccessToken",
ADD COLUMN     "encryptedFacebookAccessToken" TEXT NOT NULL;
