import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';
import { PrismaService } from 'src/prisma.service';
import { PaidAccessLevel } from '@prisma/client';

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
  ): Promise<void> {
    const userIdToFind = clientReferenceId || metadataUserId;
    const subIdLabel = subscriptionId || '(missing)';
    this.logger.log(
      `Processing subscription activation. Cust: ${customerId}, Sub: ${subIdLabel}, UserRef: ${userIdToFind}, Simulated: ${isSimulated}`,
    );

    if (!customerId || !subscriptionId) {
      this.logger.error(
        `Cannot activate subscription: Missing customerId (${customerId}) or subscriptionId (${subscriptionId})`,
      );

      return;
    }

    let stripeSubscription: Stripe.Subscription | null = null;
    let determinedPriceId: string | null = simulatedPriceId || null;
    let determinedProductId: string | null = null;
    let periodEndTimestamp: number | null = null;
    let determinedStatus: Stripe.Subscription.Status | null =
      simulatedSubscriptionStatus || null;

    try {
      if (!isSimulated) {
        try {
          stripeSubscription = await this.stripe.subscriptions.retrieve(
            subscriptionId!,
            {
              expand: ['latest_invoice.lines.data', 'items.data.price.product'],
            },
          );
          determinedStatus = stripeSubscription.status;

          const periodEndDirect = (stripeSubscription as any)
            .current_period_end;
          if (typeof periodEndDirect === 'number') {
            periodEndTimestamp = periodEndDirect;
          }

          if (
            stripeSubscription.latest_invoice &&
            typeof stripeSubscription.latest_invoice === 'object'
          ) {
            const latestInvoice = stripeSubscription.latest_invoice;
            const firstLineItem = latestInvoice.lines?.data[0];
            if (
              firstLineItem?.period &&
              typeof firstLineItem.period.end === 'number'
            ) {
              periodEndTimestamp = firstLineItem.period.end;
            }
          }

          if (periodEndTimestamp === null) {
            this.logger.error(
              `Subscription ${subscriptionId} lacks valid period end timestamp on latest_invoice line item. Invoice Object: ${JSON.stringify(stripeSubscription.latest_invoice, null, 2)}`,
            );
            throw new Error(
              'Missing period end from subscription invoice details.',
            );
          }

          const firstItem = stripeSubscription.items?.data[0];
          const price = firstItem?.price as Stripe.Price | null | undefined;
          const product = price?.product as
            | Stripe.Product
            | string
            | null
            | undefined;
          determinedPriceId = price?.id || null;
          determinedProductId = product
            ? typeof product === 'string'
              ? product
              : product.id
            : null;
        } catch (retrieveError) {
          this.logger.error(
            `Failed to retrieve Stripe Subscription ${subscriptionId} during activation:`,
            retrieveError,
          );

          throw new InternalServerErrorException(
            `Failed to retrieve subscription details from Stripe.`,
          );
        }

        if (!['active', 'trialing'].includes(stripeSubscription.status)) {
          this.logger.warn(
            `Subscription ${subscriptionId} retrieved but status is '${stripeSubscription.status}'. Not activating access.`,
          );

          if (
            ['canceled', 'unpaid', 'incomplete_expired'].includes(
              stripeSubscription.status,
            )
          ) {
            try {
              await this.prisma.userAccess.delete({
                where: { stripeSubscriptionId: subscriptionId },
              });
              this.logger.log(
                `Removed potentially stale access record for canceled/ended sub ${subscriptionId}`,
              );
            } catch (deleteError) {
              if ((deleteError as any).code !== 'P2025') {
                this.logger.error(
                  `Error removing access record for non-active sub ${subscriptionId}:`,
                  deleteError,
                );
              }
            }
          }
          return;
        }
      } else {
        if (!determinedPriceId) {
          this.logger.error(
            `DEV SIM Error for Sub ${subscriptionId}: Missing simulatedPriceId.`,
          );
          throw new InternalServerErrorException(
            'Simulation error: priceId not provided.',
          );
        }

        try {
          const price = await this.stripe.prices.retrieve(determinedPriceId, {
            expand: ['product'],
          });
          determinedProductId =
            typeof price.product === 'string'
              ? price.product
              : price.product.id;

          const now = new Date();
          if (price.recurring?.interval === 'year') {
            now.setFullYear(now.getFullYear() + 1);
          } else {
            now.setMonth(now.getMonth() + 1);
          }
          periodEndTimestamp = Math.floor(now.getTime() / 1000);
          this.logger.log(
            `DEV SIM: Estimated expiry for ${price.recurring?.interval}: ${new Date(periodEndTimestamp * 1000).toISOString()}`,
          );
        } catch (priceError) {
          this.logger.error(
            `DEV SIM: Failed to retrieve price ${determinedPriceId} for simulation:`,
            priceError,
          );
          throw new InternalServerErrorException(
            'Simulation error: failed to get price details.',
          );
        }
        if (!determinedStatus) determinedStatus = 'active';
      }

      if (
        !determinedProductId ||
        periodEndTimestamp === null ||
        !determinedPriceId
      ) {
        throw new InternalServerErrorException(
          'Could not determine required subscription details.',
        );
      }

      let user = await this.prisma.user.findUnique({
        where: { stripe_customer_id: customerId },
      });

      if (!user && userIdToFind) {
        this.logger.warn(
          `Could not find user by stripe_customer_id ${customerId}, attempting lookup by UserRef: ${userIdToFind}`,
        );

        user = await this.prisma.user.findUnique({
          where: { id: userIdToFind },
        });
      }

      if (!user) {
        this.logger.error(
          `Cannot activate subscription: User not found for Customer ${customerId} or UserRef ${userIdToFind}`,
        );

        return;
      }

      if (!user.stripe_customer_id || user.stripe_customer_id !== customerId) {
        this.logger.warn(
          `Updating stripe_customer_id for user ${user.id} from ${user.stripe_customer_id} to ${customerId}`,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripe_customer_id: customerId },
        });
      }

      if (!determinedProductId) {
        throw new InternalServerErrorException(
          'Could not determine product ID.',
        );
      }

      let accessLevel: PaidAccessLevel;
      if (determinedProductId === process.env.ARTISTS_PRODUCT_ID) {
        accessLevel = PaidAccessLevel.PRO_ARTISTS;
      } else if (determinedProductId === process.env.STUDIOS_PRODUCT_ID) {
        accessLevel = PaidAccessLevel.STUDIOS;
      } else {
        this.logger.error(
          `Unknown Stripe Product ID ${determinedProductId} for subscription ${subscriptionId}`,
        );
        throw new InternalServerErrorException(
          'Cannot map Stripe product to internal access level.',
        );
      }

      if (periodEndTimestamp === null) {
        throw new InternalServerErrorException(
          'Could not determine period end.',
        );
      }

      const expiresAt = new Date(periodEndTimestamp * 1000);

      const upsertData = {
        userId: user.id,
        accessLevel,
        expiresAt,
        stripeSubscriptionId: subscriptionId!,
        stripePriceId: determinedPriceId,
      };
      await this.prisma.userAccess.upsert({
        where: { userId: user.id },
        update: {
          accessLevel,
          expiresAt,
          stripeSubscriptionId: subscriptionId!,
          stripePriceId: determinedPriceId,
        },
        create: upsertData,
      });
      this.logger.log(
        `Successfully upserted UserAccess for user ${user.id}. Sub: ${subscriptionId}, Level: ${accessLevel}, Expires: ${expiresAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error during subscription activation processing for Sub ${subscriptionId}:`,
        error,
      );

      if (
        error instanceof Error &&
        error.message.startsWith('Missing current_period_end')
      ) {
        throw new InternalServerErrorException(error.message);
      }
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process subscription activation.',
      );
    }
  }

  async createCheckoutSession(
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string | null }> {
    const { email, userId, priceId } = dto;
    this.logger.log(
      `Creating checkout session for Price ID: ${priceId}, user: ${userId || email || 'Guest'}`,
    );

    const successUrl = `${this.FRONTEND_URL}`;
    const cancelUrl = `${this.FRONTEND_URL}`;

    let customerId: string | undefined = undefined;
    let initialSession: Stripe.Checkout.Session;

    try {
      await this.stripe.prices.retrieve(priceId);
      this.logger.log(`Price ID ${priceId} validated.`);
    } catch (priceError) {
      if (
        priceError instanceof Stripe.errors.StripeInvalidRequestError &&
        priceError.code === 'resource_missing'
      ) {
        this.logger.error(`Invalid Price ID requested: ${priceId}`);
        throw new BadRequestException(`Invalid subscription plan selected.`);
      }
      this.logger.error(`Error validating price ID ${priceId}:`, priceError);
      throw new InternalServerErrorException(
        'Error validating plan selection.',
      );
    }

    try {
      if (email) {
        const customers = await this.stripe.customers.list({
          email: email,
          limit: 1,
        });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          this.logger.log(`Found existing customer by email: ${customerId}`);
        } else {
          const newCustomer = await this.stripe.customers.create({
            email: email,
            metadata: { userId: userId || '' },
          });
          customerId = newCustomer.id;
          this.logger.log(`Created new customer: ${customerId}`);
        }
      }

      initialSession = await this.stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : email,
        client_reference_id: userId || undefined,
        metadata: { userId: userId || '' },

        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      this.logger.log(`Created checkout session: ${initialSession.id}`);

      if (this.runSimulation && initialSession.id) {
        const sessionId = initialSession.id;

        const initialClientRefId = initialSession.client_reference_id;
        const initialMetadataUserId = initialSession.metadata?.userId;
        const currentCustomerId = customerId;

        this.logger.warn(
          `DEV MODE: Simulating 'checkout.session.completed' webhook for Session ${sessionId}`,
        );

        setTimeout(async () => {
          this.logger.log(
            `DEV SIM: Running simulated activation for Session ${sessionId}`,
          );
          try {
            this.logger.debug(
              `DEV SIM: Assuming payment success for session ${sessionId}.`,
            );

            const simulatedSubscriptionId = `sub_sim_${Date.now()}`;
            this.logger.log(
              `DEV SIM: Using simulated Subscription ID: ${simulatedSubscriptionId}`,
            );

            await this.processSubscriptionActivation(
              currentCustomerId,
              simulatedSubscriptionId,
              initialClientRefId,
              initialMetadataUserId,
              true,
              priceId,
              'active',
            );
            this.logger.log(
              `DEV SIM: Simulated activation finished for Session ${sessionId}`,
            );
          } catch (simError) {
            this.logger.error(
              `DEV SIM: Error during simulated activation for Session ${sessionId}:`,
              simError,
            );
          }
        }, 4000);
      }

      return { url: initialSession.url };
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
}
