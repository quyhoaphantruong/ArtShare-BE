import { Controller, Get } from '@nestjs/common';
import { StatisticsService, StatCount } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getAll(): Promise<{
    aspectRatios: StatCount[];
    lightings: StatCount[];
    styles: StatCount[];
  }> {
    return this.statisticsService.getAll();
  }
}
