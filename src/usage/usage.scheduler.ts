import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class UsageScheduler {
  private readonly logger = new Logger(UsageScheduler.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.error(
        'CRITICAL: Stripe Secret Key not configured for UsageScheduler.',
      );
    } else {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-04-30.basil' });
      this.logger.log('UsageScheduler initialized Stripe client.');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'monthlyQuotaReset',
    timeZone: 'UTC',
  })
  async handleMonthlyQuotaReset() {
    this.logger.log('Running scheduled task: handleMonthlyQuotaReset...');
    const now = new Date();

    const activeAccessRecords = await this.prisma.userAccess.findMany({
      where: {
        expiresAt: { gt: now },
        plan: {
          OR: [
            { monthlyQuotaCredits: { not: null } },
            { storageQuotaMB: { not: null } },
          ],
        },
      },
      include: {
        plan: true,
        user: { select: { id: true } },
      },
    });

    this.logger.log(
      `Found ${activeAccessRecords.length} active subscriptions to check for monthly quota resets.`,
    );

    for (const access of activeAccessRecords) {
      const userId = access.userId;
      const plan = access.plan;

      if (plan.monthlyQuotaCredits !== null) {
        await this.resetFeatureUsageIfNeeded(
          userId,
          'ai_credits',
          access.stripeSubscriptionId,
          now,
          access.expiresAt,
        );
      }

      if (plan.storageQuotaMB !== null) {
        await this.resetFeatureUsageIfNeeded(
          userId,
          'storage_mb',
          access.stripeSubscriptionId,
          now,
          access.expiresAt,
        );
      }
    }
    this.logger.log('Finished scheduled task: handleMonthlyQuotaReset.');
  }

  private async resetFeatureUsageIfNeeded(
    userId: string,
    featureKey: string,
    stripeSubscriptionId: string,
    now: Date,
    subscriptionOverallEndDate: Date,
  ): Promise<void> {
    this.logger.debug(
      `Checking reset for user ${userId}, feature ${featureKey}, sub ${stripeSubscriptionId}`,
    );

    let subscriptionStartDate: Date;
    try {
      if (!this.stripe) {
        throw new Error('Stripe client not initialized.');
      }
      const stripeSub =
        await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (typeof stripeSub.start_date !== 'number') {
        throw new Error('Could not determine subscription start_date.');
      }
      subscriptionStartDate = new Date(stripeSub.start_date * 1000);
      this.logger.debug(
        `Using Stripe Sub ${stripeSubscriptionId} start_date as anchor: ${subscriptionStartDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Stripe Sub ${stripeSubscriptionId} or get start_date for user ${userId}, feature ${featureKey}:`,
        error,
      );
      return;
    }

    let currentCycleStartDate = new Date(subscriptionStartDate.getTime());
    currentCycleStartDate.setUTCHours(0, 0, 0, 0);

    while (true) {
      const nextCycleStartDate = new Date(currentCycleStartDate.getTime());
      nextCycleStartDate.setUTCMonth(nextCycleStartDate.getUTCMonth() + 1);
      if (nextCycleStartDate > now) {
        break;
      }
      currentCycleStartDate = nextCycleStartDate;
    }
    this.logger.debug(
      `Calculated current monthly cycle start date: ${currentCycleStartDate.toISOString()}`,
    );

    let currentCycleEndDate = new Date(currentCycleStartDate.getTime());
    currentCycleEndDate.setUTCMonth(currentCycleEndDate.getUTCMonth() + 1);
    currentCycleEndDate.setUTCDate(currentCycleEndDate.getUTCDate() - 1);
    currentCycleEndDate.setUTCHours(23, 59, 59, 999);

    if (currentCycleEndDate > subscriptionOverallEndDate) {
      currentCycleEndDate = subscriptionOverallEndDate;
    }
    this.logger.debug(
      `Calculated current monthly cycle end date: ${currentCycleEndDate.toISOString()}`,
    );

    this.logger.log(
      `User ${userId}, feature ${featureKey}: Ensuring usage record exists and is reset for cycle starting ${currentCycleStartDate.toISOString()}`,
    );
    try {
      await this.prisma.userUsage.upsert({
        where: {
          userId_featureKey_cycleStartedAt: {
            userId,
            featureKey,
            cycleStartedAt: currentCycleStartDate,
          },
        },

        update: { cycleEndsAt: currentCycleEndDate },

        create: {
          userId,
          featureKey,
          usedAmount: 0,
          cycleStartedAt: currentCycleStartDate,
          cycleEndsAt: currentCycleEndDate,
        },
      });
      this.logger.log(
        `Successfully ensured usage record exists/is reset for user ${userId}, feature ${featureKey}, cycle start ${currentCycleStartDate.toISOString()}.`,
      );
    } catch (dbError) {
      this.logger.error(
        `DB error upserting usage record for user ${userId}, feature ${featureKey}:`,
        dbError,
      );
    }
  }
}
