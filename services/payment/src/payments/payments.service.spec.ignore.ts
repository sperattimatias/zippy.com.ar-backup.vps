import { HoldType, PaymentStatus, SettlementStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('create preference calculates commission and floor', async () => {
    const prisma: any = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', status: 'COMPLETED', passenger_user_id: 'p1', driver_user_id: 'd1', price_final: 10000, currency: 'ARS', completed_at: new Date() }) },
      tripPayment: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'pay1' }) },
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ user_id: 'd1', mp_account_id: 'mpa_1' }) },
      commissionPolicy: { findUnique: jest.fn().mockResolvedValueOnce({ value_json: 1000 }).mockResolvedValueOnce({ value_json: { commission_floor_bps: 200 } }) },
      monthlyBonusLedger: { findFirst: jest.fn().mockResolvedValue({ discount_bps: 900 }) },
      clientFingerprint: { create: jest.fn() },
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.createPreference('p1', 't1');
    expect(out.commission_amount).toBe(200);
  });

  it('webhook approved is idempotent and does not duplicate ledger', async () => {
    const prisma: any = {
      tripPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', driver_user_id: 'd1', amount_total: 1000, commission_amount: 100, driver_net_amount: 900, status: PaymentStatus.PENDING, mp_payment_id: null }),
        update: jest.fn(),
      },
      ledgerEntry: { count: jest.fn().mockResolvedValue(1), createMany: jest.fn() },
      driverPayoutSummary: { findUnique: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
      userHold: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.processWebhook('{}', undefined, { status: 'approved', data: { id: 'mpp_1' } });
    expect(out.status).toBe(PaymentStatus.APPROVED);
    expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('rejected webhook marks settlement failed', async () => {
    const prisma: any = {
      tripPayment: { findFirst: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', status: PaymentStatus.PENDING, mp_payment_id: null }), update: jest.fn() },
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.processWebhook('{}', undefined, { status: 'rejected', data: { id: 'mpp_2' } });
    expect(out.status).toBe(PaymentStatus.REJECTED);
    expect(prisma.tripPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ settlement_status: SettlementStatus.FAILED }) }));
  });

  it('rounding deterministic split always sums refund amount', () => {
    const svc: any = new PaymentsService({});
    const a = svc.computeRefundSplit(3333, 9999, 1429);
    expect(a.commissionReversal + a.driverReversal).toBe(3333);
    const b = svc.computeRefundSplit(1, 3, 1);
    expect(b.commissionReversal + b.driverReversal).toBe(1);
  });

  it('full refund flips status to REFUNDED and settlement FAILED', async () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma: any = {
      $executeRawUnsafe: jest.fn(),
      tripPayment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', driver_user_id: 'd1', amount_total: 10000, refunded_amount: 9000, commission_amount: 1000, driver_net_amount: 9000, mp_payment_id: 'mp1', status: PaymentStatus.APPROVED, settlement_status: SettlementStatus.SETTLED }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(4),
      },
      tripRefund: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      ledgerEntry: { createMany: jest.fn() },
      driverPayoutSummary: { findUnique: jest.fn().mockResolvedValue({ total_gross: BigInt(10000), total_commission: BigInt(1000), total_bonus_discount: BigInt(0), total_net: BigInt(9000) }), upsert: jest.fn() },
      trip: { findUnique: jest.fn().mockResolvedValue({ completed_at: new Date('2025-12-10T00:00:00.000Z') }) },
      bonusAdjustment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      fraudSignal: { create: jest.fn() },
      userHold: { findFirst: jest.fn().mockResolvedValue({ id: 'h1', hold_type: HoldType.PAYOUT_HOLD, status: 'ACTIVE' }) },
      monthlyBonusLedger: { findFirst: jest.fn(), update: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
    const svc: any = new PaymentsService(prisma);
    svc.mpRefund = jest.fn().mockResolvedValue({ id: 'mpr_1', status: 'approved' });
    await svc.adminRefundTripPayment('pay1', 1000, 'full', 'admin1');
    expect(prisma.tripPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.REFUNDED, settlement_status: SettlementStatus.FAILED, is_fully_refunded: true }) }));
    jest.useRealTimers();
  });

  it('refund ratio high creates fraud signal and payout hold', async () => {
    const prisma: any = {
      $executeRawUnsafe: jest.fn(),
      tripPayment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', driver_user_id: 'd1', amount_total: 10000, refunded_amount: 0, commission_amount: 1000, driver_net_amount: 9000, mp_payment_id: 'mp1', status: PaymentStatus.APPROVED, settlement_status: SettlementStatus.SETTLED }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
      },
      tripRefund: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(4),
      },
      ledgerEntry: { createMany: jest.fn() },
      driverPayoutSummary: { findUnique: jest.fn().mockResolvedValue({ total_gross: BigInt(10000), total_commission: BigInt(1000), total_bonus_discount: BigInt(0), total_net: BigInt(9000) }), upsert: jest.fn() },
      trip: { findUnique: jest.fn().mockResolvedValue({ completed_at: new Date() }) },
      bonusAdjustment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      fraudSignal: { create: jest.fn() },
      userHold: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      monthlyBonusLedger: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const svc: any = new PaymentsService(prisma);
    svc.mpRefund = jest.fn().mockResolvedValue({ id: 'mpr_1', status: 'approved' });
    await svc.adminRefundTripPayment('pay1', 1000, 'ratio', 'admin1');
    expect(prisma.fraudSignal.create).toHaveBeenCalled();
    expect(prisma.userHold.create).toHaveBeenCalled();
  });
});
