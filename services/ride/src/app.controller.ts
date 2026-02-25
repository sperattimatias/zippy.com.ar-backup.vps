import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'ride', timestamp: new Date().toISOString() };
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok', service: 'ride', probe: 'liveness', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  readiness() {
    return { status: 'ok', service: 'ride', probe: 'readiness', uptime_seconds: process.uptime(), timestamp: new Date().toISOString() };
  }
}
