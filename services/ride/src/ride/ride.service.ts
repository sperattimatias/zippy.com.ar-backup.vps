import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  ActorType,
  CancelReason,
  DeviationLevel,
  FraudSeverity,
  FraudSignalType,
  GeoZoneType,
  HoldStatus,
  HoldType,
  RestrictionStatus,
  SafetyAlertStatus,
  SafetyAlertType,
  ScoreEventType,
  LevelTier,
  TripActor,
  TripBidStatus,
  TripStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from './ride.gateway';
import { ScoreService } from '../score/score.service';
import { MeritocracyService } from '../meritocracy/meritocracy.service';
import { LevelAndBonusService } from '../levels/level-bonus.service';
import { FraudService } from '../fraud/fraud.service';
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
  RideCompleteMvpDto,
  RideRequestMvpDto,
  SafetyAlertFilterDto,
  SafetyAlertUpdateDto,
  TripRequestDto,
  VerifyOtpDto,
} from '../dto/ride.dto';

@Injectable()
export class RideService implements OnModuleInit {
  private locationThrottle = new Map<string, number>();
  private deviationWindow = new Map<string, { over300Since?: number; over700Since?: number; majorCount: number }>();
  private trackingAlertState = new Map<string, 'none' | 'minor' | 'major'>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: RideGateway,
    private readonly scoreService: ScoreService,
    private readonly merit: MeritocracyService,
    private readonly levelBonus: LevelAndBonusService,
    private readonly fraud: FraudService,
  ) {}

  onModuleInit() {
    setInterval(() => void this.autoMatchExpiredBiddingTrips(), 1000);
    setInterval(() => void this.scanTrackingLostTrips(), 5000);
    setInterval(() => void this.fraud.runPeriodicDetections(), 10 * 60 * 1000);
  }

  private nowMs() { return Date.now(); }
  private otpHash(otp: string) { return createHash('sha256').update(otp).digest('hex'); }
  private otpGenerate() { return `${Math.floor(100000 + Math.random() * 900000)}`; }
  private onlineRecent(lastSeen?: Date | null) { return !!lastSeen && (this.nowMs() - lastSeen.getTime() < 30_000); }

  private async addEvent(tripId: string, actorUserId: string | null, type: string, payload: unknown) {
    await this.prisma.tripEvent.create({ data: { trip_id: tripId, actor_user_id: actorUserId, type, payload_json: payload as any } });
  }

  private haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const r = 6371;
    const dLat = (bLat - aLat) * (Math.PI / 180);
    const dLng = (bLng - aLng) * (Math.PI / 180);
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  }

  private computeBasePrice(distanceKm?: number, etaMin?: number) {
    const fixed = 800;
    const kmRate = 250;
    const minRate = 80;
    const km = distanceKm ?? 5;
    const eta = etaMin ?? 10;
    return Math.round(fixed + km * kmRate + eta * minRate);
  }

  private buildBaseline(originLat: number, originLng: number, destLat: number, destLng: number, points = 20) {
    const poly = [] as Array<{ lat: number; lng: number }>;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      poly.push({ lat: originLat + (destLat - originLat) * t, lng: originLng + (destLng - originLng) * t });
    }
    return poly;
  }

  private pointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private distancePointToSegmentMeters(p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    // rough planar approximation
    const ax = a.lng, ay = a.lat, bx = b.lng, by = b.lat, px = p.lng, py = p.lat;
    const abx = bx - ax, aby = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ((abx * abx + aby * aby) || 1e-9)));
    const cx = ax + abx * t, cy = ay + aby * t;
    const km = this.haversineKm(py, px, cy, cx);
    return km * 1000;
  }

  private distanceToPolylineMeters(p: { lat: number; lng: number }, poly: Array<{ lat: number; lng: number }>) {
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < poly.length - 1; i++) min = Math.min(min, this.distancePointToSegmentMeters(p, poly[i], poly[i + 1]));
    return Number.isFinite(min) ? min : 0;
  }

  private async createSafetyAlert(tripId: string, type: SafetyAlertType, severity: number, message: string, payload: unknown, actorUserId: string | null) {
    const alert = await this.prisma.safetyAlert.create({ data: { trip_id: tripId, type, severity, message, payload_json: payload as any } });
    await this.addEvent(tripId, actorUserId, 'trip.safety.alert_created', { alert_id: alert.id, type, severity });
    this.ws.emitTrip(tripId, 'safety.alert', { id: alert.id, type, severity, message });
    this.ws.emitSosAlert('sos.alert.created', { id: alert.id, trip_id: tripId, type, severity, message });

    if (actorUserId) {
      if (type === SafetyAlertType.ENTERED_RED_ZONE) {
        await this.scoreService.applyScoreEvent({ user_id: actorUserId, actor_type: ActorType.DRIVER, type: ScoreEventType.ENTERED_RED_ZONE, delta: -10, trip_id: tripId, safety_alert_id: alert.id });
      } else if (type === SafetyAlertType.ROUTE_DEVIATION_MAJOR) {
        await this.scoreService.applyScoreEvent({ user_id: actorUserId, actor_type: ActorType.DRIVER, type: ScoreEventType.ROUTE_DEVIATION_MAJOR, delta: -15, trip_id: tripId, safety_alert_id: alert.id });
      } else if (type === SafetyAlertType.ROUTE_DEVIATION_MINOR) {
        await this.scoreService.applyScoreEvent({ user_id: actorUserId, actor_type: ActorType.DRIVER, type: ScoreEventType.ROUTE_DEVIATION_MINOR, delta: -5, trip_id: tripId, safety_alert_id: alert.id });
      } else if (type === SafetyAlertType.OTP_FAILED_MULTIPLE) {
        await this.scoreService.applyScoreEvent({ user_id: actorUserId, actor_type: ActorType.PASSENGER, type: ScoreEventType.OTP_FAILED_MULTIPLE, delta: -12, trip_id: tripId, safety_alert_id: alert.id });
      }
    }
    if (type === SafetyAlertType.TRACKING_LOST && severity >= 4) {
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (trip?.driver_user_id) await this.scoreService.applyScoreEvent({ user_id: trip.driver_user_id, actor_type: ActorType.DRIVER, type: ScoreEventType.TRACKING_LOST_MAJOR, delta: -10, trip_id: tripId, safety_alert_id: alert.id });
    }
    return alert;
  }

  private async applySafetyScore(tripId: string, delta: number) {
    const state = await this.prisma.tripSafetyState.upsert({ where: { trip_id: tripId }, update: { safety_score: { decrement: Math.abs(delta) } }, create: { trip_id: tripId, safety_score: 100 - Math.abs(delta) } });
    const refreshed = await this.prisma.tripSafetyState.findUnique({ where: { trip_id: tripId } });
    const score = refreshed?.safety_score ?? state.safety_score;
    if (score <= 70) this.ws.emitTrip(tripId, 'safety.checkin_required', { trip_id: tripId, safety_score: score });
    if (score <= 50) await this.createSafetyAlert(tripId, SafetyAlertType.MANUAL_SOS_TRIGGER, 4, 'Safety score critically low: contact SOS suggested', { safety_score: score }, null);
    if (score <= 35) await this.addEvent(tripId, null, 'trip.safety.flagged', { safety_score: score });
  }

  async presenceOnline(driverUserId: string, dto: PresenceOnlineDto) {
    const gate = await this.scoreService.ensureDriverCanGoOnline(driverUserId);
    const score = await this.scoreService.getOrCreateUserScore(driverUserId, ActorType.DRIVER);
    const peak = await this.merit.evaluatePeakGate(driverUserId, ActorType.DRIVER, score.score, score.status);
    if (!peak.allowed) throw new ForbiddenException('Peak gate denied for driver');

    const premium = await this.merit.getPremiumContext({ lat: dto.lat, lng: dto.lng }, ActorType.DRIVER, score.score);
    const premiumCfg = (await this.prisma.appConfig.findUnique({ where: { key: 'premium_zones' } }))?.value_json as any ?? { deny_low_driver: false };
    if (premium.zone && !premium.eligible && premiumCfg.deny_low_driver) {
      throw new ForbiddenException('Driver score not eligible for premium zone');
    }

    return this.prisma.driverPresence.upsert({
      where: { driver_user_id: driverUserId },
      update: { is_online: true, is_limited: gate.isLimited || peak.limitedMode || (premium.zone ? !premium.eligible : false), last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date(), vehicle_category: dto.category },
      create: { driver_user_id: driverUserId, is_online: true, is_limited: gate.isLimited || peak.limitedMode || (premium.zone ? !premium.eligible : false), last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date(), vehicle_category: dto.category },
    });
  }

  async presenceOffline(driverUserId: string) {
    await this.prisma.driverPresence.updateMany({ where: { driver_user_id: driverUserId }, data: { is_online: false } });
    return { message: 'offline' };
  }

  async presencePing(driverUserId: string, dto: PresencePingDto) {
    await this.prisma.driverPresence.updateMany({ where: { driver_user_id: driverUserId }, data: { last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date() } });
    return { message: 'pong' };
  }

  async requestTrip(passengerUserId: string, dto: TripRequestDto, headers?: { ip?: string; ua?: string; device?: string }) {
    const passengerScore = await this.scoreService.getOrCreateUserScore(passengerUserId, ActorType.PASSENGER);
    await this.fraud.captureFingerprint(passengerUserId, ActorType.PASSENGER, headers ?? {});
    const accountHold = await this.prisma.userHold.findFirst({ where: { user_id: passengerUserId, hold_type: HoldType.ACCOUNT_BLOCK, status: HoldStatus.ACTIVE, OR: [{ ends_at: null }, { ends_at: { gt: new Date() } }] } });
    if (accountHold) throw new ForbiddenException('Passenger blocked by active fraud hold');
    const peakGate = await this.merit.evaluatePeakGate(passengerUserId, ActorType.PASSENGER, passengerScore.score, passengerScore.status);
    if (!peakGate.allowed) throw new ForbiddenException('Peak gate denied for passenger');

    const premium = await this.merit.getPremiumContext({ lat: dto.origin_lat, lng: dto.origin_lng }, ActorType.PASSENGER, passengerScore.score);
    const premiumCfg = (await this.prisma.appConfig.findUnique({ where: { key: 'premium_zones' } }))?.value_json as any ?? { deny_low_passenger: false };
    if (premium.zone && !premium.eligible && premiumCfg.deny_low_passenger) throw new ForbiddenException('Passenger score not eligible for premium zone');

    const isRestrictedPassenger = passengerScore.status === RestrictionStatus.BLOCKED || passengerScore.score < 60;
    const biddingWindowMs = isRestrictedPassenger ? 25_000 : 45_000;

    const price_base = this.computeBasePrice(dto.distance_km, dto.eta_minutes);
    const expires = new Date(this.nowMs() + biddingWindowMs);

    const trip = await this.prisma.trip.create({
      data: {
        passenger_user_id: passengerUserId,
        status: TripStatus.BIDDING,
        origin_lat: dto.origin_lat,
        origin_lng: dto.origin_lng,
        origin_address: dto.origin_address,
        dest_lat: dto.dest_lat,
        dest_lng: dto.dest_lng,
        dest_address: dto.dest_address,
        distance_km: dto.distance_km,
        eta_minutes: dto.eta_minutes,
        price_base,
        bidding_expires_at: expires,
      },
    });

    const baseline = this.buildBaseline(dto.origin_lat, dto.origin_lng, dto.dest_lat, dto.dest_lng);
    await this.prisma.tripRouteBaseline.create({ data: { trip_id: trip.id, polyline_json: baseline as any } });
    await this.prisma.tripSafetyState.create({ data: { trip_id: trip.id, safety_score: 100, deviation_level: DeviationLevel.NONE } });

    await this.addEvent(trip.id, passengerUserId, 'trip.created', { price_base, baseline: 'heuristic_mvp' });
    await this.addEvent(trip.id, passengerUserId, 'trip.bidding.started', { bidding_expires_at: expires.toISOString(), merit_mode: isRestrictedPassenger ? 'limited' : 'normal' });

    this.ws.emitTrip(trip.id, 'trip.created', { trip_id: trip.id, status: trip.status });
    this.ws.emitToUser(passengerUserId, 'trip.priority.info', { trip_id: trip.id, mode: isRestrictedPassenger ? 'limited' : 'normal', premium_eligible: premium.eligible });

    const presences = await this.prisma.driverPresence.findMany({ where: { is_online: true, vehicle_category: dto.category } });
    const activeNearby = presences.filter((p) => this.onlineRecent(p.last_seen_at));
    const driverIds = activeNearby.map((p) => p.driver_user_id);
    const [scores, weightsCfg, premiumPrefCfg, dynTopNCfg, peakNow] = await Promise.all([
      this.prisma.userScore.findMany({ where: { actor_type: ActorType.DRIVER, user_id: { in: driverIds } } }),
      this.prisma.appConfig.findUnique({ where: { key: 'matching_weights' } }),
      this.prisma.appConfig.findUnique({ where: { key: 'premium_preference_by_tier' } }),
      this.prisma.appConfig.findUnique({ where: { key: 'dynamic_top_n' } }),
      this.merit.isPeakNow(),
    ]);
    const weights = (weightsCfg?.value_json as any) ?? { w_score: 0.45, w_distance: 0.35, w_reliability: 0.15, w_status: 0.05, w_peak: 0.10, w_zone: 0.10, w_tier: 0.05, top_n: 15, limited_penalty: 0.10, tier_bonus: { bronze: 0.05, silver: 0.15, gold: 0.30, diamond: 0.45 } };

    const premiumPref = (premiumPrefCfg?.value_json as any) ?? { eligible_additive_bonus: { bronze: 0.02, silver: 0.05, gold: 0.10, diamond: 0.15 }, ineligible_penalty: 0.05 };
    const dynTopN = (dynTopNCfg?.value_json as any) ?? { base: weights.top_n ?? 15, peak_add: 5, premium_zone_add: 3, restricted_passenger_cap: 10, min: 8, max: 25, limited_max_share: 0.30, reserve_high_tier: { gold: 2, diamond: 1 } };

    const scoreMap = new Map(scores.map((sc) => [sc.user_id, sc]));

    const levels = await this.prisma.userLevel.findMany({
      where: { actor_type: ActorType.DRIVER, user_id: { in: driverIds } },
    });
    const levelMap = new Map(levels.map((l) => [l.user_id, l.tier]));
    const maxDistance = Math.max(...activeNearby.map((p) => this.haversineKm(dto.origin_lat, dto.origin_lng, p.last_lat ?? dto.origin_lat, p.last_lng ?? dto.origin_lng)), 1);

    const prioritized = [] as Array<{ p: any; match: number }>;
    for (const p of activeNearby) {
      const us = scoreMap.get(p.driver_user_id);
      if (us?.status === RestrictionStatus.BLOCKED) continue;
      const driverScore = us?.score ?? 100;
      const distance = this.haversineKm(dto.origin_lat, dto.origin_lng, p.last_lat ?? dto.origin_lat, p.last_lng ?? dto.origin_lng);
      const normScore = driverScore / 100;
      const normDistanceInv = 1 - Math.min(1, distance / maxDistance);
      const statusBonus = us?.status === RestrictionStatus.NONE ? 1 : us?.status === RestrictionStatus.WARNING ? 0.5 : 0.2;
      const peakBonus = peakNow && driverScore >= 80 ? 0.3 : 0;
      const zone = await this.merit.getPremiumContext({ lat: dto.origin_lat, lng: dto.origin_lng }, ActorType.DRIVER, driverScore);
      const tier = levelMap.get(p.driver_user_id) as any;
      const tb = (weights.tier_bonus ?? {}) as any;
      const tierBonus =
        tier === 'DIAMOND' ? (tb.diamond ?? 0)
          : tier === 'GOLD' ? (tb.gold ?? 0)
            : tier === 'SILVER' ? (tb.silver ?? 0)
              : (tb.bronze ?? 0);

      let premiumBonus = zone.premium_bonus;
      if (zone.zone) {
        const pb = (premiumPref.eligible_additive_bonus ?? {}) as any;
        if (zone.eligible) {
          const add =
            tier === 'DIAMOND' ? (pb.diamond ?? 0)
              : tier === 'GOLD' ? (pb.gold ?? 0)
                : tier === 'SILVER' ? (pb.silver ?? 0)
                  : (pb.bronze ?? 0);
          premiumBonus += add;
        } else {
          premiumBonus -= (premiumPref.ineligible_penalty ?? 0);
        }
      }

      const limitedPenalty = p.is_limited ? (weights.limited_penalty ?? 0) : 0;
      const reliability = 1 - Math.min(1, (await this.prisma.scoreEvent.count({ where: { user_id: p.driver_user_id, actor_type: ActorType.DRIVER, type: { in: [ScoreEventType.DRIVER_CANCEL_LATE, ScoreEventType.DRIVER_NO_SHOW] }, created_at: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } })) / 10);

      const matchingScore =
        (weights.w_score * normScore) +
        (weights.w_distance * normDistanceInv) +
        (weights.w_reliability * reliability) +
        (weights.w_status * statusBonus) +
        (weights.w_peak * peakBonus) +
        (weights.w_zone * premiumBonus) +
        (weights.w_tier * tierBonus) -
        limitedPenalty;

      prioritized.push({ p, match: matchingScore });
    }

    prioritized.sort((a, b) => b.match - a.match);

    let topN = dynTopN.base ?? (weights.top_n ?? 15);
    if (peakNow) topN += (dynTopN.peak_add ?? 0);
    if (premium?.zone) topN += (dynTopN.premium_zone_add ?? 0);
    topN = Math.max(dynTopN.min ?? 8, Math.min(dynTopN.max ?? 25, topN));
    if (isRestrictedPassenger) topN = Math.min(dynTopN.restricted_passenger_cap ?? 10, topN);

    const limitedCap = Math.ceil(topN * (dynTopN.limited_max_share ?? 0.30));
    const selected: typeof prioritized = [];
    let limitedCount = 0;

    for (const item of prioritized) {
      if (selected.length >= topN) break;
      if (item.p.is_limited) {
        if (limitedCount >= limitedCap) continue;
        limitedCount += 1;
      }
      selected.push(item);
    }

    const reserves = (dynTopN.reserve_high_tier ?? {}) as any;
    const wantDiamond = reserves.diamond ?? 0;
    const wantGold = reserves.gold ?? 0;

    const countTier = (tier: string) => selected.filter((it) => (levelMap.get(it.p.driver_user_id) as any) === tier).length;

    const ensureTier = (tier: string, want: number) => {
      if (!want) return;
      let have = countTier(tier);
      if (have >= want) return;

      for (const cand of prioritized) {
        if (have >= want) break;
        const candTier = levelMap.get(cand.p.driver_user_id) as any;
        if (candTier !== tier) continue;
        if (selected.find((s) => s.p.driver_user_id === cand.p.driver_user_id)) continue;

        let replaceIdx = -1;
        for (let i = selected.length - 1; i >= 0; i--) {
          const t = levelMap.get(selected[i].p.driver_user_id) as any;
          if (t === 'BRONZE' || selected[i].p.is_limited) { replaceIdx = i; break; }
        }
        if (replaceIdx === -1) replaceIdx = selected.length - 1;

        const outLimited = selected[replaceIdx].p.is_limited;
        const inLimited = cand.p.is_limited;
        if (!outLimited && inLimited && limitedCount >= limitedCap) continue;
        if (outLimited && !inLimited) limitedCount = Math.max(0, limitedCount - 1);
        if (!outLimited && inLimited) limitedCount += 1;

        selected[replaceIdx] = cand;
        have += 1;
      }
    };

    ensureTier('DIAMOND', wantDiamond);
    ensureTier('GOLD', wantGold);

    for (const { p } of selected) {
      this.ws.emitToDriver(p.driver_user_id, 'trip.bidding.started', { trip_id: trip.id, origin_address: trip.origin_address, dest_address: trip.dest_address, price_base: trip.price_base, bidding_expires_at: trip.bidding_expires_at });
    }
    return trip;
  }

  async createBid(tripId: string, driverUserId: string, dto: CreateBidDto, headers?: { ip?: string; ua?: string; device?: string }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.BIDDING) throw new BadRequestException('Trip is not in bidding');

    const presence = await this.prisma.driverPresence.findUnique({ where: { driver_user_id: driverUserId } });
    if (!presence || !presence.is_online || !this.onlineRecent(presence.last_seen_at)) throw new ForbiddenException('Driver is offline');

    await this.fraud.captureFingerprint(driverUserId, ActorType.DRIVER, headers ?? {});

    const mp = await this.prisma.externalDriverProfile.findUnique({ where: { user_id: driverUserId } });
    if (!mp?.mp_account_id) throw new ForbiddenException('Driver must connect MercadoPago account before accepting trips');

    const min = Math.round(trip.price_base * 0.7), max = Math.round(trip.price_base * 2.0);
    if (dto.price_offer < min || dto.price_offer > max) throw new BadRequestException('Price offer out of allowed range');

    const bid = await this.prisma.tripBid.create({ data: { trip_id: tripId, driver_user_id: driverUserId, price_offer: dto.price_offer, eta_to_pickup_minutes: dto.eta_to_pickup_minutes } });
    await this.addEvent(trip.id, driverUserId, 'trip.bid.received', { bid_id: bid.id, price_offer: bid.price_offer });
    this.ws.emitTrip(trip.id, 'trip.bid.received', { bid_id: bid.id, driver_user_id: driverUserId, price_offer: bid.price_offer });
    return bid;
  }

  async acceptBid(tripId: string, passengerUserId: string, dto: AcceptBidDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (trip.status !== TripStatus.BIDDING) throw new BadRequestException('Trip is not in bidding');
    const bid = await this.prisma.tripBid.findUnique({ where: { id: dto.bid_id } });
    if (!bid || bid.trip_id !== tripId || bid.status !== TripBidStatus.PENDING) throw new BadRequestException('Invalid bid');

    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.MATCHED, driver_user_id: bid.driver_user_id, price_final: bid.price_offer, matched_at: new Date() } });
    await this.prisma.tripBid.updateMany({ where: { trip_id: tripId, id: { not: bid.id }, status: TripBidStatus.PENDING }, data: { status: TripBidStatus.REJECTED } });
    await this.prisma.tripBid.update({ where: { id: bid.id }, data: { status: TripBidStatus.ACCEPTED } });
    await this.addEvent(tripId, passengerUserId, 'trip.matched', { bid_id: bid.id, driver_user_id: bid.driver_user_id });
    this.ws.emitTrip(tripId, 'trip.matched', { trip_id: tripId, driver_user_id: bid.driver_user_id, price_final: updated.price_final });
    this.ws.emitToDriver(bid.driver_user_id, 'trip.matched', { trip_id: tripId, passenger_user_id: passengerUserId });
    return updated;
  }

  async autoMatchExpiredBiddingTrips() {
    const now = new Date();
    const trips = await this.prisma.trip.findMany({ where: { status: TripStatus.BIDDING, bidding_expires_at: { lt: now } } });
    for (const trip of trips) {
      const bids = await this.prisma.tripBid.findMany({ where: { trip_id: trip.id, status: TripBidStatus.PENDING } });
      if (!bids.length) {
        const updated = await this.prisma.trip.updateMany({ where: { id: trip.id, status: TripStatus.BIDDING }, data: { status: TripStatus.EXPIRED_NO_DRIVER } });
        if (updated.count === 0) continue;
        await this.addEvent(trip.id, null, 'trip.expired_no_driver', {});
        this.ws.emitTrip(trip.id, 'trip.cancelled', { trip_id: trip.id, status: TripStatus.EXPIRED_NO_DRIVER });
        continue;
      }

      const best = bids.map((b) => ({ b, score: b.price_offer + ((b.eta_to_pickup_minutes ?? 0) * 10) })).sort((a, b) => a.score - b.score)[0].b;

      const tx = await this.prisma.$transaction(async (trx) => {
        const claim = await trx.trip.updateMany({ where: { id: trip.id, status: TripStatus.BIDDING }, data: { status: TripStatus.MATCHED, driver_user_id: best.driver_user_id, price_final: best.price_offer, matched_at: new Date() } });
        if (claim.count === 0) return { matched: false as const };
        await trx.tripBid.updateMany({ where: { trip_id: trip.id, id: { not: best.id }, status: TripBidStatus.PENDING }, data: { status: TripBidStatus.REJECTED } });
        await trx.tripBid.update({ where: { id: best.id }, data: { status: TripBidStatus.AUTO_SELECTED } });
        return { matched: true as const };
      });
      if (!tx.matched) continue;
      await this.addEvent(trip.id, null, 'trip.matched', { bid_id: best.id, auto_selected: true });
      this.ws.emitTrip(trip.id, 'trip.matched', { trip_id: trip.id, driver_user_id: best.driver_user_id, auto_selected: true });
    }
  }

  private async getTripForDriver(tripId: string, driverUserId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driver_user_id !== driverUserId) throw new ForbiddenException('Not assigned driver');
    return trip;
  }

  async driverEnRoute(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.MATCHED) throw new BadRequestException('Invalid transition');
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.DRIVER_EN_ROUTE } });
    await this.addEvent(tripId, driverUserId, 'trip.driver.en_route', {});
    this.ws.emitTrip(tripId, 'trip.driver.en_route', { trip_id: tripId });
    return updated;
  }

  async driverArrived(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.DRIVER_EN_ROUTE) throw new BadRequestException('Invalid transition');
    await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.OTP_PENDING } });
    const otp = this.otpGenerate();

    // ✅ Prisma delegate corregido
    await this.prisma.tripOTP.upsert({
      where: { trip_id: tripId },
      update: { otp_hash: this.otpHash(otp), expires_at: new Date(this.nowMs() + 10 * 60 * 1000), attempts: 0, verified_at: null },
      create: { trip_id: tripId, otp_hash: this.otpHash(otp), expires_at: new Date(this.nowMs() + 10 * 60 * 1000), attempts: 0 },
    });

    await this.addEvent(tripId, driverUserId, 'trip.arrived', {});
    this.ws.emitTrip(tripId, 'trip.arrived', { trip_id: tripId });
    this.ws.emitToUser(trip.passenger_user_id, 'trip.otp.generated', { trip_id: tripId, otp });
    return { message: 'arrived' };
  }

  async verifyOtp(tripId: string, driverUserId: string, dto: VerifyOtpDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.OTP_PENDING) throw new BadRequestException('Invalid transition');

    // ✅ Prisma delegate corregido
    const otp = await this.prisma.tripOTP.findUnique({ where: { trip_id: tripId } });

    if (!otp) throw new BadRequestException('OTP not found');
    if (otp.expires_at < new Date()) throw new BadRequestException('OTP expired');
    if (otp.attempts >= 5) throw new ForbiddenException('OTP attempts exceeded');

    if (this.otpHash(dto.otp) !== otp.otp_hash) {
      await this.prisma.tripOTP.update({ where: { trip_id: tripId }, data: { attempts: { increment: 1 } } });
      if (otp.attempts + 1 >= 3) await this.createSafetyAlert(tripId, SafetyAlertType.OTP_FAILED_MULTIPLE, 3, 'Multiple OTP failures detected', { attempts: otp.attempts + 1 }, driverUserId);
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.tripOTP.update({ where: { trip_id: tripId }, data: { verified_at: new Date() } });

    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.IN_PROGRESS, started_at: new Date() } });
    await this.addEvent(tripId, driverUserId, 'trip.started', {});
    this.ws.emitTrip(tripId, 'trip.started', { trip_id: tripId });
    return updated;
  }

  async trackLocation(tripId: string, driverUserId: string, dto: LocationDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);

    // ✅ reemplazo de includes() para no romper tipos
    if (trip.status !== TripStatus.DRIVER_EN_ROUTE && trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Invalid status for location');
    }

    const key = `${tripId}:${driverUserId}`;
    const last = this.locationThrottle.get(key) ?? 0;
    if (this.nowMs() - last < 2000) throw new BadRequestException('Rate limit: 1 update / 2s');
    this.locationThrottle.set(key, this.nowMs());

    const loc = await this.prisma.tripLocation.create({ data: { trip_id: tripId, actor: TripActor.DRIVER, lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading } });
    await this.prisma.tripSafetyState.upsert({ where: { trip_id: tripId }, update: { last_driver_location_at: new Date() }, create: { trip_id: tripId, safety_score: 100, last_driver_location_at: new Date() } });

    const zones = await this.prisma.geoZone.findMany({ where: { is_active: true } });
    let zoneType: GeoZoneType | null = null;
    for (const z of zones.sort((a, b) => (a.type === 'RED' ? -1 : a.type === 'CAUTION' ? (b.type === 'RED' ? 1 : -1) : 1))) {
      const poly = z.polygon_json as any[];
      if (Array.isArray(poly) && this.pointInPolygon({ lat: dto.lat, lng: dto.lng }, poly)) { zoneType = z.type; break; }
    }

    const ss = await this.prisma.tripSafetyState.findUnique({ where: { trip_id: tripId } });
    if (zoneType && ss?.last_zone_type !== zoneType) {
      const type = zoneType === GeoZoneType.RED ? SafetyAlertType.ENTERED_RED_ZONE : SafetyAlertType.ENTERED_CAUTION_ZONE;
      const sev = zoneType === GeoZoneType.RED ? 5 : 3;
      await this.createSafetyAlert(tripId, type, sev, `Entered ${zoneType} zone`, { lat: dto.lat, lng: dto.lng }, driverUserId);
      await this.prisma.tripSafetyState.update({ where: { trip_id: tripId }, data: { last_zone_type: zoneType } });
      await this.applySafetyScore(tripId, zoneType === GeoZoneType.RED ? -25 : -10);
    }

    const baseline = await this.prisma.tripRouteBaseline.findUnique({ where: { trip_id: tripId } });
    const line = (baseline?.polyline_json ?? []) as any[];
    if (Array.isArray(line) && line.length > 1) {
      const deviationM = this.distanceToPolylineMeters({ lat: dto.lat, lng: dto.lng }, line);
      const now = this.nowMs();
      const window = this.deviationWindow.get(tripId) ?? { majorCount: 0 };

      if (deviationM > 700) {
        window.over700Since = window.over700Since ?? now;
      } else {
        window.over700Since = undefined;
      }

      if (deviationM > 300) {
        window.over300Since = window.over300Since ?? now;
      } else {
        window.over300Since = undefined;
      }

      const over700For20s = !!window.over700Since && now - window.over700Since >= 20_000;
      const over300For20s = !!window.over300Since && now - window.over300Since >= 20_000;

      if (over700For20s) {
        window.majorCount += 1;
        await this.prisma.tripSafetyState.update({ where: { trip_id: tripId }, data: { deviation_level: DeviationLevel.MAJOR } });
        await this.createSafetyAlert(tripId, SafetyAlertType.ROUTE_DEVIATION_MAJOR, 4, 'Major route deviation detected', { deviation_m: deviationM, sustained_s: 20, major_count: window.majorCount }, driverUserId);
        await this.applySafetyScore(tripId, -15);
        if (window.majorCount >= 2) {
          await this.createSafetyAlert(tripId, SafetyAlertType.ROUTE_DEVIATION_MAJOR, 5, 'Repeated major deviations detected', { major_count: window.majorCount }, driverUserId);
        }
        window.over700Since = now;
      } else if (over300For20s) {
        await this.prisma.tripSafetyState.update({ where: { trip_id: tripId }, data: { deviation_level: DeviationLevel.MINOR } });
        await this.createSafetyAlert(tripId, SafetyAlertType.ROUTE_DEVIATION_MINOR, 2, 'Minor route deviation detected', { deviation_m: deviationM, sustained_s: 20 }, driverUserId);
        await this.applySafetyScore(tripId, -5);
        window.over300Since = now;
      }

      this.deviationWindow.set(tripId, window);
    }

    this.ws.emitTrip(tripId, 'trip.location.update', { trip_id: tripId, lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading, created_at: loc.created_at });
    return loc;
  }

  async scanTrackingLostTrips() {
    const trips = await this.prisma.trip.findMany({ where: { status: { in: [TripStatus.DRIVER_EN_ROUTE, TripStatus.IN_PROGRESS] } }, include: { safety_state: true } });
    const now = this.nowMs();
    for (const t of trips) {
      const last = t.safety_state?.last_driver_location_at?.getTime();
      if (!last) continue;
      const delta = now - last;
      const current = this.trackingAlertState.get(t.id) ?? 'none';
      if (delta > 45_000 && current !== 'major') {
        await this.createSafetyAlert(t.id, SafetyAlertType.TRACKING_LOST, 4, 'Tracking lost >45s', { seconds: Math.floor(delta / 1000) }, null);
        await this.applySafetyScore(t.id, -15);
        this.trackingAlertState.set(t.id, 'major');
      } else if (delta > 15_000 && current === 'none') {
        await this.createSafetyAlert(t.id, SafetyAlertType.TRACKING_LOST, 2, 'Tracking delayed >15s', { seconds: Math.floor(delta / 1000) }, null);
        await this.applySafetyScore(t.id, -5);
        this.trackingAlertState.set(t.id, 'minor');
      } else if (delta <= 15_000) {
        this.trackingAlertState.set(t.id, 'none');
      }
    }
  }

  async completeTrip(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.IN_PROGRESS) throw new BadRequestException('Invalid transition');
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.COMPLETED, completed_at: new Date() } });
    await this.addEvent(tripId, driverUserId, 'trip.completed', {});
    await this.scoreService.applyScoreEvent({ user_id: driverUserId, actor_type: ActorType.DRIVER, type: ScoreEventType.TRIP_COMPLETED_CLEAN, delta: 2, trip_id: tripId });
    await this.scoreService.applyScoreEvent({ user_id: trip.passenger_user_id, actor_type: ActorType.PASSENGER, type: ScoreEventType.TRIP_COMPLETED_CLEAN, delta: 1, trip_id: tripId });
    await this.scoreService.applyRecoveryOnTripCompletion(driverUserId, ActorType.DRIVER);
    await this.scoreService.applyRecoveryOnTripCompletion(trip.passenger_user_id, ActorType.PASSENGER);
    await this.levelBonus.computeDriverLevel(driverUserId);
    await this.levelBonus.computePassengerLevel(trip.passenger_user_id);

    const since24 = new Date(Date.now() - 24 * 3600 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const thresholds = (await this.prisma.appConfig.findUnique({ where: { key: 'fraud_thresholds' } }))?.value_json as any ?? {};

    const pairTrips24 = await this.prisma.trip.findMany({ where: { passenger_user_id: trip.passenger_user_id, driver_user_id: driverUserId, status: TripStatus.COMPLETED, completed_at: { gte: since24 } }, select: { origin_lat: true, origin_lng: true, dest_lat: true, dest_lng: true, distance_km: true, price_final: true } });
    const pairTrips7 = await this.prisma.trip.count({ where: { passenger_user_id: trip.passenger_user_id, driver_user_id: driverUserId, status: TripStatus.COMPLETED, completed_at: { gte: since7d } } });
    const pair24 = pairTrips24.length;
    const pair7 = pairTrips7;

    if (pair24 >= (thresholds.repeated_pair_min_trips_for_pattern ?? 6) && (pair24 > (thresholds.repeated_pair_24h ?? 4) || pair7 > (thresholds.repeated_pair_7d ?? 12))) {
      const lowDistanceKm = thresholds.repeated_pair_low_distance_km ?? 2.0;
      const lowDistanceCount = pairTrips24.filter((t) => (t.distance_km ?? 999) < lowDistanceKm).length;
      const lowDistanceRatio = pair24 > 0 ? lowDistanceCount / pair24 : 0;
      const originCenter = pairTrips24[0] ?? null;
      const destCenter = pairTrips24[0] ?? null;
      const sameOrigin = originCenter ? pairTrips24.filter((t) => this.haversineKm(t.origin_lat, t.origin_lng, originCenter.origin_lat, originCenter.origin_lng) * 1000 <= (thresholds.repeated_pair_same_origin_radius_m ?? 250)).length : 0;
      const sameDest = destCenter ? pairTrips24.filter((t) => this.haversineKm(t.dest_lat, t.dest_lng, destCenter.dest_lat, destCenter.dest_lng) * 1000 <= (thresholds.repeated_pair_same_dest_radius_m ?? 250)).length : 0;
      const originSimilarity = pair24 > 0 ? sameOrigin / pair24 : 0;
      const destSimilarity = pair24 > 0 ? sameDest / pair24 : 0;
      const prices = pairTrips24.map((t) => t.price_final ?? 0).filter((v) => v > 0);
      const pmin = prices.length ? Math.min(...prices) : 0;
      const pmax = prices.length ? Math.max(...prices) : 0;
      const amountTight = prices.length > 1 ? (pmax - pmin) <= Math.max(500, pmin * 0.1) : false;

      const highPattern = (thresholds.repeated_pair_requires_low_distance ?? true)
        ? (lowDistanceRatio >= 0.7 && originSimilarity >= 0.7 && destSimilarity >= 0.7)
        : (originSimilarity >= 0.7 && destSimilarity >= 0.7);

      const severity = highPattern ? FraudSeverity.HIGH : FraudSeverity.LOW;
      const scoreDelta = highPattern ? 25 : 5;
      const payload = { pair_key: `${driverUserId}:${trip.passenger_user_id}`, count_24h: pair24, count_7d: pair7, low_distance_ratio: lowDistanceRatio, origin_cluster: originSimilarity, dest_cluster: destSimilarity, amount_tight: amountTight };
      await this.fraud.applySignal({ user_id: trip.passenger_user_id, trip_id: tripId, type: FraudSignalType.REPEATED_PAIR_TRIPS, severity, score_delta: scoreDelta, payload: { ...payload, driver_user_id: driverUserId } });
      await this.fraud.applySignal({ user_id: driverUserId, trip_id: tripId, type: FraudSignalType.REPEATED_PAIR_TRIPS, severity, score_delta: scoreDelta, payload: { ...payload, passenger_user_id: trip.passenger_user_id } });
    }

    this.ws.emitTrip(tripId, 'trip.completed', { trip_id: tripId });
    return updated;
  }

  async rateTrip(tripId: string, passengerUserId: string, dto: RateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (trip.status !== TripStatus.COMPLETED) throw new BadRequestException('Trip is not completed');
    await this.addEvent(tripId, passengerUserId, 'trip.rated', { rating: dto.rating, comment: dto.comment ?? null });
    return { message: 'rated' };
  }

  async cancelPassenger(tripId: string, passengerUserId: string, dto: CancelDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (trip.status === TripStatus.IN_PROGRESS && dto.reason !== CancelReason.SAFETY) throw new BadRequestException('Cannot cancel in_progress without SAFETY');
    if (trip.status === TripStatus.MATCHED && trip.driver_user_id && dto.reason !== CancelReason.SAFETY) {
      // allow cancel with moderate penalty (MVP)
    }
    const status = TripStatus.CANCELLED_BY_PASSENGER;
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status, cancelled_at: new Date(), cancelled_by_user_id: passengerUserId, cancel_reason: dto.reason } });
    const penalty = trip.status === TripStatus.DRIVER_EN_ROUTE ? 'light' : (trip.status === TripStatus.MATCHED && trip.driver_user_id ? 'moderate' : 'none');
    await this.addEvent(tripId, passengerUserId, 'trip.cancelled', { by: 'passenger', reason: dto.reason, penalty });
    if (trip.status === TripStatus.MATCHED && trip.driver_user_id) {
      await this.scoreService.applyScoreEvent({ user_id: passengerUserId, actor_type: ActorType.PASSENGER, type: ScoreEventType.PASSENGER_CANCEL_LATE, delta: -6, trip_id: tripId });
    }
    this.ws.emitTrip(tripId, 'trip.cancelled', { trip_id: tripId, status });
    return updated;
  }

  async cancelDriver(tripId: string, driverUserId: string, dto: CancelDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status === TripStatus.IN_PROGRESS && dto.reason !== CancelReason.SAFETY) throw new BadRequestException('Cannot cancel in_progress without SAFETY');
    const status = TripStatus.CANCELLED_BY_DRIVER;
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status, cancelled_at: new Date(), cancelled_by_user_id: driverUserId, cancel_reason: dto.reason } });
    await this.addEvent(tripId, driverUserId, 'trip.cancelled', { by: 'driver', reason: dto.reason, penalty: trip.status === TripStatus.DRIVER_EN_ROUTE ? 'strong' : 'none' });
    if (trip.status === TripStatus.DRIVER_EN_ROUTE) {
      await this.scoreService.applyScoreEvent({ user_id: driverUserId, actor_type: ActorType.DRIVER, type: ScoreEventType.DRIVER_CANCEL_LATE, delta: -8, trip_id: tripId });
    }
    this.ws.emitTrip(tripId, 'trip.cancelled', { trip_id: tripId, status });
    return updated;
  }

  private normalizePolygon(poly: Array<{ lat: number; lng: number }>) {
    if (!Array.isArray(poly) || poly.length < 3) throw new BadRequestException('polygon requires at least 3 points');
    const first = poly[0], last = poly[poly.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) poly = [...poly, first];
    return poly;
  }

  async createGeoZone(dto: GeoZoneCreateDto) {
    return this.prisma.geoZone.create({ data: { ...dto, polygon_json: this.normalizePolygon(dto.polygon_json) as any } });
  }
  async listGeoZones() { return this.prisma.geoZone.findMany({ orderBy: { created_at: 'desc' } }); }
  async patchGeoZone(id: string, dto: GeoZonePatchDto) {
    const data: any = { ...dto };
    if (dto.polygon_json) data.polygon_json = this.normalizePolygon(dto.polygon_json);
    return this.prisma.geoZone.update({ where: { id }, data });
  }
  async deleteGeoZone(id: string) { await this.prisma.geoZone.delete({ where: { id } }); return { message: 'deleted' }; }

  async listSafetyAlerts(filter: SafetyAlertFilterDto) {
    return this.prisma.safetyAlert.findMany({ where: filter.status ? { status: filter.status } : {}, orderBy: { created_at: 'desc' }, take: 200 });
  }

  async updateSafetyAlert(id: string, actorUserId: string, dto: SafetyAlertUpdateDto) {
    const data: any = { status: dto.status };
    if (dto.status === SafetyAlertStatus.ACKNOWLEDGED) { data.acknowledged_at = new Date(); data.acknowledged_by_user_id = actorUserId; }
    if (dto.status === SafetyAlertStatus.RESOLVED || dto.status === SafetyAlertStatus.DISMISSED) { data.resolved_at = new Date(); data.resolved_by_user_id = actorUserId; }
    const alert = await this.prisma.safetyAlert.update({ where: { id }, data });
    this.ws.emitSosAlert('sos.alert.updated', { id: alert.id, status: alert.status });
    return alert;
  }

  async tripSafety(tripId: string) {
    const safety = await this.prisma.tripSafetyState.findUnique({ where: { trip_id: tripId } });
    const alerts = await this.prisma.safetyAlert.findMany({ where: { trip_id: tripId }, orderBy: { created_at: 'desc' } });
    const locations = await this.prisma.tripLocation.findMany({ where: { trip_id: tripId }, orderBy: { created_at: 'desc' }, take: 20 });
    return { safety, alerts, locations };
  }

  async listScores(filter: { actor_type?: ActorType; status?: RestrictionStatus; q?: string }) {
    return this.scoreService.listScores(filter.actor_type, filter.status, filter.q);
  }

  async userScoreDetail(userId: string, actorType: ActorType) {
    return this.scoreService.getUserScoreDetail(userId, actorType);
  }

  async createManualRestriction(userId: string, actorUserId: string, dto: { actor_type: ActorType; status: RestrictionStatus; reason: any; ends_at?: string; notes?: string }) {
    return this.scoreService.createManualRestriction({
      user_id: userId,
      actor_type: dto.actor_type,
      status: dto.status,
      reason: dto.reason,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
      notes: dto.notes,
      created_by_user_id: actorUserId,
    });
  }

  async liftRestriction(id: string, actorUserId: string) {
    return this.scoreService.liftRestriction(id, actorUserId);
  }

  async adjustScore(userId: string, actorUserId: string, dto: { actor_type: ActorType; delta: number; notes?: string }) {
    return this.scoreService.adjustScore(userId, dto.actor_type, dto.delta, dto.notes, actorUserId);
  }

  async myBadge(userId: string, actorType: ActorType) {
    return this.merit.getMyBadge(userId, actorType);
  }

  async getConfig(key: string) {
    return this.merit.getConfigByKey(key);
  }

  async putConfig(key: string, value: unknown) {
    return this.merit.putConfig(key, value);
  }

  async listPremiumZones() {
    return this.prisma.premiumZone.findMany({ orderBy: { created_at: 'desc' } });
  }

  async createPremiumZone(dto: any) {
    return this.prisma.premiumZone.create({ data: dto });
  }

  async patchPremiumZone(id: string, dto: any) {
    return this.prisma.premiumZone.update({ where: { id }, data: dto });
  }

  async deletePremiumZone(id: string) {
    await this.prisma.premiumZone.delete({ where: { id } });
    return { message: 'deleted' };
  }

  async getDriverCurrentCommission(driverUserId: string) {
    return this.levelBonus.getActiveCommissionBps(driverUserId, new Date());
  }

  async adminListLevels(filter: { actor_type?: ActorType; tier?: LevelTier }) {
    return this.levelBonus.listLevels(filter.actor_type, filter.tier);
  }

  async adminListMonthlyPerformance(filter: { year: number; month: number; actor_type?: ActorType }) {
    return this.levelBonus.listMonthlyPerformance(filter.year, filter.month, filter.actor_type);
  }

  async adminListBonuses(filter: { year: number; month: number }) {
    return this.levelBonus.listBonuses(filter.year, filter.month);
  }

  async adminPutPolicy(key: string, value: unknown) {
    return this.levelBonus.putPolicy(key, value);
  }

  async adminRevokeBonus(id: string, reason: string) {
    return this.levelBonus.revokeBonus(id, reason);
  }

  async listFraudCases(filter: { status?: any; severity?: any; q?: string }) { return this.fraud.listCases(filter); }
  async getFraudCase(id: string) { return this.fraud.getCase(id); }
  async assignFraudCase(id: string, assignedToUserId: string) { return this.fraud.assignCase(id, assignedToUserId); }
  async resolveFraudCase(id: string, notes: string) { return this.fraud.resolveCase(id, notes); }
  async dismissFraudCase(id: string, notes: string) { return this.fraud.dismissCase(id, notes); }
  async userFraudRisk(userId: string) { return this.fraud.userRisk(userId); }
  async createFraudHold(actorUserId: string, dto: { user_id: string; hold_type: any; reason: string; ends_at?: string; notes?: unknown }) {
    const hours = dto.ends_at ? Math.max(1, Math.ceil((new Date(dto.ends_at).getTime() - Date.now()) / 3600000)) : undefined;
    return this.fraud.createHoldIfAbsent(dto.user_id, dto.hold_type, dto.reason, hours, actorUserId, { notes: dto.notes ?? null });
  }
  async releaseFraudHold(id: string, actorUserId: string) { return this.fraud.releaseHold(id, actorUserId); }


  private async emitRideEvent(rideId: string, eventType: 'ride.requested' | 'ride.accepted' | 'ride.completed', payload?: Record<string, unknown>) {
    await this.prisma.rideLifecycleEvent.create({
      data: {
        ride_id: rideId,
        event_type: eventType,
        payload: (payload ?? null) as any,
      },
    });
  }

  async requestRide(passengerUserId: string, dto: RideRequestMvpDto) {
    const ride = await this.prisma.ride.create({
      data: {
        passenger_user_id: passengerUserId,
        origin_lat: dto.origin_lat,
        origin_lng: dto.origin_lng,
        destination_lat: dto.destination_lat,
        destination_lng: dto.destination_lng,
        fare_estimated: dto.fare_estimated,
      },
    });

    await this.emitRideEvent(ride.id, 'ride.requested', {
      passenger_user_id: passengerUserId,
      fare_estimated: dto.fare_estimated,
    });

    return ride;
  }

  async acceptRide(rideId: string, driverUserId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'requested') throw new BadRequestException('Ride is not available for acceptance');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        assigned_driver_id: driverUserId,
        status: 'accepted',
        accepted_at: new Date(),
      },
    });

    await this.emitRideEvent(rideId, 'ride.accepted', {
      driver_user_id: driverUserId,
    });

    return updated;
  }

  async arriveRide(rideId: string, driverUserId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (!ride.assigned_driver_id || ride.assigned_driver_id !== driverUserId) {
      throw new ForbiddenException('Only assigned driver can change ride status');
    }
    if (ride.status !== 'accepted') throw new BadRequestException('Ride must be accepted before arriving');

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'arrived', arrived_at: new Date() },
    });
  }

  async startRide(rideId: string, driverUserId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (!ride.assigned_driver_id || ride.assigned_driver_id !== driverUserId) {
      throw new ForbiddenException('Only assigned driver can change ride status');
    }
    if (!['accepted', 'arrived'].includes(ride.status)) {
      throw new BadRequestException('Ride must be accepted or arrived before start');
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'started', started_at: new Date() },
    });
  }

  async completeRide(rideId: string, driverUserId: string, dto: RideCompleteMvpDto) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (!ride.assigned_driver_id || ride.assigned_driver_id !== driverUserId) {
      throw new ForbiddenException('Only assigned driver can change ride status');
    }
    if (ride.status !== 'started') throw new BadRequestException('Ride must be started before completion');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'completed',
        fare_final: dto.fare_final,
        completed_at: new Date(),
      },
    });

    await this.emitRideEvent(rideId, 'ride.completed', {
      driver_user_id: driverUserId,
      fare_final: dto.fare_final,
    });

    return updated;
  }

  async cancelRide(rideId: string, passengerUserId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.passenger_user_id !== passengerUserId) {
      throw new ForbiddenException('Only passenger can cancel this ride');
    }
    if (!['requested', 'accepted', 'arrived'].includes(ride.status)) {
      throw new BadRequestException('Ride cannot be cancelled after start');
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'cancelled', cancelled_at: new Date() },
    });
  }


  async markRidePaid(rideId: string, paymentId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        payment_status: 'paid',
        paid_at: new Date(),
      },
    });

    await this.prisma.rideLifecycleEvent.create({
      data: {
        ride_id: rideId,
        event_type: 'ride.payment.marked_paid',
        payload: { payment_id: paymentId } as any,
      },
    });

    return updated;
  }

  async listTripsRecent() { return this.prisma.trip.findMany({ orderBy: { created_at: 'desc' }, take: 100 }); }
  async tripDetail(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { events: { orderBy: { created_at: 'desc' } }, locations: { orderBy: { created_at: 'desc' }, take: 300 }, bids: true, safety_alerts: { orderBy: { created_at: 'desc' } }, safety_state: true } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }
}
