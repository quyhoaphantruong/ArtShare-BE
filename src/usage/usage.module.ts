import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsageScheduler } from './usage.scheduler';

@Module({
  imports: [ConfigModule],
  providers: [UsageScheduler],
})
export class UsageModule {}
