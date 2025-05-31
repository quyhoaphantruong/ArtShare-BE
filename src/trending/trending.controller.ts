import { Controller, Get } from '@nestjs/common';
import { TrendingService } from './trending.service';

@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get('promtps')
  async getTrendingPrompts() {
    return this.trendingService.getTrendingPrompts();
  }
}
