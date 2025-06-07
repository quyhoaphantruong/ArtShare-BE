import { forwardRef, Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { GeminiService } from './gemini.service';
import { StatisticsModule } from 'src/statistics/statistics.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule, forwardRef(() => StatisticsModule)],
  controllers: [TrendingController],
  providers: [TrendingService, GeminiService],
  exports: [TrendingService, GeminiService],
})
export class TrendingModule {}
