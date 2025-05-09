import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Logger,
  Req,
  Headers,
  HttpException,
  HttpStatus,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { Request } from 'express';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { PrismaService } from 'src/prisma.service';

@Controller('api/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const retrievedWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (!retrievedWebhookSecret) {
      if (nodeEnv === 'production') {
        this.logger.error(
          'CRITICAL: STRIPE_WEBHOOK_SECRET environment variable is not set in production.',
        );
        throw new Error(
          'Configuration error: STRIPE_WEBHOOK_SECRET is missing.',
        );
      } else {
        this.logger.warn(
          'STRIPE_WEBHOOK_SECRET not set. Using dummy value for local dev. Real webhooks will fail verification.',
        );
        this.webhookSecret = 'whsec_dummy_local_secret_for_startup';
      }
    } else {
      this.webhookSecret = retrievedWebhookSecret;
    }

    if (!secretKey) {
      throw new Error('Missing Stripe keys in configuration.');
    }
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-03-31.basil' });
    this.logger.log('Stripe Controller Initialized.');
  }

  @Post('create-checkout-session')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createCheckoutSession(
    @Body() createCheckoutDto: CreateCheckoutSessionDto,
    @CurrentUser() user: CurrentUserType | null,
  ) {
    this.logger.log(
      `Received create-checkout-session request: ${JSON.stringify(createCheckoutDto)}`,
    );
    try {
      const dtoWithUser = {
        ...createCheckoutDto,
        userId: user?.id,
        email: user?.email || createCheckoutDto.email,
      };

      const sessionResult =
        await this.stripeService.createCheckoutOrPortalSession(dtoWithUser);

      return sessionResult;
    } catch (error) {
      this.logger.error(
        `Error in createCheckoutSession controller: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw new HttpException(error.message, error.getStatus());
      }
      throw error;
    }
  }

  @Post('create-customer-portal-session')
  async createPortalSession(@CurrentUser() user: CurrentUserType) {
    this.logger.log(
      `Received create-customer-portal-session request for user: ${user.id}`,
    );

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    const customerId = dbUser?.stripe_customer_id;

    if (!customerId) {
      this.logger.error(
        `User ${user.id} requested portal session but has no Stripe Customer ID.`,
      );

      throw new HttpException(
        'Billing information not found for this user.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const portalSession =
        await this.stripeService.createCustomerPortalSession(customerId);
      return { url: portalSession.url };
    } catch (error) {
      this.logger.error(
        `Error creating portal session for user ${user.id} / customer ${customerId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    if (!signature) {
      throw new HttpException(
        'Missing Stripe signature header',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rawBody = request.body;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      this.logger.error(
        'Webhook received without raw body buffer. Ensure body parsing middleware is disabled for this route.',
      );
      throw new HttpException(
        'Webhook error: Missing raw body',
        HttpStatus.BAD_REQUEST,
      );
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      this.logger.log(
        `Webhook event received: ${event.id}, Type: ${event.type}`,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new HttpException(
        `Webhook error: ${(err as Error).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    this.processWebhookEvent(event).catch((processingError) => {
      this.logger.error(
        `Async error processing webhook ${event.id}:`,
        processingError,
      );
    });

    return { received: true };
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const eventType = event.type;
    const eventData = event.data.object as any;
    const eventId = event.id;
    this.logger.log(
      `Webhook Processing: Event ID: ${eventId}, Type: ${eventType}`,
    );

    try {
      let customerId: string | null = null;
      let subscriptionId: string | null = null;
      let clientReferenceId: string | null = null;
      let metadataUserId: string | null | undefined = null;

      switch (eventType) {
        case 'checkout.session.completed':
          const session = eventData as Stripe.Checkout.Session;
          customerId = session.customer as string | null;
          subscriptionId = session.subscription as string | null;
          clientReferenceId = session.client_reference_id;
          metadataUserId = session.metadata?.userId;
          this.logger.log(
            `Webhook: Processing ${eventType} ${session.id}. Sub ID: ${subscriptionId}`,
          );

          if (
            subscriptionId &&
            typeof subscriptionId === 'string' &&
            subscriptionId.startsWith('sub_')
          ) {
            await this.stripeService.processSubscriptionActivation(
              customerId,
              subscriptionId,
              clientReferenceId,
              metadataUserId,
              false,
            );
          } else {
            this.logger.warn(
              `Webhook: Event ${eventType} (ID: ${eventId}) - Skipping activation, subscriptionId ('${subscriptionId}') missing/invalid.`,
            );
          }
          break;

        case 'invoice.paid':
          const invoiceId = eventData?.id || 'unknown';
          this.logger.log(
            `Webhook: Processing ${eventType} for Invoice ${invoiceId}.`,
          );

          const subIdFromInvoice = eventData?.subscription;
          const custIdFromInvoice = eventData?.customer;

          this.logger.debug(
            `Invoice.paid - Extracted Sub ID: ${subIdFromInvoice} (Type: ${typeof subIdFromInvoice})`,
          );
          this.logger.debug(
            `Invoice.paid - Extracted Cus ID: ${custIdFromInvoice} (Type: ${typeof custIdFromInvoice})`,
          );

          if (
            subIdFromInvoice &&
            typeof subIdFromInvoice === 'string' &&
            subIdFromInvoice.startsWith('sub_') &&
            custIdFromInvoice &&
            typeof custIdFromInvoice === 'string' &&
            custIdFromInvoice.startsWith('cus_')
          ) {
            await this.stripeService.handleSubscriptionRenewal(
              eventData as Stripe.Invoice,
            );
          } else {
            this.logger.warn(
              `Webhook: Invoice ${invoiceId} paid, but subscription (${subIdFromInvoice}) or customer (${custIdFromInvoice}) ID missing/invalid. Cannot process renewal.`,
            );
          }
          break;

        case 'customer.subscription.updated':
          const updatedSub = eventData as Stripe.Subscription;
          subscriptionId = updatedSub.id;
          customerId = updatedSub.customer as string | null;
          metadataUserId = updatedSub.metadata?.userId;
          this.logger.log(
            `Webhook: Processing ${eventType} ${subscriptionId}. Status: ${updatedSub.status}, CancelAtEnd: ${updatedSub.cancel_at_period_end}`,
          );

          if (
            subscriptionId &&
            typeof subscriptionId === 'string' &&
            subscriptionId.startsWith('sub_')
          ) {
            await this.stripeService.processSubscriptionActivation(
              customerId,
              subscriptionId,
              null,
              metadataUserId,
              false,
            );
          } else {
            this.logger.warn(
              `Webhook: Event ${eventType} (ID: ${eventId}) - Skipping activation, subscriptionId ('${subscriptionId}') missing/invalid.`,
            );
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = eventData as Stripe.Subscription;
          subscriptionId = deletedSub.id;
          customerId = deletedSub.customer as string | null;
          metadataUserId = deletedSub.metadata?.userId;
          this.logger.log(
            `Webhook: Processing ${eventType} ${subscriptionId}.`,
          );

          if (
            subscriptionId &&
            typeof subscriptionId === 'string' &&
            subscriptionId.startsWith('sub_')
          ) {
            await this.stripeService.processSubscriptionActivation(
              customerId,
              subscriptionId,
              null,
              metadataUserId,
              false,
              null,
              'canceled',
            );
          } else {
            this.logger.warn(
              `Webhook: Event ${eventType} (ID: ${eventId}) - Skipping activation, subscriptionId ('${subscriptionId}') missing/invalid.`,
            );
          }
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${eventId} (Type: ${eventType}) in switch statement:`,
        error,
      );
    }
  }
}
