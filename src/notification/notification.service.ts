import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NotificationsGateway } from './notification.gateway';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  private readonly logger = new Logger(NotificationService.name);

  async createAndPush(userId: string, type: string, payload: object) {
    const notification = await this.create(userId, type, payload);

    this.notificationsGateway.sendToUser(
      userId,
      'new-notification',
      notification,
    );

    return notification;
  }

  async create(userId: string, type: string, payload: object) {
    return this.prisma.notification.create({
      data: {
        userId: userId,
        type,
        payload,
      },
    });
  }

  async getUserNotifications(userId: string, unreadOnly = true) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  @OnEvent('report.resolved')
  handleReportResolved(payload: {
    reporterId: string;
    reportId: string;
    reason: string;
  }) {
    this.logger.log('Caught report.resolved event, creating notification...');

    const notificationType = 'REPORT_RESOLVED';
    const notificationPayload = {
      message: `Your report regarding "${payload.reason}" has been reviewed and resolved.`,
      reportId: payload.reportId,
    };

    this.createAndPush(
      payload.reporterId,
      notificationType,
      notificationPayload,
    );
  }
}
