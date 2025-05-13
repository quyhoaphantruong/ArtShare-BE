-- CreateTable
CREATE TABLE "user_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "used_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cycle_started_at" TIMESTAMP(3) NOT NULL,
    "cycle_ends_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_usage_userId_featureKey_cycle_ends_at_idx" ON "user_usage"("userId", "featureKey", "cycle_ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_usage_userId_featureKey_cycle_started_at_key" ON "user_usage"("userId", "featureKey", "cycle_started_at");

-- AddForeignKey
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
