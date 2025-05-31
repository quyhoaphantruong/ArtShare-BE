/*
  Warnings:

  - Made the column `expires_at` on table `user_access` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user_access" ALTER COLUMN "expires_at" SET NOT NULL;
