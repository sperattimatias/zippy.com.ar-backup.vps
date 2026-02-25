import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'payment', timestamp: new Date().toISOString() };
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok', service: 'payment', probe: 'liveness', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  readiness() {
    return { status: 'ok', service: 'payment', probe: 'readiness', uptime_seconds: process.uptime(), timestamp: new Date().toISOString() };
  }
}
