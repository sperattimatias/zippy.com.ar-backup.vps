import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth/auth.guard';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@ApiTags('gateway')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-only protected route example' })
  admin(@Req() req: { user: { sub: string; roles: string[] } }) {
    return {
      route: 'admin',
      user_id: req.user.sub,
      roles: req.user.roles,
    };
  }

  @Get('driver')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Driver-only protected route example' })
  driver(@Req() req: { user: { sub: string; roles: string[] } }) {
    return {
      route: 'driver',
      user_id: req.user.sub,
      roles: req.user.roles,
    };
  }

  @Get('ride')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('passenger', 'driver')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Passenger/driver protected route example' })
  ride(@Req() req: { user: { sub: string; roles: string[] } }) {
    return {
      route: 'ride',
      user_id: req.user.sub,
      roles: req.user.roles,
    };
  }

  @Get('payment')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authenticated-only protected route example' })
  payment(@Req() req: { user: { sub: string; roles: string[] } }) {
    return {
      route: 'payment',
      user_id: req.user.sub,
      roles: req.user.roles,
    };
  }
}
