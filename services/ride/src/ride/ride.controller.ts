import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { RideService } from './ride.service';
import {
  AcceptBidDto,
  CancelDto,
  CreateBidDto,
  GeoZoneCreateDto,
  GeoZonePatchDto,
  LocationDto,
  PresenceOnlineDto,
  PresencePingDto,
  RateTripDto,
  SafetyAlertFilterDto,
  SafetyAlertUpdateDto,
  TripRequestDto,
  VerifyOtpDto,
  AdminScoreFilterDto,
  AdminScoreActorDto,
  CreateRestrictionDto,
  AdjustScoreDto,
  ConfigPutDto,
  PremiumZoneCreateDto,
  PremiumZonePatchDto,
  AdminLevelFilterDto,
  AdminMonthlyPerformanceFilterDto,
  AdminBonusesFilterDto,
  BonusRevokeDto,
  FraudCaseFilterDto,
  FraudCaseActionDto,
  CreateHoldDto,
} from '../dto/ride.dto';

type AuthReq = { user: { sub: string; roles: string[] } };

@ApiTags('ride')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAccessGuard, RolesGuard)
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Get('public/badges/me')
  myBadge(@Req() req: AuthReq, @Query() query: AdminScoreActorDto) {
    return this.rideService.myBadge(req.user.sub, query.actor_type);
  }

  @Post('drivers/presence/online')
  @Roles('driver')
  presenceOnline(@Req() req: AuthReq, @Body() dto: PresenceOnlineDto) { return this.rideService.presenceOnline(req.user.sub, dto); }

  @Post('drivers/presence/offline')
  @Roles('driver')
  presenceOffline(@Req() req: AuthReq) { return this.rideService.presenceOffline(req.user.sub); }

  @Post('drivers/presence/ping')
  @Roles('driver')
  presencePing(@Req() req: AuthReq, @Body() dto: PresencePingDto) { return this.rideService.presencePing(req.user.sub, dto); }


  @Get('drivers/commission/current')
  @Roles('driver')
  driverCurrentCommission(@Req() req: AuthReq) { return this.rideService.getDriverCurrentCommission(req.user.sub); }

  @Post('trips/request')
  @Roles('passenger')
  requestTrip(@Req() req: any, @Body() dto: TripRequestDto) { return this.rideService.requestTrip(req.user.sub, dto, { ip: req.headers['x-client-ip'] as string | undefined, ua: req.headers['x-client-ua'] as string | undefined, device: req.headers['x-device-fp'] as string | undefined }); }

  @Post('trips/:id/bids')
  @Roles('driver')
  createBid(@Req() req: any, @Param('id') id: string, @Body() dto: CreateBidDto) { return this.rideService.createBid(id, req.user.sub, dto, { ip: req.headers['x-client-ip'] as string | undefined, ua: req.headers['x-client-ua'] as string | undefined, device: req.headers['x-device-fp'] as string | undefined }); }

  @Post('trips/:id/accept-bid')
  @Roles('passenger')
  acceptBid(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: AcceptBidDto) { return this.rideService.acceptBid(id, req.user.sub, dto); }

  @Post('trips/:id/driver/en-route')
  @Roles('driver')
  driverEnRoute(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.driverEnRoute(id, req.user.sub); }

  @Post('trips/:id/driver/arrived')
  @Roles('driver')
  driverArrived(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.driverArrived(id, req.user.sub); }

  @Post('trips/:id/driver/verify-otp')
  @Roles('driver')
  verifyOtp(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: VerifyOtpDto) { return this.rideService.verifyOtp(id, req.user.sub, dto); }

  @Post('trips/:id/location')
  @Roles('driver')
  location(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: LocationDto) { return this.rideService.trackLocation(id, req.user.sub, dto); }

  @Post('trips/:id/complete')
  @Roles('driver')
  complete(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.completeTrip(id, req.user.sub); }

  @Post('trips/:id/rate')
  @Roles('passenger')
  rate(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: RateTripDto) { return this.rideService.rateTrip(id, req.user.sub, dto); }

  @Post('trips/:id/cancel')
  @Roles('passenger')
  cancelPassenger(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CancelDto) { return this.rideService.cancelPassenger(id, req.user.sub, dto); }

  @Post('trips/:id/driver/cancel')
  @Roles('driver')
  cancelDriver(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CancelDto) { return this.rideService.cancelDriver(id, req.user.sub, dto); }

  @Get('admin/trips')
  @Roles('admin', 'sos')
  adminTrips() { return this.rideService.listTripsRecent(); }

  @Get('admin/trips/:id')
  @Roles('admin', 'sos')
  adminTripDetail(@Param('id') id: string) { return this.rideService.tripDetail(id); }

  @Get('admin/trips/:id/safety')
  @Roles('admin', 'sos')
  adminTripSafety(@Param('id') id: string) { return this.rideService.tripSafety(id); }

  @Post('admin/geozones')
  @Roles('admin', 'sos')
  createGeoZone(@Body() dto: GeoZoneCreateDto) { return this.rideService.createGeoZone(dto); }

  @Get('admin/geozones')
  @Roles('admin', 'sos')
  listGeoZones() { return this.rideService.listGeoZones(); }

  @Patch('admin/geozones/:id')
  @Roles('admin', 'sos')
  patchGeoZone(@Param('id') id: string, @Body() dto: GeoZonePatchDto) { return this.rideService.patchGeoZone(id, dto); }

  @Delete('admin/geozones/:id')
  @Roles('admin', 'sos')
  deleteGeoZone(@Param('id') id: string) { return this.rideService.deleteGeoZone(id); }

  @Get('admin/safety-alerts')
  @Roles('admin', 'sos')
  listSafetyAlerts(@Query() filter: SafetyAlertFilterDto) { return this.rideService.listSafetyAlerts(filter); }

  @Patch('admin/safety-alerts/:id')
  @Roles('admin', 'sos')
  updateSafetyAlert(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: SafetyAlertUpdateDto) {
    return this.rideService.updateSafetyAlert(id, req.user.sub, dto);
  }

  @Get('admin/scores')
  @Roles('admin', 'sos')
  adminScores(@Query() filter: AdminScoreFilterDto) { return this.rideService.listScores(filter); }

  @Get('admin/users/:user_id/score')
  @Roles('admin', 'sos')
  adminUserScore(@Param('user_id') userId: string, @Query() query: AdminScoreActorDto) { return this.rideService.userScoreDetail(userId, query.actor_type); }

  @Post('admin/users/:user_id/restrictions')
  @Roles('admin', 'sos')
  adminCreateRestriction(@Req() req: AuthReq, @Param('user_id') userId: string, @Body() dto: CreateRestrictionDto) {
    return this.rideService.createManualRestriction(userId, req.user.sub, dto);
  }

  @Post('admin/restrictions/:id/lift')
  @Roles('admin', 'sos')
  adminLiftRestriction(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.liftRestriction(id, req.user.sub); }

  @Post('admin/users/:user_id/score/adjust')
  @Roles('admin', 'sos')
  adminAdjustScore(@Req() req: AuthReq, @Param('user_id') userId: string, @Body() dto: AdjustScoreDto) {
    return this.rideService.adjustScore(userId, req.user.sub, dto);
  }


  @Get('admin/config/:key')
  @Roles('admin', 'sos')
  adminGetConfig(@Param('key') key: string) { return this.rideService.getConfig(key); }

  @Put('admin/config/:key')
  @Roles('admin', 'sos')
  adminPutConfig(@Param('key') key: string, @Body() dto: ConfigPutDto) { return this.rideService.putConfig(key, dto.value_json); }



  @Get('admin/fraud/cases')
  @Roles('admin', 'sos')
  adminFraudCases(@Query() query: FraudCaseFilterDto) { return this.rideService.listFraudCases(query); }

  @Get('admin/fraud/cases/:id')
  @Roles('admin', 'sos')
  adminFraudCase(@Param('id') id: string) { return this.rideService.getFraudCase(id); }

  @Post('admin/fraud/cases/:id/assign')
  @Roles('admin', 'sos')
  adminFraudAssign(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: FraudCaseActionDto) { return this.rideService.assignFraudCase(id, dto.assigned_to_user_id ?? req.user.sub); }

  @Post('admin/fraud/cases/:id/resolve')
  @Roles('admin', 'sos')
  adminFraudResolve(@Param('id') id: string, @Body() dto: FraudCaseActionDto) { return this.rideService.resolveFraudCase(id, dto.notes ?? ''); }

  @Post('admin/fraud/cases/:id/dismiss')
  @Roles('admin', 'sos')
  adminFraudDismiss(@Param('id') id: string, @Body() dto: FraudCaseActionDto) { return this.rideService.dismissFraudCase(id, dto.notes ?? ''); }

  @Get('admin/fraud/users/:user_id/risk')
  @Roles('admin', 'sos')
  adminFraudUserRisk(@Param('user_id') userId: string) { return this.rideService.userFraudRisk(userId); }

  @Post('admin/fraud/holds/create')
  @Roles('admin', 'sos')
  adminFraudCreateHold(@Req() req: AuthReq, @Body() dto: CreateHoldDto) { return this.rideService.createFraudHold(req.user.sub, dto); }

  @Post('admin/fraud/holds/:id/release')
  @Roles('admin', 'sos')
  adminFraudReleaseHold(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.releaseFraudHold(id, req.user.sub); }

  @Get('admin/levels')
  @Roles('admin', 'sos')
  adminLevels(@Query() filter: AdminLevelFilterDto) { return this.rideService.adminListLevels(filter); }

  @Get('admin/monthly-performance')
  @Roles('admin', 'sos')
  adminMonthlyPerformance(@Query() filter: AdminMonthlyPerformanceFilterDto) { return this.rideService.adminListMonthlyPerformance(filter); }

  @Get('admin/bonuses')
  @Roles('admin', 'sos')
  adminBonuses(@Query() filter: AdminBonusesFilterDto) { return this.rideService.adminListBonuses(filter); }

  @Put('admin/policies/:key')
  @Roles('admin', 'sos')
  adminPutPolicy(@Param('key') key: string, @Body() dto: ConfigPutDto) { return this.rideService.adminPutPolicy(key, dto.value_json); }

  @Post('admin/bonuses/:id/revoke')
  @Roles('admin', 'sos')
  adminRevokeBonus(@Param('id') id: string, @Body() dto: BonusRevokeDto) { return this.rideService.adminRevokeBonus(id, dto.reason); }

  @Post('admin/premium-zones')
  @Roles('admin', 'sos')
  adminCreatePremiumZone(@Body() dto: PremiumZoneCreateDto) { return this.rideService.createPremiumZone(dto); }

  @Get('admin/premium-zones')
  @Roles('admin', 'sos')
  adminListPremiumZones() { return this.rideService.listPremiumZones(); }

  @Patch('admin/premium-zones/:id')
  @Roles('admin', 'sos')
  adminPatchPremiumZone(@Param('id') id: string, @Body() dto: PremiumZonePatchDto) { return this.rideService.patchPremiumZone(id, dto); }

  @Delete('admin/premium-zones/:id')
  @Roles('admin', 'sos')
  adminDeletePremiumZone(@Param('id') id: string) { return this.rideService.deletePremiumZone(id); }

}
