import { Controller, Get } from '@nestjs/common';
import { StatisticsService, StatCount } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getAll(): Promise<{
    aspectRatios: StatCount[];
    styles: StatCount[];
    posts_by_ai: StatCount[];
    total_ai_images: StatCount[];
    top_posts_by_ai: any;
    trending_prompts: any[];
  }> {
    return this.statisticsService.getAll();
  }
}
