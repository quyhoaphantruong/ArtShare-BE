-- CreateEnum
CREATE TYPE "AspectRatio" AS ENUM ('SQUARE', 'LANDSCAPE', 'PORTRAIT');

-- CreateTable
CREATE TABLE "art_generation" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL,
    "final_prompt" TEXT NOT NULL,
    "model_key" TEXT NOT NULL,
    "number_of_images_generated" INTEGER NOT NULL,
    "image_urls" TEXT[],
    "aspect_ratio" "AspectRatio" NOT NULL,
    "style" TEXT,
    "lighting" TEXT,
    "camera" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_generation_pkey" PRIMARY KEY ("id")
);
