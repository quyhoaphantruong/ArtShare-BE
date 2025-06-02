import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.connectedClients.set(userId, client);
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