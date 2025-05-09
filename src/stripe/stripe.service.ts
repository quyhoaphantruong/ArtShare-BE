import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';
import { User } from '@prisma/client';
import { StripeCoreService } from './stripe-core.service';
import { StripeDbService } from './stripe-db.service';
import { StripeWebhookProcessorService } from './stripe-webhook-processor.service';

@Injectable()
export class StripeService {
  private logger = new Logger(StripeService.name);

  constructor(
    private readonly stripeCoreService: StripeCoreService,
    private readonly stripeDbService: StripeDbService,
    private readonly stripeWebhookProcessorService: StripeWebhookProcessorService,
  ) {}

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
      userRecord = await this.stripeDbService.findUserByStripeData(
        null,
        userId,
      );
      customerId = userRecord?.stripe_customer_id;
    }
    if (!userRecord && email) {
      userRecord = await this.stripeDbService.findUserByEmail(email);
      customerId = userRecord?.stripe_customer_id;
    }

    if (userRecord && !customerId && email) {
      const customers =
        await this.stripeCoreService.listCustomersByEmail(email);
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await this.stripeDbService.updateUserStripeCustomerId(
          userRecord.id,
          customerId,
        );
      }
    }

    if (!customerId && email) {
      const newCustomerParams: Stripe.CustomerCreateParams = { email };
      if (userRecord?.full_name) newCustomerParams.name = userRecord.full_name;
      if (userRecord?.id || userId)
        newCustomerParams.metadata = { userId: userRecord?.id || userId || '' };

      const newCustomer =
        await this.stripeCoreService.createCustomer(newCustomerParams);
      customerId = newCustomer.id;
      if (userRecord) {
        await this.stripeDbService.updateUserStripeCustomerId(
          userRecord.id,
          customerId,
        );
      }
    }

    if (!customerId) {
      throw new BadRequestException(
        'Cannot initiate session without customer details (email or identified user).',
      );
    }

    let hasActiveNonCanceledSubscription = false;
    if (userRecord) {
      const activeAccess = await this.stripeDbService.findUserAccess(
        userRecord.id,
      );
      if (
        activeAccess &&
        activeAccess.expiresAt > new Date() &&
        !activeAccess.cancelAtPeriodEnd
      ) {
        hasActiveNonCanceledSubscription = true;
        this.logger.log(
          `User ${userRecord.id} has an active, non-canceled subscription. Redirecting to Portal.`,
        );
      }
    }

    if (hasActiveNonCanceledSubscription) {
      const portalSession =
        await this.stripeCoreService.createBillingPortalSession({
          customer: customerId,
          return_url: this.stripeCoreService.getFrontendUrl(),
        });
      return { url: portalSession.url, type: 'portal' };
    } else {
      this.logger.log(
        `Proceeding with Checkout Session for customer ${customerId}, Price ID: ${priceId}`,
      );

      try {
        await this.stripeCoreService.retrievePrice(priceId);
      } catch (priceError) {
        this.logger.error(
          `Price ID ${priceId} not found on Stripe.`,
          priceError,
        );
        throw new BadRequestException(`Invalid subscription plan selected.`);
      }

      const checkoutSession =
        await this.stripeCoreService.createCheckoutSession({
          customer: customerId,
          client_reference_id: userRecord?.id || userId || undefined,
          metadata: { userId: userRecord?.id || userId || '' },
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          allow_promotion_codes: true,
          success_url: `${this.stripeCoreService.getFrontendUrl()}`,
          cancel_url: `${this.stripeCoreService.getFrontendUrl()}`,
        });
      this.logger.log(`Created checkout session: ${checkoutSession.id}`);

      if (this.stripeCoreService.isSimulationEnabled() && checkoutSession.id) {
        this.logger.warn(
          `DEV MODE (SIMULATION ENABLED): Simulating 'checkout.session.completed' for Session ${checkoutSession.id}`,
        );

        setTimeout(async () => {
          this.logger.log(
            `DEV SIM: Running simulated activation for Session ${checkoutSession.id}, Price: ${priceId}, Customer: ${customerId}`,
          );
          try {
            const simulatedSubscriptionId = `sub_sim_${Date.now()}`;

            await this.stripeWebhookProcessorService.processSubscriptionActivation(
              customerId,
              simulatedSubscriptionId,
              checkoutSession.client_reference_id,
              checkoutSession.metadata?.userId,
              true,
              priceId,
              'active',
              'checkout.session.completed',
            );
            this.logger.log(
              `DEV SIM: Simulated activation complete for Session ${checkoutSession.id}`,
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
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Received Stripe webhook event: ${event.type}`);
    let relevantSubscription: Stripe.Subscription | undefined;

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.mode === 'subscription' &&
          session.subscription &&
          session.customer
        ) {
          await this.stripeWebhookProcessorService.processSubscriptionActivation(
            session.customer as string,
            session.subscription as string,
            session.client_reference_id,
            session.metadata?.userId,
            false,
            undefined,
            undefined,
            event.type,
          );
        } else {
          this.logger.warn(
            `Checkout session ${session.id} completed but not a subscription or missing details.`,
          );
        }
        break;

      case 'invoice.paid':
        const invoice = event.data.object as Stripe.Invoice;
        const inv = invoice as any;

        if (inv.paid && inv.subscription && inv.customer) {
          await this.stripeWebhookProcessorService.processSubscriptionRenewal(
            invoice,
          );
        } else {
          this.logger.warn(
            `Invoice ${inv.id} paid event received, but not for a subscription or missing details (paid: ${inv.paid}, sub: ${inv.subscription}, cust: ${inv.customer}).`,
          );
        }
        break;

      case 'customer.subscription.updated':
        relevantSubscription = event.data.object as Stripe.Subscription;

        await this.stripeWebhookProcessorService.processSubscriptionActivation(
          relevantSubscription.customer as string,
          relevantSubscription.id,
          null,
          relevantSubscription.metadata?.userId,
          false,
          undefined,
          undefined,
          event.type,
        );
        break;

      case 'customer.subscription.deleted':
        relevantSubscription = event.data.object as Stripe.Subscription;
        await this.stripeWebhookProcessorService.processSubscriptionCancellation(
          relevantSubscription,
        );
        break;

      default:
        this.logger.log(`Unhandled Stripe webhook event type: ${event.type}`);
    }
  }

  async createCustomerPortalSessionForUser(
    userId: string,
  ): Promise<{ url: string }> {
    const userRecord = await this.stripeDbService.findUserByStripeData(
      null,
      userId,
    );

    if (!userRecord || !userRecord.stripe_customer_id) {
      this.logger.error(
        `User ${userId} requested portal session but has no Stripe Customer ID or user not found.`,
      );
      throw new NotFoundException(
        'Billing information not found for this user, or user does not exist.',
      );
    }

    const customerId = userRecord.stripe_customer_id;

    const portalSession =
      await this.stripeCoreService.createBillingPortalSession({
        customer: customerId,
        return_url: this.stripeCoreService.getFrontendUrl(),
      });
    this.logger.log(
      `Created Customer Portal session for user ${userId} / customer ${customerId}`,
    );
    return { url: portalSession.url };
  }
}
