/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaidAccessLevel" AS ENUM ('free', 'pro_artists', 'studios', 'enterprise');

-- CreateEnum
CREATE TYPE "ImageQuality" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "CommercialRightsLevel" AS ENUM ('none', 'standard', 'enhanced');

-- CreateEnum
CREATE TYPE "SupportLevel" AS ENUM ('community', 'standard', 'priority', 'dedicated');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stripe_customer_id" TEXT;

-- CreateTable
CREATE TABLE "user_access" (
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stripeProductId" TEXT,
    "image_quality_allowed" "ImageQuality" NOT NULL DEFAULT 'low',
    "monthly_quota_credits" INTEGER,
    "storage_quota_mb" INTEGER,
    "max_team_seats" INTEGER NOT NULL DEFAULT 1,
    "allow_high_resolution" BOOLEAN NOT NULL DEFAULT false,
    "max_resolution_width" INTEGER,
    "max_resolution_height" INTEGER,
    "remove_watermark" BOOLEAN NOT NULL DEFAULT false,
    "smart_suggestions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_access_stripe_subscription_id_key" ON "user_access"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_access_stripe_customer_id_idx" ON "user_access"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripeProductId_key" ON "plans"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "user_stripe_customer_id_key" ON "user"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
