import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeCoreService } from './stripe-core.service';
import { StripeDbService } from './stripe-db.service';
import { StripeWebhookProcessorService } from './stripe-webhook-processor.service';

@Module({
  imports: [ConfigModule],
  controllers: [StripeController],
  providers: [
    StripeService,
    StripeCoreService,
    StripeDbService,
    StripeWebhookProcessorService,
  ],
  exports: [StripeService],
})
export class StripeModule {}
