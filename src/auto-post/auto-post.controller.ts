import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Logger,
  Param,
  Patch,
  Get,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AutoPostService } from './auto-post.service';
import {
  GetScheduledPostsQueryDto,
  SchedulePostDto,
  UpdatePostStatusDto,
  UpdateScheduledPostDto,
} from './dto/schedule-post.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Role } from 'src/auth/enums/role.enum';

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

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Get()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async getAllScheduledPosts(@Query() queryDto: GetScheduledPostsQueryDto) {
    this.logger.log('Received request to get all scheduled posts:', queryDto);
    return this.autoPostService.getAllScheduledPosts(queryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  async getScheduledPostById(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Received request to get scheduled post by ID: ${id}`);
    return this.autoPostService.getScheduledPostById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateScheduledPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScheduledPostDto,
  ) {
    this.logger.log(`Received request to update scheduled post ID: ${id}`);
    return this.autoPostService.updateScheduledPost(id, updateDto);
  }

  @Post('update-status')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStatusFromN8n(@Body() updatePostStatusDto: UpdatePostStatusDto) {
    this.logger.log(
      `Received status update from n8n for scheduleId: ${updatePostStatusDto.scheduleId}, status: ${updatePostStatusDto.status}`,
    );
    return this.autoPostService.updatePostStatus(updatePostStatusDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancelScheduledPost(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Received request to cancel post: ${id}`);
    return this.autoPostService.cancelSchedule(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScheduledPost(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Received request to delete scheduled post ID: ${id}`);
    await this.autoPostService.deleteScheduledPost(id);
  }
}
