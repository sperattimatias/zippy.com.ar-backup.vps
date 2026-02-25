import { ActorType, RestrictionStatus } from '@prisma/client';
import { MeritocracyService } from './meritocracy.service';

describe('MeritocracyService', () => {
  it('compute badge tier', () => {
    const svc = new MeritocracyService({} as any, {} as any);
    expect(svc.computeBadgeTier(95).tier).toBe('EXCELLENT');
    expect(svc.computeBadgeTier(80).tier).toBe('TRUSTED');
    expect(svc.computeBadgeTier(61).tier).toBe('WATCHLIST');
    expect(svc.computeBadgeTier(10).tier).toBe('RESTRICTED');
  });

  it('peak window crossing midnight', () => {
    const svc = new MeritocracyService({} as any, {} as any);
    const now = new Date();
    now.setHours(23, 30, 0, 0);
    const day = now.getDay();
    const ok = (svc as any).isInWindow(now, { days: [day], start: '23:00', end: '04:00' });
    expect(ok).toBe(true);
  });

  it('premium zone point-in-polygon gate', async () => {
    const prisma: any = { premiumZone: { findMany: jest.fn().mockResolvedValue([{ polygon_json: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }, { lat: 0, lng: 0 }], min_driver_score: 75, min_passenger_score: 60 }]) } };
    const svc = new MeritocracyService(prisma, {} as any);
    const ctx = await svc.getPremiumContext({ lat: 0.5, lng: 0.5 }, ActorType.DRIVER, 70);
    expect(ctx.eligible).toBe(false);
  });

  it('evaluate peak gate denies blocked', async () => {
    const prisma: any = { appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: { windows: [{ days: [new Date().getDay()], start: '00:00', end: '23:59' }], driver_min_score: 50 } }) }, peakGateEvent: { create: jest.fn() } };
    const ws: any = { emitToUser: jest.fn() };
    const svc = new MeritocracyService(prisma, ws);
    const out = await svc.evaluatePeakGate('u1', ActorType.DRIVER, 30, RestrictionStatus.BLOCKED);
    expect(out.allowed).toBe(false);
  });
});
