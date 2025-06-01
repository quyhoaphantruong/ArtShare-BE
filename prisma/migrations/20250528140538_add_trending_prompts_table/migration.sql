-- CreateTable
CREATE TABLE "trending_prompts" (
    "id" SERIAL NOT NULL,
    "prompt_key" TEXT NOT NULL,
    "prompts" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trending_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trending_prompts_prompt_key_key" ON "trending_prompts"("prompt_key");
