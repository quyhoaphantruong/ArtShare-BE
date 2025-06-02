-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'POSTED', 'CANCELLED', 'ERROR');

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduleAt" TIMESTAMP(3) NOT NULL,
    "facebookPageId" TEXT NOT NULL,
    "facebookAccessToken" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "n8nTriggeredAt" TIMESTAMP(3),
    "n8nExecutionId" TEXT,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);
