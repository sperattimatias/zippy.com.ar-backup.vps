import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth/auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@ApiTags('gateway')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/ping')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'sos')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected ping route only for admin/sos roles' })
  adminPing(@Req() req: { user: { email: string; roles: string[] } }) {
    return {
      message: 'pong',
      email: req.user.email,
      roles: req.user.roles,
    };
  }
}
