import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

@WebSocketGateway({ 
  namespace: '/notifications', 
  cors: {
    origin: true, // We'll configure this properly in the constructor
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Changed to store multiple connections per user
  private connectedClients = new Map<string, Set<Socket>>();
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    @Inject(forwardRef(() => NotificationService)) private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Configure CORS with environment variables after the server is initialized
    setTimeout(() => {
      if (this.server) {
        const allowedOrigins = [
          this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173',
          this.configService.get<string>('ADMIN_FRONTEND_URL') || 'http://localhost:1574',
        ];

        // Add production URLs if they exist
        const productionFrontendUrl = this.configService.get<string>('PRODUCTION_FRONTEND_URL');
        const productionAdminUrl = this.configService.get<string>('PRODUCTION_ADMIN_URL');
        
        if (productionFrontendUrl) allowedOrigins.push(productionFrontendUrl);
        if (productionAdminUrl) allowedOrigins.push(productionAdminUrl);

        // Remove any duplicates and empty strings
        const uniqueOrigins = [...new Set(allowedOrigins.filter(origin => origin))];

        this.logger.log(`Configuring WebSocket CORS with origins: ${uniqueOrigins.join(', ')}`);

        // Update the server's CORS configuration
        this.server.engine.opts.cors = {
          origin: uniqueOrigins,
          methods: ['GET', 'POST'],
          credentials: true,
        };
      }
    }, 0);
  }

  async handleConnection(client: Socket) {
    this.logger.log(`WebSocket connection attempt from: ${client.handshake.address}`);
    this.logger.log(`Origin: ${client.handshake.headers.origin}`);
    
    try {
      // Manually verify the JWT token since guards have timing issues with handleConnection
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.error('No token provided in handshake');
        client.emit('error', { message: 'Authentication failed: No token provided' });
        client.disconnect();
        return;
      }

      // Verify the token
      const secret = this.configService.get<string>('AT_SECRET');
      if (!secret) {
        this.logger.error('JWT secret not configured');
        client.emit('error', { message: 'Server configuration error' });
        client.disconnect();
        return;
      }

      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, { secret });
        this.logger.log(`Token verified successfully for user: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`);
        client.emit('error', { message: 'Authentication failed: Invalid token' });
        client.disconnect();
        return;
      }

      const userId = payload.userId;
      if (!userId) {
        this.logger.error('No userId in token payload');
        client.emit('error', { message: 'Authentication failed: Invalid token payload' });
        client.disconnect();
        return;
      }

      // Store user data on the socket for later use
      client.data.user = payload;

      this.logger.log(`Client connected ${userId}, socket ID: ${client.id}`);
      
      // Get or create the set of connections for this user
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)!.add(client);

      // Send undelivered notifications to the new connection
      const undelivered = await this.notificationService.getUndeliveredNotifications(userId);

      for (const notif of undelivered) {
        client.emit('new-notification', notif);
      }
      this.logger.log(`Sent ${undelivered.length} undelivered notifications to user ${userId} (connection ${client.id})`);
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Find the user ID for this specific socket
    const userId = Array.from(this.connectedClients.entries()).find(
      ([_, sockets]) => sockets.has(client),
    )?.[0];
    
    if (userId) {
      const userConnections = this.connectedClients.get(userId)!;
      userConnections.delete(client);
      
      // Remove the user entry if no connections remain
      if (userConnections.size === 0) {
        this.connectedClients.delete(userId);
        this.logger.log(`User ${userId} disconnected, no more connections`);
      } else {
        this.logger.log(`User ${userId} disconnected, ${userConnections.size} connection(s) remaining`);
      }
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const userConnections = this.connectedClients.get(userId);
    if (userConnections && userConnections.size > 0) {
      // Clean up disconnected sockets first
      const connectedSockets = Array.from(userConnections).filter(client => client.connected);
      
      // Update the set with only connected sockets
      if (connectedSockets.length !== userConnections.size) {
        // Incrementally remove stale sockets
        for (const socket of userConnections) {
          if (!socket.connected) {
            userConnections.delete(socket);
          }
        }
        
        // Remove the user entry if no connections remain
        if (connectedSockets.length === 0) {
          this.connectedClients.delete(userId);
          this.logger.log(`No connected clients found for user ${userId} after cleanup`);
          return;
        }
      }
      
      // Send to all connected sockets for this user
      // This ensures all tabs/windows receive the notification
      connectedSockets.forEach(socket => {
        socket.emit(event, data);
      });
      
      this.logger.log(`Sent ${event} to ${connectedSockets.length} connection(s) for user ${userId}`);
    } else {
      this.logger.log(`No connected clients found for user ${userId}`);
    }
  }

  // Periodic cleanup method to remove stale connections
  private cleanupStaleConnections() {
    for (const [userId, userConnections] of this.connectedClients.entries()) {
      const connectedSockets = Array.from(userConnections).filter(client => client.connected);
      
      if (connectedSockets.length === 0) {
        this.connectedClients.delete(userId);
        this.logger.log(`Cleaned up stale connections for user ${userId}`);
      } else if (connectedSockets.length !== userConnections.size) {
        userConnections.clear();
        connectedSockets.forEach(socket => userConnections.add(socket));
        this.logger.log(`Cleaned up ${userConnections.size - connectedSockets.length} stale connections for user ${userId}`);
      }
    }
  }

  // Call this method periodically (you can add a cron job or call it from a scheduled task)
  cleanupConnections() {
    this.cleanupStaleConnections();
  }

  getUserConnectionStatus(userId: string) {
    const userConnections = this.connectedClients.get(userId);
    const connectedCount = userConnections ? userConnections.size : 0;
    const isConnected = connectedCount > 0;
    
    this.logger.log(`Connection status for user ${userId}: ${connectedCount} connections, connected: ${isConnected}`);
    
    return {
      isConnected,
      connectionCount: connectedCount,
      connections: Array.from(userConnections || []).map(socket => ({
        id: socket.id,
        connected: socket.connected,
        address: socket.handshake.address
      }))
    };
  }
}