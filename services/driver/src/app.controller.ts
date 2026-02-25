import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'driver', timestamp: new Date().toISOString() };
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok', service: 'driver', probe: 'liveness', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  readiness() {
    return { status: 'ok', service: 'driver', probe: 'readiness', uptime_seconds: process.uptime(), timestamp: new Date().toISOString() };
  }
}
