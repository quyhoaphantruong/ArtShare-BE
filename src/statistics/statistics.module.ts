import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
