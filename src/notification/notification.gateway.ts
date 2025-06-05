import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationService } from './notification.service';


@UseGuards(JwtAuthGuard)
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    @Inject(forwardRef(() => NotificationService)) private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Client connected ${userId}`);
    this.connectedClients.set(userId, client);

    const undelivered = await this.notificationService.getUndeliveredNotifications(userId);

    for (const notif of undelivered) {
      client.emit('new-notification', notif);
      await this.notificationService.markAsDelivered(notif.id);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.connectedClients.entries()).find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, sock]) => sock.id === client.id,
    )?.[0];
    if (userId) this.connectedClients.delete(userId);
  }

  sendToUser(userId: string, event: string, data: any) {
    const client = this.connectedClients.get(userId);
    if (client) client.emit(event, data);
  }
}