-- AlterTable
ALTER TABLE "user_access" ALTER COLUMN "stripe_subscription_id" DROP NOT NULL,
ALTER COLUMN "stripe_price_id" DROP NOT NULL;
