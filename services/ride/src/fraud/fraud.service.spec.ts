import { FraudSeverity, FraudSignalType, HoldType } from '@prisma/client';
import { FraudService } from './fraud.service';

describe('FraudService hardening', () => {
  it('dedupes repeated signals and increments occurrences', async () => {
    const prisma: any = {
      appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: { signal_dedupe_window_minutes: 30 } }) },
      fraudSignal: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1', payload_json: { occurrences: 2 }, created_at: new Date(), user_id: 'u1', severity: FraudSeverity.LOW, type: FraudSignalType.SHARED_IP_MULTIPLE_USERS }]),
        update: jest.fn(),
      },
      fraudCase: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', severity: FraudSeverity.LOW, created_at: new Date() }]), update: jest.fn() },
      fraudCaseSignalLink: { upsert: jest.fn() },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    const out = await svc.applySignal({ user_id: 'u1', type: FraudSignalType.SHARED_IP_MULTIPLE_USERS, severity: FraudSeverity.LOW, score_delta: 3, payload: {} });
    expect((out.signal.payload_json as any).occurrences).toBe(3);
    expect(prisma.fraudSignal.update).toHaveBeenCalled();
  });

  it('risk score clamps and creates hold for high', async () => {
    const prisma: any = {
      appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: {} }) },
      fraudSignal: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 's1', created_at: new Date(), user_id: 'u1', severity: FraudSeverity.HIGH, payload_json: {} }) },
      financialRiskScore: { upsert: jest.fn().mockResolvedValue({ user_id: 'u1', score: 45 }), update: jest.fn() },
      userHold: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ hold_type: HoldType.FEATURE_LIMIT }) },
      fraudCase: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'c1', severity: FraudSeverity.HIGH, title: 'x', created_at: new Date() }) },
      fraudCaseSignalLink: { upsert: jest.fn() },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    await svc.applySignal({ user_id: 'u1', type: FraudSignalType.MANUAL_REVIEW_TRIGGER, severity: FraudSeverity.HIGH, score_delta: 10 });
    expect(prisma.userHold.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hold_type: HoldType.FEATURE_LIMIT }) }));
  });

  it('auto-closes stale low cases', async () => {
    const prisma: any = {
      appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: { low_case_autoclose_days: 14 } }) },
      fraudCase: {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]),
        update: jest.fn(),
      },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    await svc.autoCloseLowCases();
    expect(prisma.fraudCase.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c1' } }));
  });

  it('decays risk when no signals in 30d', async () => {
    const prisma: any = {
      appConfig: { findUnique: jest.fn().mockResolvedValue({ value_json: { risk_decay_points_per_30d: 5 } }) },
      financialRiskScore: { findMany: jest.fn().mockResolvedValue([{ user_id: 'u1', score: 20 }]), update: jest.fn() },
      fraudSignal: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    await svc.decayRiskScores();
    expect(prisma.financialRiskScore.update).toHaveBeenCalled();
    expect(prisma.fraudSignal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: FraudSignalType.RISK_DECAY }) }));
  });
});
