import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { StripeCoreService } from './stripe-core.service';
import { StripeDbService } from './stripe-db.service';
import { Plan, User } from '@prisma/client';

export interface SubscriptionProcessingResult {
  user?: User;
  plan?: Plan;
  subscription?: Stripe.Subscription | null;
  accessRecordUpdated: boolean;
}

@Injectable()
export class StripeWebhookProcessorService {
  private logger = new Logger(StripeWebhookProcessorService.name);

  constructor(
    private readonly stripeCoreService: StripeCoreService,
    private readonly stripeDbService: StripeDbService,
  ) {}

  async processSubscriptionActivation(
    customerId: string | null | undefined,
    subscriptionId: string | null | undefined,
    clientReferenceId: string | null | undefined,
    metadataUserId: string | null | undefined,
    isSimulated: boolean = false,
    simulatedPriceId?: string | null,
    simulatedSubscriptionStatus?: Stripe.Subscription.Status,
    eventType?: string,
  ): Promise<SubscriptionProcessingResult> {
    const userIdToFind = clientReferenceId || metadataUserId;
    const subIdLabel = subscriptionId || '(missing_or_simulated)';
    this.logger.log(
      `Processing subscription event. Cust: ${customerId}, Sub: ${subIdLabel}, UserRef: ${userIdToFind}, Simulated: ${isSimulated}, EventType: ${eventType}`,
    );

    if (!customerId && !userIdToFind) {
      this.logger.error(
        `No customerId or UserRef provided for subscription processing.`,
      );
      return { accessRecordUpdated: false };
    }
    if (!subscriptionId && !isSimulated) {
      this.logger.error(`Non-simulated event requires a subscriptionId.`);
      return { accessRecordUpdated: false };
    }

    let stripeSubscription: Stripe.Subscription | null = null;
    let determinedPriceId: string | null = simulatedPriceId || null;
    let determinedProductId: string | null = null;
    let periodStartTimestamp: number | null = null;
    let periodEndTimestamp: number | null = null;
    let determinedStatus: Stripe.Subscription.Status | null | undefined =
      isSimulated ? simulatedSubscriptionStatus : null;
    let cancelAtPeriodEndFlag: boolean = false;

    let user: User | null = null;
    let plan: Plan | null = null;

    try {
      user = await this.stripeDbService.findUserByStripeData(
        customerId,
        userIdToFind,
      );
      if (!user) {
        this.logger.error(
          `User not found via customerId '${customerId}' or internalRef '${userIdToFind}'. Cannot proceed for Sub ${subIdLabel}.`,
        );
        return { accessRecordUpdated: false };
      }

      if (
        customerId &&
        (!user.stripe_customer_id || user.stripe_customer_id !== customerId)
      ) {
        await this.stripeDbService.updateUserStripeCustomerId(
          user.id,
          customerId,
        );
      }

      if (!isSimulated && subscriptionId) {
        stripeSubscription =
          await this.stripeCoreService.retrieveSubscription(subscriptionId);
        determinedStatus = stripeSubscription.status;
        cancelAtPeriodEndFlag = stripeSubscription.cancel_at_period_end;

        periodStartTimestamp = (stripeSubscription as any)
          .current_period_start as number | null;
        periodEndTimestamp = (stripeSubscription as any).current_period_end as
          | number
          | null;

        if (
          (typeof periodStartTimestamp !== 'number' ||
            typeof periodEndTimestamp !== 'number') &&
          stripeSubscription.latest_invoice &&
          typeof stripeSubscription.latest_invoice === 'object'
        ) {
          const firstLineItem = (
            stripeSubscription.latest_invoice as Stripe.Invoice
          ).lines?.data[0];
          if (firstLineItem?.period) {
            if (
              typeof periodStartTimestamp !== 'number' &&
              typeof firstLineItem.period.start === 'number'
            ) {
              periodStartTimestamp = firstLineItem.period.start;
            }
            if (
              typeof periodEndTimestamp !== 'number' &&
              typeof firstLineItem.period.end === 'number'
            ) {
              periodEndTimestamp = firstLineItem.period.end;
            }
          }
        }

        if (periodStartTimestamp === null || periodEndTimestamp === null) {
          throw new Error(
            'Missing period start/end from subscription or its latest invoice.',
          );
        }

        const firstItem = stripeSubscription.items?.data[0];
        const priceObj = firstItem?.price as Stripe.Price | undefined;
        const productObj = priceObj?.product as
          | Stripe.Product
          | string
          | undefined;
        determinedPriceId = priceObj?.id || null;
        determinedProductId = productObj
          ? typeof productObj === 'string'
            ? productObj
            : productObj.id
          : null;
      } else if (isSimulated) {
        if (!determinedPriceId)
          throw new BadRequestException(
            'Simulation error: priceId is required for simulated activation.',
          );

        const price =
          await this.stripeCoreService.retrievePrice(determinedPriceId);
        determinedProductId =
          typeof price.product === 'string' ? price.product : price.product.id;

        const now = new Date();
        periodStartTimestamp = Math.floor(now.getTime() / 1000);
        const endDate = new Date(now);
        if (price.recurring?.interval === 'year')
          endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);
        periodEndTimestamp = Math.floor(endDate.getTime() / 1000);

        if (!determinedStatus) determinedStatus = 'active';
        cancelAtPeriodEndFlag = false;
      }

      if (!determinedStatus) {
        this.logger.error(
          `Could not determine subscription status for ${subIdLabel}.`,
        );
        return { accessRecordUpdated: false };
      }

      if (determinedStatus === 'active' || determinedStatus === 'trialing') {
        if (
          !determinedProductId ||
          periodEndTimestamp === null ||
          !determinedPriceId ||
          periodStartTimestamp === null
        ) {
          throw new InternalServerErrorException(
            'Incomplete subscription details for activation/update.',
          );
        }

        plan =
          await this.stripeDbService.findPlanByStripeProductId(
            determinedProductId,
          );
        if (!plan) {
          throw new InternalServerErrorException(
            `Configuration error: Plan not found in DB for Stripe Product ID ${determinedProductId}.`,
          );
        }

        const expiresAt = new Date(periodEndTimestamp * 1000);
        const cycleStartedAt = new Date(periodStartTimestamp * 1000);

        const previousUserAccess = await this.stripeDbService.findUserAccess(
          user.id,
        );

        await this.stripeDbService.upsertUserAccess({
          userId: user.id,
          planId: plan.id,
          expiresAt,
          stripeSubscriptionId: subscriptionId!,
          stripePriceId: determinedPriceId,
          stripeCustomerId: customerId!,
          cancelAtPeriodEnd: cancelAtPeriodEndFlag,
        });

        let shouldResetUsage = false;
        if (isSimulated && determinedStatus === 'active') {
          shouldResetUsage = true;
        } else if (
          eventType === 'checkout.session.completed' &&
          (determinedStatus === 'active' || determinedStatus === 'trialing')
        ) {
          shouldResetUsage = true;
        } else if (
          eventType === 'invoice.paid' &&
          (determinedStatus === 'active' || determinedStatus === 'trialing')
        ) {
          if (
            !previousUserAccess ||
            cycleStartedAt >= new Date(previousUserAccess.expiresAt)
          ) {
            shouldResetUsage = true;
          } else {
            this.logger.log(
              `Usage Reset SKIPPED (invoice.paid): Not a new cycle. PrevExp: ${previousUserAccess.expiresAt.toISOString()}, NewCycleStart: ${cycleStartedAt.toISOString()}`,
            );
          }
        } else if (
          eventType === 'customer.subscription.updated' &&
          (determinedStatus === 'active' || determinedStatus === 'trialing')
        ) {
          if (
            !previousUserAccess ||
            previousUserAccess.planId !== plan.id ||
            cycleStartedAt >= new Date(previousUserAccess.expiresAt)
          ) {
            shouldResetUsage = true;
          } else {
            this.logger.log(
              `Usage Reset SKIPPED (sub.updated): Not a new cycle or plan change.`,
            );
          }
        }

        if (shouldResetUsage) {
          await this.stripeDbService.upsertUsageRecordsForCycle(
            user.id,
            plan,
            cycleStartedAt,
            expiresAt,
          );
        }

        return {
          user,
          plan,
          subscription: stripeSubscription,
          accessRecordUpdated: true,
        };
      } else if (
        ['canceled', 'unpaid', 'incomplete_expired', 'past_due'].includes(
          determinedStatus,
        )
      ) {
        this.logger.log(
          `Subscription ${subIdLabel} status is ${determinedStatus}. Removing user access for ${user.id}.`,
        );
        await this.stripeDbService.deleteUserAccessAndAllUsage(user.id);

        return { user, accessRecordUpdated: true };
      } else {
        this.logger.warn(
          `Unhandled subscription status '${determinedStatus}' for Sub ${subIdLabel}. No action taken on UserAccess.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in processSubscriptionActivation for Sub ${subIdLabel} (User ${user?.id}):`,
        error instanceof Error ? error.stack : error,
      );
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process subscription event due to an internal error.',
      );
    }
    return { accessRecordUpdated: false };
  }

  async processSubscriptionRenewal(invoice: Stripe.Invoice): Promise<void> {
    const inv = invoice as any; // Use inv for properties that error out

    const subscriptionId =
      typeof inv.subscription === 'string' ? inv.subscription : null;
    const customerId = typeof inv.customer === 'string' ? inv.customer : null;
    const invoiceId = inv.id;

    let metadataUserId: string | undefined = undefined;
    if (inv.subscription_details?.metadata?.userId) {
      metadataUserId = inv.subscription_details.metadata.userId as string;
    } else if (inv.metadata?.userId) {
      metadataUserId = inv.metadata.userId as string;
    }

    this.logger.log(
      `Handling renewal & usage reset for invoice.paid: ${invoiceId}, Sub: ${subscriptionId}, Cust: ${customerId}, MetaUserId: ${metadataUserId}`,
    );

    if (
      !subscriptionId ||
      !customerId ||
      !subscriptionId.startsWith('sub_') ||
      !customerId.startsWith('cus_')
    ) {
      this.logger.warn(
        `Invoice ${invoiceId} paid, but missing or invalid subscription or customer ID. Sub: ${subscriptionId}, Cust: ${customerId}. Cannot process renewal.`,
      );
      return;
    }

    try {
      const result = await this.processSubscriptionActivation(
        customerId,
        subscriptionId,
        null,
        metadataUserId,
        false,
        undefined, // Corrected from null
        undefined, // Corrected from null
        'invoice.paid',
      );

      if (!result.accessRecordUpdated) {
        this.logger.warn(
          `UserAccess not updated for Sub ${subscriptionId} during renewal (invoice ${invoiceId}). Review logs from processSubscriptionActivation.`,
        );
      } else {
        this.logger.log(
          `Successfully processed renewal for Sub ${subscriptionId} (Invoice ${invoiceId}). Access updated: ${result.accessRecordUpdated}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling subscription renewal for Sub ${subscriptionId} / Invoice ${invoiceId}:`,
        error,
      );
    }
  }

  async processSubscriptionCancellation(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const subscriptionId = subscription.id;
    this.logger.log(
      `Processing cancellation for Stripe Subscription ID: ${subscriptionId}`,
    );

    if (!subscriptionId || !subscriptionId.startsWith('sub_')) {
      this.logger.error(
        `Invalid subscription ID received for cancellation: ${subscriptionId}`,
      );
      return;
    }

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer)?.id;
    const metadataUserId = subscription.metadata?.userId as string | undefined;

    let user: User | null = null;
    if (customerId || metadataUserId) {
      user = await this.stripeDbService.findUserByStripeData(
        customerId,
        metadataUserId,
      );
    }

    if (user) {
      this.logger.log(
        `User ${user.id} found for subscription ${subscriptionId}. Proceeding to remove access and usage.`,
      );
      await this.stripeDbService.deleteUserAccessAndAllUsage(user.id);
    } else {
      this.logger.warn(
        `User not found by customerId/metadata for subscription ${subscriptionId}. Attempting to delete UserAccess by subscriptionId directly.`,
      );
      const deletedRecord =
        await this.stripeDbService.deleteUserAccessBySubscriptionId(
          subscriptionId,
        );
      if (deletedRecord && deletedRecord.userId) {
        await this.stripeDbService.deleteUserAccessAndAllUsage(
          deletedRecord.userId,
        );
      } else if (!deletedRecord) {
        this.logger.warn(
          `No UserAccess record found for subscription ${subscriptionId} to delete directly either.`,
        );
      }
    }
  }
}
