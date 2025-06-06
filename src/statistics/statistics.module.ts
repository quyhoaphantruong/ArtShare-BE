import { forwardRef, Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrendingModule } from 'src/trending/trending.module';

@Module({
  imports: [
      forwardRef(() => TrendingModule),
      AuthModule, PrismaModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
