import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';
import { PrismaService } from 'src/prisma.service';
import { Plan, User } from '@prisma/client';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private logger = new Logger(StripeService.name);
  private FRONTEND_URL: string;
  private isProduction: boolean;
  private runSimulation: boolean;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.FRONTEND_URL =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!secretKey) {
      throw new Error('Config error: STRIPE_SECRET_KEY missing.');
    }

    if (
      !webhookSecret &&
      this.configService.get<string>('NODE_ENV') === 'production'
    ) {
      throw new Error(
        'Config error: STRIPE_WEBHOOK_SECRET missing in production.',
      );
    } else if (!webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not set. Real webhooks will fail verification if received.',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    });
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const runSimEnv = this.configService
      .get<string>('RUN_STRIPE_SIMULATION')
      ?.toLowerCase();
    this.runSimulation = !this.isProduction && runSimEnv === 'true';

    this.logger.log(
      `Stripe Service Initialized. Production: ${this.isProduction}. Run Simulation: ${this.runSimulation}`,
    );
  }
  async processSubscriptionActivation(
    customerId: string | null | undefined,
    subscriptionId: string | null | undefined,
    clientReferenceId: string | null | undefined,
    metadataUserId: string | null | undefined,
    isSimulated: boolean = false,
    simulatedPriceId?: string | null,
    simulatedSubscriptionStatus?: Stripe.Subscription.Status,
    eventType?: string, 
  ): Promise<{
    user?: User;
    plan?: Plan;
    subscription?: Stripe.Subscription | null;
    accessRecordUpdated: boolean;
  }> {
    const userIdToFind = clientReferenceId || metadataUserId;
    const subIdLabel = subscriptionId || '(missing)';
    this.logger.log(
      `Processing subscription event. Cust: ${customerId}, Sub: ${subIdLabel}, UserRef: ${userIdToFind}, Simulated: ${isSimulated}, EventType: ${eventType}`,
    );

    if (!customerId && !userIdToFind) {
      this.logger.error(`No customerId or UserRef.`);
      return { accessRecordUpdated: false };
    }
    if (!subscriptionId && !isSimulated) {
      this.logger.error(`Non-simulated: Missing subscriptionId.`);
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
      user = await this.findUserByStripeData(customerId, userIdToFind);
      if (!user) {
        this.logger.error(
          `User not found. Cannot proceed for Sub ${subIdLabel}.`,
        );
        return { accessRecordUpdated: false };
      }

      if (
        customerId &&
        (!user.stripe_customer_id || user.stripe_customer_id !== customerId)
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripe_customer_id: customerId },
        });
        this.logger.warn(
          `Updated stripe_customer_id for user ${user.id} to ${customerId}`,
        );
      }

      if (!isSimulated && subscriptionId) {
        try {
          stripeSubscription = await this.stripe.subscriptions.retrieve(
            subscriptionId,
            {
              expand: ['latest_invoice.lines.data', 'items.data.price.product'],
            },
          );
          determinedStatus = stripeSubscription.status;
          cancelAtPeriodEndFlag = stripeSubscription.cancel_at_period_end;

          const directPeriodStart = (stripeSubscription as any)
            .current_period_start;
          const directPeriodEnd = (stripeSubscription as any)
            .current_period_end;
          if (typeof directPeriodStart === 'number')
            periodStartTimestamp = directPeriodStart;
          if (typeof directPeriodEnd === 'number')
            periodEndTimestamp = directPeriodEnd;

          if (
            (periodStartTimestamp === null || periodEndTimestamp === null) &&
            stripeSubscription.latest_invoice &&
            typeof stripeSubscription.latest_invoice === 'object'
          ) {
            const firstLineItem =
              stripeSubscription.latest_invoice.lines?.data[0];
            if (firstLineItem?.period) {
              if (
                periodStartTimestamp === null &&
                typeof firstLineItem.period.start === 'number'
              )
                periodStartTimestamp = firstLineItem.period.start;
              if (
                periodEndTimestamp === null &&
                typeof firstLineItem.period.end === 'number'
              )
                periodEndTimestamp = firstLineItem.period.end;
            }
          }

          if (periodStartTimestamp === null || periodEndTimestamp === null)
            throw new Error('Missing period start/end from subscription.');

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
        } catch (retrieveError) {
          throw new InternalServerErrorException(
            `Stripe retrieve failed: ${(retrieveError as Error).message}`,
          );
        }
      } else if (isSimulated) {
        if (!determinedPriceId)
          throw new BadRequestException('Simulation error: priceId needed.');
        try {
          const price = await this.stripe.prices.retrieve(determinedPriceId, {
            expand: ['product'],
          });
          determinedProductId =
            typeof price.product === 'string'
              ? price.product
              : price.product.id;
          const now = new Date();
          periodStartTimestamp = Math.floor(now.getTime() / 1000);
          const endDate = new Date(now);
          if (price.recurring?.interval === 'year')
            endDate.setFullYear(endDate.getFullYear() + 1);
          else endDate.setMonth(endDate.getMonth() + 1);
          periodEndTimestamp = Math.floor(endDate.getTime() / 1000);
        } catch (priceError) {
          this.logger.error(priceError);
          throw new InternalServerErrorException(
            'Simulation error: price details failed.',
          );
        }
        if (!determinedStatus) determinedStatus = 'active';
        cancelAtPeriodEndFlag = false;
      }

      if (determinedStatus === 'active' || determinedStatus === 'trialing') {
        if (
          !determinedProductId ||
          periodEndTimestamp === null ||
          !determinedPriceId ||
          periodStartTimestamp === null
        ) {
          throw new InternalServerErrorException(
            'Incomplete subscription details for activation.',
          );
        }
        plan = await this.prisma.plan.findUnique({
          where: { stripeProductId: determinedProductId },
        });
        if (!plan)
          throw new InternalServerErrorException(
            `Config error: Plan not found for product ${determinedProductId}.`,
          );

        const expiresAt = new Date(periodEndTimestamp * 1000);
        const cycleStartedAt = new Date(periodStartTimestamp * 1000); 

        const previousUserAccess = await this.prisma.userAccess.findUnique({
          where: { userId: user.id },
        });

        await this.prisma.userAccess.upsert({
          where: { userId: user.id },
          update: {
            planId: plan.id,
            expiresAt,
            stripeSubscriptionId: subscriptionId!,
            stripePriceId: determinedPriceId,
            stripeCustomerId: customerId!,
            cancelAtPeriodEnd: cancelAtPeriodEndFlag,
          },
          create: {
            userId: user.id,
            planId: plan.id,
            expiresAt,
            stripeSubscriptionId: subscriptionId!,
            stripePriceId: determinedPriceId,
            stripeCustomerId: customerId!,
            cancelAtPeriodEnd: cancelAtPeriodEndFlag,
          },
        });
        this.logger.log(
          `Upserted UserAccess for ${user.id}. Plan: ${plan.id}, Expires: ${expiresAt.toISOString()}, CancelAtEnd: ${cancelAtPeriodEndFlag}`,
        );

        
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
              `Usage Reset SKIPPED (invoice.paid): Not a new cycle. PrevExp: ${previousUserAccess.expiresAt}, NewCycleStart: ${cycleStartedAt}`,
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
          await this.upsertUsageRecordsForCycle(
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
          determinedStatus!,
        ) ||
        determinedStatus === null
      ) {
        await this.deleteUserAccessAndUsage(user.id, subscriptionId);
        return { user, accessRecordUpdated: true };
      } else {
        this.logger.warn(
          `Unhandled subscription status '${determinedStatus}' for Sub ${subscriptionId}.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in processSubscriptionActivation for Sub ${subIdLabel}:`,
        error,
      );
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Failed to process subscription event.',
      );
    }
    return { accessRecordUpdated: false };
  } 

  
  private async upsertUsageRecordsForCycle(
    userId: string,
    plan: Plan,
    cycleStartDate: Date,
    cycleEndDate: Date,
  ): Promise<void> {
    this.logger.log(
      `Upserting usage for user ${userId}, plan ${plan.id}, cycle: ${cycleStartDate.toISOString()} - ${cycleEndDate.toISOString()}`,
    );
    if (plan.monthlyQuotaCredits !== null) {
      await this.prisma.userUsage.upsert({
        where: {
          userId_featureKey_cycleStartedAt: {
            userId,
            featureKey: 'ai_credits',
            cycleStartedAt: cycleStartDate,
          },
        },
        update: { usedAmount: 0, cycleEndsAt: cycleEndDate },
        create: {
          userId,
          featureKey: 'ai_credits',
          usedAmount: 0,
          cycleStartedAt: cycleStartDate,
          cycleEndsAt: cycleEndDate,
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
        update: { usedAmount: 0, cycleEndsAt: cycleEndDate },
        create: {
          userId,
          featureKey: 'storage_mb',
          usedAmount: 0,
          cycleStartedAt: cycleStartDate,
          cycleEndsAt: cycleEndDate,
        },
      });
      this.logger.log(`Upserted 'storage_mb' usage for user ${userId}.`);
    }
  }

  async createCheckoutOrPortalSession(
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string | null; type: 'checkout' | 'portal' }> {
    const { email, userId, priceId } = dto;
    const userIdentifier = userId || email || 'Guest';
    this.logger.log(
      `Initiating session for Price ID: ${priceId}, user: ${userIdentifier}`,
    );

    let userRecord: User | null = null;
    let customerId: string | undefined | null = undefined;

    if (userId) {
      userRecord = await this.prisma.user.findUnique({ where: { id: userId } });
      customerId = userRecord?.stripe_customer_id;
    }
    if (!userRecord && email) {
      userRecord = await this.prisma.user.findUnique({
        where: { email: email },
      });
      customerId = userRecord?.stripe_customer_id;
    }

    if (userRecord && !customerId && email) {
      const customers = await this.stripe.customers.list({
        email: email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await this.prisma.user.update({
          where: { id: userRecord.id },
          data: { stripe_customer_id: customerId },
        });
      }
    }

    if (!customerId && email) {
      const newCustomer = await this.stripe.customers.create({
        email: email,
        name: userRecord?.full_name || undefined,
        metadata: { userId: userRecord?.id || userId || '' },
      });
      customerId = newCustomer.id;
      if (userRecord) {
        await this.prisma.user.update({
          where: { id: userRecord.id },
          data: { stripe_customer_id: customerId },
        });
      }
    }
    if (!customerId) {
      throw new BadRequestException(
        'Cannot initiate subscription without customer details (email or identified user).',
      );
    }

    let hasActiveSubscriptionThatIsNotCanceled = false;
    if (userRecord) {
      const activeAccess = await this.prisma.userAccess.findUnique({
        where: { userId: userRecord.id },
      });
      if (
        activeAccess &&
        activeAccess.expiresAt > new Date() &&
        !activeAccess.cancelAtPeriodEnd
      ) {
        hasActiveSubscriptionThatIsNotCanceled = true;
        this.logger.log(
          `User ${userRecord.id} has an active, non-canceled subscription. Redirecting to Portal.`,
        );
      }
    }

    if (hasActiveSubscriptionThatIsNotCanceled) {
      const portalSession = await this.createCustomerPortalSession(customerId);
      return { url: portalSession.url, type: 'portal' };
    } else {
      this.logger.log(
        `Proceeding with Checkout Session for customer ${customerId}, Price ID: ${priceId}`,
      );
      const successUrl = `${this.FRONTEND_URL}`;
      const cancelUrl = `${this.FRONTEND_URL}`;

      try {
        await this.stripe.prices.retrieve(priceId);
      } catch (priceError) {
        this.logger.error(priceError);

        throw new BadRequestException(`Invalid subscription plan selected.`);
      }

      try {
        const checkoutSession = await this.stripe.checkout.sessions.create({
          customer: customerId,
          client_reference_id: userRecord?.id || userId || undefined,
          metadata: { userId: userRecord?.id || userId || '' },
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          allow_promotion_codes: true,
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        this.logger.log(`Created checkout session: ${checkoutSession.id}`);

        if (this.runSimulation && checkoutSession.id) {
          const initialClientRefId = checkoutSession.client_reference_id;
          const initialMetadataUserId = checkoutSession.metadata?.userId;

          const currentCustomerIdForSim = customerId;

          this.logger.warn(
            `DEV MODE (SIMULATION ENABLED): Simulating 'checkout.session.completed' for Session ${checkoutSession.id}`,
          );
          setTimeout(async () => {
            this.logger.log(
              `DEV SIM: Running simulated activation for Session ${checkoutSession.id}`,
            );
            try {
              const simulatedSubscriptionId = `sub_sim_${Date.now()}`;
              await this.processSubscriptionActivation(
                currentCustomerIdForSim,
                simulatedSubscriptionId,
                initialClientRefId,
                initialMetadataUserId,
                true,
                priceId,
                'active',
              );
            } catch (simError) {
              this.logger.error(
                `DEV SIM: Error during simulated activation for Session ${checkoutSession.id}:`,
                simError,
              );
            }
          }, 4000);
        }

        return { url: checkoutSession.url, type: 'checkout' };
      } catch (error) {
        this.logger.error('Error creating checkout session:', error);
        if (error instanceof Stripe.errors.StripeError) {
          throw new InternalServerErrorException(
            `Stripe Error: ${error.message}`,
          );
        }
        throw new InternalServerErrorException(
          'Could not create payment session.',
        );
      }
    }
  }

  async createCustomerPortalSession(
    customerId: string,
  ): Promise<{ url: string }> {
    const returnUrl = `${this.FRONTEND_URL}`;

    try {
      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      this.logger.log(`Created Customer Portal session for ${customerId}`);
      return { url: portalSession.url };
    } catch (error) {
      this.logger.error(
        `Stripe Error creating portal session for ${customerId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create Stripe customer portal session.',
      );
    }
  }

  async handleSubscriptionRenewal(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription as string | null;
    const customerId = (invoice as any).customer as string | null;
    const invoiceId = invoice.id;
    const metadata = (invoice as any).metadata;

    this.logger.log(
      `Handling renewal & usage reset for invoice.paid: ${invoiceId}, Sub: ${subscriptionId}, Cust: ${customerId}`,
    );

    if (
      !subscriptionId ||
      !customerId ||
      !subscriptionId.startsWith('sub_') ||
      !customerId.startsWith('cus_')
    ) {
      this.logger.warn(
        `Invoice ${invoiceId} paid, but missing or invalid subscription or customer ID. Cannot process renewal/reset. Sub: ${subscriptionId}, Cust: ${customerId}`,
      );
      return;
    }

    try {
      const activationResult = await this.processSubscriptionActivation(
        customerId,
        subscriptionId,
        null,
        metadata?.userId,
        false,
      );

      if (
        activationResult.accessRecordUpdated &&
        activationResult.user &&
        activationResult.plan &&
        activationResult.subscription
      ) {
        let periodStartTimestamp: number | null = null;
        const subCurrentPeriodStart = (activationResult.subscription as any)
          .current_period_start;

        if (typeof subCurrentPeriodStart === 'number') {
          periodStartTimestamp = subCurrentPeriodStart;
        } else if (
          activationResult.subscription.latest_invoice &&
          typeof activationResult.subscription.latest_invoice === 'object'
        ) {
          const firstLineItem = (
            activationResult.subscription.latest_invoice as Stripe.Invoice
          ).lines?.data[0];
          if (
            firstLineItem?.period &&
            typeof firstLineItem.period.start === 'number'
          ) {
            periodStartTimestamp = firstLineItem.period.start;
            this.logger.log(
              `Renewal: Using period start from Sub's LATEST INVOICE line item: ${periodStartTimestamp}`,
            );
          }
        }

        if (periodStartTimestamp === null) {
          this.logger.error(
            `Could not determine new cycle start for Sub ${subscriptionId} on renewal after invoice ${invoiceId} paid.`,
          );
          return;
        }

        const cycleStartDate = new Date(periodStartTimestamp * 1000);

        const userAccessRecord = await this.prisma.userAccess.findUnique({
          where: { userId: activationResult.user.id },
        });
        if (!userAccessRecord || !userAccessRecord.expiresAt) {
          this.logger.error(
            'User access record or expiresAt not found after update in renewal for sub ' +
              subscriptionId,
          );
          return;
        }
        const cycleEndDate = userAccessRecord.expiresAt;

        this.logger.log(
          `Resetting usage for user ${activationResult.user.id} / Sub ${subscriptionId} for NEW renewal cycle: ${cycleStartDate.toISOString()} - ${cycleEndDate.toISOString()}`,
        );
        await this.upsertUsageRecordsForCycle(
          activationResult.user.id,
          activationResult.plan,
          cycleStartDate,
          cycleEndDate,
        );
      } else {
        this.logger.warn(
          `UserAccess not updated or missing data for Sub ${subscriptionId} during renewal (invoice ${invoiceId}), skipping usage reset.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling subscription renewal for Sub ${subscriptionId} / Invoice ${invoiceId}:`,
        error,
      );
    }
  }

  async handleSubscriptionCancellation(subscriptionId: string): Promise<void> {
    this.logger.log(
      `Processing cancellation for Stripe Subscription ID: ${subscriptionId}`,
    );

    if (
      !subscriptionId ||
      typeof subscriptionId !== 'string' ||
      !subscriptionId.startsWith('sub_')
    ) {
      this.logger.error(
        `Invalid subscription ID received for cancellation: ${subscriptionId}`,
      );

      return;
    }

    try {
      const deletedAccessRecord = await this.prisma.userAccess.delete({
        where: { stripeSubscriptionId: subscriptionId },
        select: { userId: true },
      });

      if (deletedAccessRecord) {
        this.logger.log(
          `Successfully removed UserAccess record for user ${deletedAccessRecord.userId} due to subscription ${subscriptionId} cancellation/deletion.`,
        );
      } else {
        this.logger.warn(
          `No UserAccess record found to remove for canceled/deleted subscription ${subscriptionId}. It might have already been removed or never existed.`,
        );
      }
    } catch (error) {
      if ((error as any).code === 'P2025') {
        this.logger.warn(
          `Attempted to remove UserAccess for subscription ${subscriptionId}, but the record was not found (likely already removed).`,
        );
      } else {
        this.logger.error(
          `Database error removing UserAccess record for subscription ${subscriptionId}:`,
          error,
        );
      }
    }
  }

  private async findUserByStripeData(
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
      this.logger.warn(
        `Could not find user by stripe_customer_id ${stripeCustomerId}, attempting lookup by internal UserRef: ${internalUserId}`,
      );
      const user = await this.prisma.user.findUnique({
        where: { id: internalUserId },
      });
      if (user) return user;
    }
    this.logger.error(
      `User not found for Stripe Customer ${stripeCustomerId} or Internal UserRef ${internalUserId}.`,
    );
    return null;
  }

  private async deleteUserAccessAndUsage(
    userId: string,
    subscriptionId?: string | null,
  ): Promise<void> {
    this.logger.log(
      `Processing Delete for UserAccess and Usage for user ${userId} / sub ${subscriptionId ?? 'unknown'}`,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userAccess.deleteMany({ where: { userId: userId } });
        await tx.userUsage.deleteMany({ where: { userId: userId } });
      });
      this.logger.log(
        `Successfully removed UserAccess and UserUsage for user ${userId}.`,
      );
    } catch (deleteError) {
      if ((deleteError as any).code === 'P2025') {
        this.logger.warn(
          `No UserAccess record found for user ${userId} to delete.`,
        );
      } else {
        this.logger.error(
          `Error removing UserAccess/Usage for user ${userId}:`,
          deleteError,
        );
        throw new InternalServerErrorException(
          'Failed to remove user access records.',
        );
      }
    }
  }
}
