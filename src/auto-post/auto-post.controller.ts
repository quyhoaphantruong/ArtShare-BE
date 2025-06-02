import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Logger,
  Param,
  Patch,
} from '@nestjs/common';
import { AutoPostService } from './auto-post.service';
import { SchedulePostDto, UpdatePostStatusDto } from './dto/schedule-post.dto';

@Controller('auto-post')
export class AutoPostController {
  private readonly logger = new Logger(AutoPostController.name);
  constructor(private readonly autoPostService: AutoPostService) {}

  @Post('schedule')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async scheduleFacebookPost(@Body() schedulePostDto: SchedulePostDto) {
    this.logger.log(
      'Received request to schedule post:',
      schedulePostDto.facebookPageId,
    );
    return this.autoPostService.createSchedule(schedulePostDto);
  }

  // Endpoint for n8n to call back to update status
  @Post('update-status')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStatusFromN8n(@Body() updatePostStatusDto: UpdatePostStatusDto) {
    this.logger.log(
      'Received status update from n8n:',
      updatePostStatusDto.scheduleId,
      updatePostStatusDto.status,
    );
    return this.autoPostService.updatePostStatus(updatePostStatusDto);
  }

  @Patch(':id/cancel')
  async cancelScheduledPost(@Param('id') id: string) {
    this.logger.log(`Received request to cancel post: ${id}`);
    return this.autoPostService.cancelSchedule(id);
  }
}
