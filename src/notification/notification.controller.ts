import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Post('read')
  async markAsRead(@Body('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: CurrentUserType) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
