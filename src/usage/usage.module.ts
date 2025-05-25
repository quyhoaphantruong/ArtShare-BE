import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsageScheduler } from './usage.scheduler';
import { UsageService } from './usage.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), 
  ],
  providers: [UsageScheduler, UsageService],
  exports: [UsageService]
})
export class UsageModule {}
