/*
  Warnings:

  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `plans` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `planId` on the `user_access` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "user_access" DROP CONSTRAINT "user_access_planId_fkey";

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
ADD COLUMN     "dailyQuotaCredits" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" "PaidAccessLevel" NOT NULL,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_access" DROP COLUMN "planId",
ADD COLUMN     "planId" "PaidAccessLevel" NOT NULL;

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
