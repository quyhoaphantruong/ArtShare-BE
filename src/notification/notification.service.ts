import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { NotificationsGateway } from './notification.gateway';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    @Inject(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      forwardRef(() => require('./notification.gateway').NotificationsGateway),
    )
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

  async getUserNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    return notifications;
  }

  async markAsRead(notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    this.logger.log(`markAllAsRead for user ${userId}`);

    await this.prisma.notification.updateMany({
      where: { userId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUndeliveredNotifications(userId: string) {
    this.logger.log(`getUndeliveredNotifications for user ${userId}`);
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsDelivered(notificationId: string) {
    this.logger.log(`markAsDelivered for notification ${notificationId}`);
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  @OnEvent('report.resolved')
  async handleReportResolved(payload: {
    reporterId: string;
    reportId: string;
    reason: string;
    resolvedAt: string;
  }) {
    this.logger.log('Caught report.resolved event, creating notification...');

    const notificationType = 'REPORT_RESOLVED';
    const notificationPayload = {
      message: `Your report regarding "${payload.reason}" has been reviewed and resolved.`,
      reportId: payload.reportId,
      resolvedAt: payload.resolvedAt,
    };

    try {
      await this.createAndPush(
        payload.reporterId,
        notificationType,
        notificationPayload,
      );
      this.logger.log(
        `Notification successfully created & pushed to user ${payload.reporterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create/push notification for user ${payload.reporterId}:`,
        (error as Error).stack,
      );
    }
  }
}
