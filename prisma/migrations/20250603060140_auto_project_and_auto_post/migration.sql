-- CreateEnum
CREATE TYPE "AutoProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutoPostStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "platform" (
    "id" SERIAL NOT NULL,
    "name" "SharePlatform" NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_project" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AutoProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform_name" "SharePlatform" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "auto_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_post" (
    "id" SERIAL NOT NULL,
    "auto_project_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "image_urls" TEXT[],
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "AutoPostStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "auto_post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_name_key" ON "platform"("name");

-- AddForeignKey
ALTER TABLE "auto_project" ADD CONSTRAINT "auto_project_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_project" ADD CONSTRAINT "auto_project_platform_name_fkey" FOREIGN KEY ("platform_name") REFERENCES "platform"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_post" ADD CONSTRAINT "auto_post_auto_project_id_fkey" FOREIGN KEY ("auto_project_id") REFERENCES "auto_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
