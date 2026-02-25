import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({ namespace: '/rides', cors: { origin: '*' } })
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RideGateway.name);

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async handleConnection(client: Socket) {
    const authHeader = (client.handshake.headers.authorization as string | undefined) ??
      (client.handshake.auth?.token ? `Bearer ${client.handshake.auth.token}` : undefined);

    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = authHeader.slice(7);
    try {
      const user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
      (client.data as any).user = user;
      client.join(`user:${user.sub}`);
      if (Array.isArray(user.roles) && user.roles.includes('driver')) client.join(`driver:${user.sub}`);
      if (Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('sos'))) client.join('sos:alerts');
      this.logger.log(`socket connected ${client.id} user=${user.sub}`);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  handleDisconnect(client: Socket) { this.logger.log(`socket disconnected ${client.id}`); }
  emitTrip(tripId: string, event: string, payload: unknown) { this.server.to(`trip:${tripId}`).emit(event, payload); }
  emitToDriver(driverUserId: string, event: string, payload: unknown) { this.server.to(`driver:${driverUserId}`).emit(event, payload); }
  emitToUser(userId: string, event: string, payload: unknown) { this.server.to(`user:${userId}`).emit(event, payload); }
  emitSosAlert(event: string, payload: unknown) { this.server.to('sos:alerts').emit(event, payload); }
}
