import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import type { NotificationsGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      forwardRef(() => require('./notification.gateway').NotificationsGateway),
    )
    private notificationsGateway: NotificationsGateway,
  ) {}

  private readonly logger = new Logger(NotificationService.name);

  async createAndPush(userId: string, type: string, payload: object) {
    const startTime = Date.now();
    this.logger.debug(`[${startTime}] Creating and pushing notification to user ${userId}, type: ${type}`);
    
    const notification = await this.create(userId, type, payload);
    const createTime = Date.now();
    this.logger.debug(`[${createTime}] Notification ${notification.id} created in ${createTime - startTime}ms`);

    this.logger.debug(`[${createTime}] Sending notification ${notification.id} to user ${userId} via WebSocket`);
    this.notificationsGateway.sendToUser(
      userId,
      'new-notification',
      notification,
    );
    
    const endTime = Date.now();
    this.logger.log(`[${endTime}] Notification ${notification.id} sent to user ${userId} - Total time: ${endTime - startTime}ms`);
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

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return count;
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
    // Note: Currently using isRead for delivery tracking
    // In the future, consider adding a separate 'delivered' field to the schema
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async getConnectionStatus(userId: string) {
    this.logger.log(`Getting connection status for user ${userId}`);
    return this.notificationsGateway.getUserConnectionStatus(userId);
  }

  async sendDebugPing(userId: string, data: any) {
    this.logger.log(`Sending debug ping to user ${userId}`);
    this.notificationsGateway.sendToUser(userId, 'debug-ping', data);
  }

  async getAllConnections() {
    this.logger.log('Getting all WebSocket connections');
    const gateway = this.notificationsGateway;
    const connectedClients = gateway['connectedClients'] as Map<string, Set<any>>;
    
    const connections = Array.from(connectedClients.entries()).map(([userId, sockets]) => ({
      userId,
      connectionCount: sockets.size,
      connections: Array.from(sockets).map((socket: any) => ({
        id: socket.id,
        connected: socket.connected,
        address: socket.handshake?.address,
        userAgent: socket.handshake?.headers?.['user-agent'],
        origin: socket.handshake?.headers?.origin
      }))
    }));
    
    return {
      totalUsers: connections.length,
      totalConnections: connections.reduce((sum, user) => sum + user.connectionCount, 0),
      connections
    };
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
    
    // Check if a notification for this report resolution already exists
    // to prevent duplicate notifications
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        userId: payload.reporterId,
        type: notificationType,
        payload: {
          path: ['reportId'],
          equals: payload.reportId,
        },
      },
    });

    if (existingNotification) {
      this.logger.log(
        `Notification for report ${payload.reportId} already exists for user ${payload.reporterId}, skipping duplicate`
      );
      return;
    }

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
