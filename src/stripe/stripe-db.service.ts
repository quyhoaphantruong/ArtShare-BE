import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PaidAccessLevel, Plan, User, UserAccess } from '@prisma/client';
import { FeatureKey } from 'src/common/enum/subscription-feature-key.enum';
import { getEndOfLocalDay } from 'src/common/utils/date.utils';

@Injectable()
export class StripeDbService {
  private logger = new Logger(StripeDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findUserByStripeData(
    stripeCustomerId?: string | null,
    internalUserId?: string | null,
  ): Promise<User | null> {
    if (stripeCustomerId) {
      const user = await this.prisma.user.findUnique({
        where: { stripe_customer_id: stripeCustomerId },
      });
      if (user) return user;
    }
    if (internalUserId) {
      if (stripeCustomerId) {
        this.logger.warn(
          `Could not find user by stripe_customer_id ${stripeCustomerId}, attempting lookup by internal UserRef: ${internalUserId}`,
        );
      }
      const user = await this.prisma.user.findUnique({
        where: { id: internalUserId },
      });
      if (user) return user;
    }

    return null;
  }

  async updateUserStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
  ): Promise<User> {
    this.logger.warn(
      `Updating stripe_customer_id for user ${userId} to ${stripeCustomerId}`,
    );
    return this.prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: stripeCustomerId },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findPlanByStripeProductId(
    stripeProductId: string,
  ): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { stripeProductId },
    });
    if (!plan) {
      this.logger.error(
        `Config error: Plan not found for product ${stripeProductId}.`,
      );
    }
    return plan;
  }

  async findUserAccess(userId: string): Promise<UserAccess | null> {
    return this.prisma.userAccess.findFirst({
    where: {
      userId,
      planId: {
        not: PaidAccessLevel.FREE,
      },
    },
  });
  }

  async upsertUserAccess(data: {
    userId: string;
    planId: string;
    expiresAt: Date;
    stripeSubscriptionId: string;
    stripePriceId: string;
    stripeCustomerId: string;
    cancelAtPeriodEnd: boolean;
  }): Promise<UserAccess> {
    this.logger.log(
      `Upserting UserAccess for ${data.userId}. Plan: ${data.planId}, Expires: ${data.expiresAt.toISOString()}, CancelAtEnd: ${data.cancelAtPeriodEnd}`,
    );
    return this.prisma.userAccess.upsert({
      where: { userId: data.userId },
      update: {
        planId: data.planId as PaidAccessLevel,
        expiresAt: data.expiresAt,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        stripeCustomerId: data.stripeCustomerId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
      create: {
        userId: data.userId,
        planId: data.planId as PaidAccessLevel,
        expiresAt: data.expiresAt,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        stripeCustomerId: data.stripeCustomerId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });
  }

  async deleteUserAccessAndAllUsage(userId: string): Promise<void> {
    this.logger.log(
      `Processing Delete for UserAccess and all UserUsage for user ${userId}.`,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userAccess.deleteMany({ where: { userId: userId } });
        await tx.userUsage.deleteMany({ where: { userId: userId } });
      });
      this.logger.log(
        `Successfully removed UserAccess and all UserUsage for user ${userId}.`,
      );
    } catch (deleteError) {
      if ((deleteError as any).code === 'P2025') {
        this.logger.warn(
          `No UserAccess/UserUsage records found for user ${userId} to delete (P2025).`,
        );
      } else {
        this.logger.error(
          `Error removing UserAccess/Usage for user ${userId}:`,
          deleteError,
        );
        throw new InternalServerErrorException(
          'Failed to remove user access/usage records.',
        );
      }
    }
  }

  async deleteUserAccessBySubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<{ userId: string } | null> {
    try {
      const deletedAccessRecord = await this.prisma.userAccess.delete({
        where: { stripeSubscriptionId },
        select: { userId: true },
      });
      this.logger.log(
        `Successfully removed UserAccess record for user ${deletedAccessRecord.userId} due to subscription ${stripeSubscriptionId} cancellation/deletion.`,
      );
      return deletedAccessRecord;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        this.logger.warn(
          `Attempted to remove UserAccess for subscription ${stripeSubscriptionId}, but the record was not found (likely already removed).`,
        );
        return null;
      } else {
        this.logger.error(
          `Database error removing UserAccess record for subscription ${stripeSubscriptionId}:`,
          error,
        );
        throw new InternalServerErrorException(
          'Database error during UserAccess deletion.',
        );
      }
    }
  }

  async upsertUsageRecordsForCycle(
    userId: string,
    plan: Plan,
    cycleStartDate: Date,
    subscriptionExpiryDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Upserting usage for user ${userId}, plan ${plan.id}, cycle: ${cycleStartDate.toISOString()} - ${subscriptionExpiryDate.toISOString()}`,
    );
    if (plan.dailyQuotaCredits !== null) {
      const dailyCycleEnd = getEndOfLocalDay();

      await this.prisma.userUsage.upsert({
        where: {
          userId_featureKey_cycleStartedAt: {
            userId,
            featureKey: FeatureKey.AI_CREDITS,
            cycleStartedAt: cycleStartDate,
          },
        },
        update: { usedAmount: 0, cycleEndsAt: dailyCycleEnd },
        create: {
          userId,
          featureKey: FeatureKey.AI_CREDITS,
          usedAmount: 0,
          cycleStartedAt: cycleStartDate,
          cycleEndsAt: dailyCycleEnd,
        },
      });
      this.logger.log(`Upserted 'ai_credits' usage for user ${userId}.`);
    }
    if (plan.storageQuotaMB !== null) {
      await this.prisma.userUsage.upsert({
        where: {
          userId_featureKey_cycleStartedAt: {
            userId,
            featureKey: 'storage_mb',
            cycleStartedAt: cycleStartDate,
          },
        },
        update: { usedAmount: 0, cycleEndsAt: subscriptionExpiryDate },
        create: {
          userId,
          featureKey: 'storage_mb',
          usedAmount: 0,
          cycleStartedAt: cycleStartDate,
          cycleEndsAt: subscriptionExpiryDate,
        },
      });
      this.logger.log(`Upserted 'storage_mb' usage for user ${userId}.`);
    }
  }
}
