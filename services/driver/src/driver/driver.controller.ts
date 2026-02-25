import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { PresignDocumentDto } from '../dto/presign-document.dto';
import { UpsertVehicleDto } from '../dto/upsert-vehicle.dto';
import { ConnectMpDto } from '../dto/connect-mp.dto';
import { ReviewActionDto } from '../dto/review-action.dto';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

type AuthReq = {
  user: { sub: string; roles?: string[] };
  headers: { authorization?: string };
};

@ApiTags('drivers')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAccessGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('drivers/request')
  request(@Req() req: AuthReq) {
    return this.driverService.requestDriver(req.user.sub);
  }

  @Get('drivers/me')
  me(@Req() req: AuthReq) {
    return this.driverService.me(req.user.sub);
  }

  @Post('drivers/me/documents/presign')
  presign(@Req() req: AuthReq, @Body() dto: PresignDocumentDto) {
    return this.driverService.presignDocument(req.user.sub, dto);
  }

  @Post('drivers/mp-account')
  connectMp(@Req() req: AuthReq, @Body() dto: ConnectMpDto) {
    return this.driverService.connectMpAccount(req.user.sub, dto.mp_account_id);
  }

  @Post('drivers/me/vehicle')
  upsertVehicle(@Req() req: AuthReq, @Body() dto: UpsertVehicleDto) {
    return this.driverService.upsertVehicle(req.user.sub, dto);
  }

  @Get('admin/drivers/pending')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  adminPending() {
    return this.driverService.adminPending();
  }

  @Get('admin/drivers/:id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  adminDetail(@Param('id') id: string) {
    return this.driverService.adminDetail(id);
  }

  @Post('admin/drivers/:id/review-start')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  reviewStart(@Param('id') id: string, @Req() req: AuthReq) {
    return this.driverService.reviewStart(id, req.user.sub);
  }

  @Post('admin/drivers/:id/approve')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  approve(@Param('id') id: string, @Req() req: AuthReq) {
    return this.driverService.approve(id, req.user.sub, req.headers.authorization);
  }

  @Post('admin/drivers/:id/reject')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  reject(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: ReviewActionDto) {
    return this.driverService.reject(id, req.user.sub, dto.reason ?? 'Rejected by reviewer');
  }

  @Post('admin/drivers/:id/suspend')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  suspend(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: ReviewActionDto) {
    return this.driverService.suspend(id, req.user.sub, dto.reason ?? dto.notes ?? 'Suspended');
  }
}
