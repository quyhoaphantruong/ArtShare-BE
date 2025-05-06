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
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { Request } from 'express';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';

@Controller('api/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
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
  ) {
    this.logger.log(
      `Received create-checkout-session request: ${JSON.stringify(createCheckoutDto)}`,
    );
    try {
      const session =
        await this.stripeService.createCheckoutSession(createCheckoutDto);
      if (!session || !session.url) {
        throw new InternalServerErrorException(
          'Failed to create checkout session URL.',
        );
      }
      return { url: session.url };
    } catch (error) {
      this.logger.error(
        `Error in createCheckoutSession controller: ${(error as Error).message}`,
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
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          this.logger.log(
            `Webhook: Processing checkout.session.completed ${session.id}. Sub ID: ${session.subscription}`,
          );

          await this.stripeService.processSubscriptionActivation(
            session.customer as string | null,
            session.subscription as string | null,
            session.client_reference_id,
            session.metadata?.userId,
            false,
          );
          break;

        case 'invoice.paid':
          const invoiceData: any = event.data.object;
          const invoiceId = invoiceData?.id || 'unknown';
          const subscriptionIdFromInvoice = invoiceData?.subscription;
          const customerIdFromInvoice = invoiceData?.customer;
          const metadataFromInvoice = invoiceData?.metadata;

          let validSubscriptionId: string | null = null;
          let validCustomerId: string | null = null;

          if (
            subscriptionIdFromInvoice &&
            typeof subscriptionIdFromInvoice === 'string' &&
            subscriptionIdFromInvoice.startsWith('sub_')
          ) {
            validSubscriptionId = subscriptionIdFromInvoice;
          }
          if (
            customerIdFromInvoice &&
            typeof customerIdFromInvoice === 'string' &&
            customerIdFromInvoice.startsWith('cus_')
          ) {
            validCustomerId = customerIdFromInvoice;
          }

          if (validSubscriptionId && validCustomerId) {
            this.logger.log(
              `Webhook: Processing invoice.paid ${invoiceId} for Sub: ${validSubscriptionId}`,
            );

            await this.stripeService.processSubscriptionActivation(
              validCustomerId,
              validSubscriptionId,
              null,
              metadataFromInvoice?.userId,
              false,
            );
          } else {
            this.logger.warn(
              `Webhook: Skipping activation for Invoice ${invoiceId} due to missing/invalid subscription (${subscriptionIdFromInvoice}) or customer (${customerIdFromInvoice}) ID after validation.`,
            );
          }
          break;

        case 'customer.subscription.updated':
          const updatedSub = event.data.object as Stripe.Subscription;
          this.logger.log(
            `Webhook: Processing customer.subscription.updated ${updatedSub.id}. Status: ${updatedSub.status}, CancelAtPeriodEnd: ${updatedSub.cancel_at_period_end}`,
          );
          await this.stripeService.processSubscriptionActivation(
            updatedSub.customer as string | null,
            updatedSub.id,
            null,
            updatedSub.metadata?.userId,
            false,
          );
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription;
          this.logger.log(
            `Webhook: Processing customer.subscription.deleted ${deletedSub.id}.`,
          );

          await this.stripeService.processSubscriptionActivation(
            deletedSub.customer as string | null,
            deletedSub.id,
            null,
            deletedSub.metadata?.userId,
            false,
            null,
            'canceled',
          );

          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event.id} (Type: ${event.type}) in switch statement:`,
        error,
      );
      throw error;
    }
  }
}
