-- AlterTable
ALTER TABLE "post" ADD COLUMN     "is_mature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "post" ADD COLUMN     "ai_created" BOOLEAN NOT NULL DEFAULT false;
