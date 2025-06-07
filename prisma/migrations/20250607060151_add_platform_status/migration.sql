-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "platform" ADD COLUMN     "status" "PlatformStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "token_expires_at" TIMESTAMP(3);
