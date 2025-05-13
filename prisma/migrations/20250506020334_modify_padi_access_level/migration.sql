/*
  Warnings:

  - The values [pro_artists,studios] on the enum `PaidAccessLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaidAccessLevel_new" AS ENUM ('free', 'artist_pro', 'studio', 'enterprise');
ALTER TYPE "PaidAccessLevel" RENAME TO "PaidAccessLevel_old";
ALTER TYPE "PaidAccessLevel_new" RENAME TO "PaidAccessLevel";
DROP TYPE "PaidAccessLevel_old";
COMMIT;
