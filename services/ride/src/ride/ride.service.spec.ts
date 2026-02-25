import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActorType, FraudSeverity, FraudSignalType, RestrictionStatus, TripStatus } from '@prisma/client';
import { RideService } from './ride.service';

const fraudMock = () => ({
  captureFingerprint: jest.fn(),
  applySignal: jest.fn(),
  runPeriodicDetections: jest.fn(),
  listCases: jest.fn(),
  getCase: jest.fn(),
  assignCase: jest.fn(),
  resolveCase: jest.fn(),
  dismissCase: jest.fn(),
  userRisk: jest.fn(),
  createHoldIfAbsent: jest.fn(),
  releaseHold: jest.fn(),
});

describe('RideService antifraud hardening', () => {
  it('presence online blocked by score restriction', async () => {
    const service = new RideService({} as any, {} as any, { ensureDriverCanGoOnline: jest.fn().mockRejectedValue(new ForbiddenException('blocked')), getOrCreateUserScore: jest.fn() } as any, {} as any, {} as any, fraudMock() as any);
    await expect(service.presenceOnline('d1', { lat: 0, lng: 0, category: 'AUTO' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createBid captures fingerprint and requires mp account', async () => {
    const fraud = fraudMock();
    const prisma: any = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', status: TripStatus.BIDDING, price_base: 1000 }) },
      driverPresence: { findUnique: jest.fn().mockResolvedValue({ is_online: true, last_seen_at: new Date() }) },
      externalDriverProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new RideService(prisma, {} as any, {} as any, {} as any, {} as any, fraud as any);
    await expect(service.createBid('t1', 'd1', { price_offer: 1000 }, { ip: '1.1.1.1', ua: 'ua' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(fraud.captureFingerprint).toHaveBeenCalledWith('d1', ActorType.DRIVER, expect.any(Object));
  });

  it('repeated pair with low-distance clustered trips creates HIGH signal', async () => {
    const fraud = fraudMock();
    const prisma: any = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({ id: 't1', status: TripStatus.IN_PROGRESS, driver_user_id: 'd1', passenger_user_id: 'p1', distance_km: 1.2 }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue(Array.from({ length: 7 }).map(() => ({ origin_lat: 0, origin_lng: 0, dest_lat: 0.001, dest_lng: 0.001, distance_km: 1.0, price_final: 1000 }))),
        count: jest.fn().mockResolvedValue(7),
      },
      appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: { repeated_pair_24h: 4, repeated_pair_7d: 12, repeated_pair_min_trips_for_pattern: 6, repeated_pair_requires_low_distance: true, repeated_pair_low_distance_km: 2, repeated_pair_same_origin_radius_m: 250, repeated_pair_same_dest_radius_m: 250 } }) },
    };
    const scoreService: any = { applyScoreEvent: jest.fn(), applyRecoveryOnTripCompletion: jest.fn() };
    const service = new RideService(prisma, { emitTrip: jest.fn() } as any, scoreService, {} as any, { computeDriverLevel: jest.fn(), computePassengerLevel: jest.fn() } as any, fraud as any);
    await service.completeTrip('t1', 'd1');
    expect(fraud.applySignal).toHaveBeenCalledWith(expect.objectContaining({ type: FraudSignalType.REPEATED_PAIR_TRIPS, severity: FraudSeverity.HIGH, score_delta: 25 }));
  });

  it('invalid FSM transition fails', async () => {
    const prisma: any = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: TripStatus.MATCHED }) } };
    const service = new RideService(prisma, {} as any, {} as any, {} as any, {} as any, fraudMock() as any);
    await expect(service.completeTrip('t1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('matching excludes blocked drivers and orders by score', async () => {
    const ws: any = { emitTrip: jest.fn(), emitToDriver: jest.fn(), emitToUser: jest.fn() };
    const prisma: any = {
      trip: { create: jest.fn().mockResolvedValue({ id: 't1', status: 'BIDDING', origin_address: 'A', dest_address: 'B', price_base: 1000, bidding_expires_at: new Date() }) },
      tripRouteBaseline: { create: jest.fn().mockResolvedValue({}) },
      tripSafetyState: { create: jest.fn().mockResolvedValue({}) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      driverPresence: { findMany: jest.fn().mockResolvedValue([{ driver_user_id: 'dBlocked', last_seen_at: new Date(), last_lat: 0, last_lng: 0 }, { driver_user_id: 'dHigh', last_seen_at: new Date(), last_lat: 0, last_lng: 0 }, { driver_user_id: 'dLow', last_seen_at: new Date(), last_lat: 0, last_lng: 0 }]) },
      userScore: { findMany: jest.fn().mockResolvedValue([{ user_id: 'dBlocked', score: 95, status: RestrictionStatus.BLOCKED }, { user_id: 'dHigh', score: 99, status: RestrictionStatus.NONE }, { user_id: 'dLow', score: 20, status: RestrictionStatus.WARNING }]) },
      appConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      scoreEvent: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new RideService(prisma, ws, { getOrCreateUserScore: jest.fn().mockResolvedValue({ score: 80, status: RestrictionStatus.NONE }) } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false) } as any, {} as any, fraudMock() as any);
    await service.requestTrip('p1', { origin_lat: 0, origin_lng: 0, origin_address: 'A', dest_lat: 1, dest_lng: 1, dest_address: 'B', category: 'AUTO' as any }, {});
    expect(ws.emitToDriver.mock.calls[0][0]).toBe('dHigh');
    expect(ws.emitToDriver.mock.calls.some((c: any[]) => c[0] === 'dBlocked')).toBe(false);
  });
});
