-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "can_close_early" BOOLEAN NOT NULL DEFAULT true;
