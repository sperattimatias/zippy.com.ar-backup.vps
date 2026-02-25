import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway({ namespace: '/rides' })
export class RideSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RideSocketGateway.name);

  handleConnection(client: { id: string }) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: { id: string }) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
