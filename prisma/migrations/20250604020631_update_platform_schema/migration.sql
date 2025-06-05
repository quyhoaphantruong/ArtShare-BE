/*
  Warnings:

  - You are about to drop the column `platform_name` on the `auto_project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,name,external_page_id]` on the table `platform` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `platform_id` to the `auto_project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `external_page_id` to the `platform` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "auto_project" DROP CONSTRAINT "auto_project_platform_name_fkey";

-- DropIndex
DROP INDEX "platform_name_key";

-- AlterTable
ALTER TABLE "auto_project" DROP COLUMN "platform_name",
ADD COLUMN     "platform_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "platform" ADD COLUMN     "external_page_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "platform_user_id_name_external_page_id_key" ON "platform"("user_id", "name", "external_page_id");

-- AddForeignKey
ALTER TABLE "auto_project" ADD CONSTRAINT "auto_project_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
