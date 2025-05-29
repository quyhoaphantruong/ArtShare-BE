import { Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { GeminiService } from './gemini.service';
import { StatisticsModule } from 'src/statistics/statistics.module';

@Module({
  imports: [StatisticsModule],
  controllers: [TrendingController],
  providers: [TrendingService, GeminiService],
  exports: [TrendingService, GeminiService],
})
export class TrendingModule {}
