import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import { FraudSeverity, FraudSignalType, HoldStatus, HoldType, LedgerActor, LedgerEntryType, PaymentStatus, RefundStatus, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private toInt(v: bigint | number) { return Number(v); }

  private async mpRefund(paymentId: string, amount: number, reason: string) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return { id: `mock_ref_${paymentId}_${Date.now()}`, status: 'approved', amount, reason };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`MP refund failed: ${res.status} ${await res.text()}`);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getActiveCommissionBps(driverUserId: string, at: Date) {
    // Preferred: ask ride service for meritocracy-based commission (tier + discount + floor).
    const rideUrl = process.env.RIDE_SERVICE_URL;
    if (rideUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(`${rideUrl}/internal/commission/driver/${driverUserId}?at=${encodeURIComponent(at.toISOString())}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        if (res.ok) {
          const json: any = await res.json();
          return {
            default_bps: Number(json?.tier_bps ?? json?.effective_bps ?? 1000),
            discount_bps: Number(json?.discount_bps ?? 0),
            effective_bps: Number(json?.effective_bps ?? 1000),
            tier: json?.tier,
          } as any;
        }
        this.logger.warn(`Ride commission endpoint failed: ${res.status} ${await res.text()}`);
      } catch (e: any) {
        this.logger.warn(`Ride commission endpoint error: ${e?.message ?? e}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    // Fallback: legacy policy-based commission (still supports monthly bonus discount).
    const defaultRow = await this.prisma.commissionPolicy.findUnique({ where: { key: 'default_commission_bps' } });
    const bonusRow = await this.prisma.monthlyBonusLedger.findFirst({
      where: { driver_user_id: driverUserId, status: 'ACTIVE', starts_at: { lte: at }, ends_at: { gte: at } },
      orderBy: { starts_at: 'desc' },
    });
    const rulesRow = await this.prisma.commissionPolicy.findUnique({ where: { key: 'bonus_rules' } });
    const defaultBps = Number(defaultRow?.value_json ?? 1000);
    const floor = Number((rulesRow?.value_json as any)?.commission_floor_bps ?? 200);
    const discount = bonusRow?.discount_bps ?? 0;
    return { default_bps: defaultBps, discount_bps: discount, effective_bps: Math.max(defaultBps - discount, floor) };
  }

  private hash(v?: string | null) { return v ? createHash('sha256').update(v).digest('hex') : null; }

  private async captureFingerprint(userId: string, headers?: { ip?: string; ua?: string; device?: string }) {
    await this.prisma.clientFingerprint.create({
      data: {
        id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        actor_type: 'PASSENGER' as any,
        ip_hash: this.hash(headers?.ip) ?? this.hash('unknown')!,
        user_agent_hash: this.hash(headers?.ua) ?? this.hash('unknown')!,
        device_fingerprint_hash: this.hash(headers?.device),
        created_at: new Date(),
      },
    });
  }

  async createPreference(passengerUserId: string, tripId: string, headers?: { ip?: string; ua?: string; device?: string }) {
    await this.captureFingerprint(passengerUserId, headers);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new BadRequestException('Trip not found');
    if (trip.status !== 'COMPLETED') throw new BadRequestException('Trip must be completed');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (!trip.driver_user_id) throw new BadRequestException('Trip missing driver');
    if (!trip.price_final || trip.price_final <= 0) throw new BadRequestException('Trip has no final price');

    const existing = await this.prisma.tripPayment.findUnique({ where: { trip_id: tripId } });
    if (existing) throw new BadRequestException('Trip payment already exists');

    const driver = await this.prisma.driverProfile.findUnique({ where: { user_id: trip.driver_user_id } });
    if (!driver?.mp_account_id) throw new BadRequestException('Driver has no MercadoPago account connected');

    const commission = await this.getActiveCommissionBps(trip.driver_user_id, trip.completed_at ?? new Date());
    const total = trip.price_final;
    const commissionAmount = Math.floor((total * commission.effective_bps) / 10000);
    const driverNet = total - commissionAmount;

    const prefId = `pref_${trip.id}_${Date.now()}`;
    const initPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${prefId}`;

    const payment = await this.prisma.tripPayment.create({
      data: {
        trip_id: trip.id,
        passenger_user_id: passengerUserId,
        driver_user_id: trip.driver_user_id,
        amount_total: total,
        currency: trip.currency || 'ARS',
        commission_bps_applied: commission.effective_bps,
        commission_amount: commissionAmount,
        driver_net_amount: driverNet,
        mp_preference_id: prefId,
        status: PaymentStatus.CREATED,
        settlement_status: SettlementStatus.NOT_SETTLED,
      },
    });

    return { payment_id: payment.id, mp_preference_id: prefId, init_point: initPoint, amount_total: total, commission_amount: commissionAmount, driver_net_amount: driverNet };
  }

  private verifyWebhookSignature(body: string, signature?: string) {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
  }

  async processWebhook(rawBody: string, signature: string | undefined, payload: any) {
    if (!this.verifyWebhookSignature(rawBody, signature)) throw new ForbiddenException('Invalid MP signature');
    const paymentId = payload?.data?.id ? String(payload.data.id) : undefined;
    const externalRef = payload?.external_reference ?? payload?.data?.external_reference;
    if (!paymentId && !externalRef) throw new BadRequestException('payment reference missing');

    const tripPayment = paymentId
      ? await this.prisma.tripPayment.findFirst({ where: { OR: [{ mp_payment_id: paymentId }, { mp_preference_id: payload?.preference_id }] } })
      : await this.prisma.tripPayment.findUnique({ where: { trip_id: String(externalRef) } });
    if (!tripPayment) throw new BadRequestException('TripPayment not found');

    const normalizedStatus = String(payload?.status ?? '').toUpperCase();
    if (tripPayment.status === PaymentStatus.APPROVED) return { ok: true, idempotent: true };

    if (normalizedStatus === 'APPROVED') {
      await this.prisma.$transaction(async (trx: any) => {
        const payoutHold = await trx.userHold.findFirst({ where: { user_id: tripPayment.driver_user_id, hold_type: 'PAYOUT_HOLD' as any, status: 'ACTIVE' as any, OR: [{ ends_at: null }, { ends_at: { gt: new Date() } }] } });
        await trx.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.APPROVED, settlement_status: payoutHold ? SettlementStatus.NOT_SETTLED : SettlementStatus.SETTLED, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });

        const existing = await trx.ledgerEntry.count({ where: { trip_id: tripPayment.trip_id, type: LedgerEntryType.DRIVER_EARNING } });
        if (existing > 0) return;

        await trx.ledgerEntry.createMany({
          data: [
            { actor_type: LedgerActor.PLATFORM, actor_user_id: null, trip_id: tripPayment.trip_id, type: LedgerEntryType.PLATFORM_COMMISSION, amount: tripPayment.commission_amount, reference_id: paymentId ?? null, payload_json: { held: !!payoutHold } as any },
            { actor_type: LedgerActor.DRIVER, actor_user_id: tripPayment.driver_user_id, trip_id: tripPayment.trip_id, type: LedgerEntryType.DRIVER_EARNING, amount: tripPayment.driver_net_amount, reference_id: paymentId ?? null, payload_json: { held: !!payoutHold } as any },
            { actor_type: LedgerActor.DRIVER, actor_user_id: tripPayment.driver_user_id, trip_id: tripPayment.trip_id, type: LedgerEntryType.TRIP_REVENUE, amount: tripPayment.amount_total, reference_id: paymentId ?? null, payload_json: { held: !!payoutHold } as any },
          ],
        });

        const summary = await trx.driverPayoutSummary.findUnique({ where: { driver_user_id: tripPayment.driver_user_id } });
        const data = {
          total_gross: BigInt((summary?.total_gross ?? BigInt(0)) + BigInt(tripPayment.amount_total)),
          total_commission: BigInt((summary?.total_commission ?? BigInt(0)) + BigInt(tripPayment.commission_amount)),
          total_bonus_discount: BigInt(summary?.total_bonus_discount ?? BigInt(0)),
          total_net: BigInt((summary?.total_net ?? BigInt(0)) + BigInt(tripPayment.driver_net_amount)),
        };
        await trx.driverPayoutSummary.upsert({ where: { driver_user_id: tripPayment.driver_user_id }, update: data, create: { driver_user_id: tripPayment.driver_user_id, ...data } });
      });
      return { ok: true, status: PaymentStatus.APPROVED };
    }

    if (['REJECTED', 'CANCELLED'].includes(normalizedStatus)) {
      await this.prisma.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.REJECTED, settlement_status: SettlementStatus.FAILED, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });
      return { ok: true, status: PaymentStatus.REJECTED };
    }

    await this.prisma.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.PENDING, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });
    return { ok: true, status: PaymentStatus.PENDING };
  }

  async driverFinanceSummary(driverUserId: string) {
    const summary = await this.prisma.driverPayoutSummary.findUnique({ where: { driver_user_id: driverUserId } });
    const from = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const last30 = await this.prisma.tripPayment.aggregate({
      _sum: { amount_total: true, commission_amount: true, driver_net_amount: true, refunded_amount: true },
      where: { driver_user_id: driverUserId, created_at: { gte: from }, status: { in: [PaymentStatus.APPROVED, PaymentStatus.REFUNDED] } },
    });
    return {
      total_gross: this.toInt(summary?.total_gross ?? 0),
      total_commission: this.toInt(summary?.total_commission ?? 0),
      total_bonus_discount: this.toInt(summary?.total_bonus_discount ?? 0),
      total_net: this.toInt(summary?.total_net ?? 0),
      last_30_days: {
        gross: (last30._sum.amount_total ?? 0) - (last30._sum.refunded_amount ?? 0),
        commission: last30._sum.commission_amount ?? 0,
        net: last30._sum.driver_net_amount ?? 0,
      },
    };
  }

  async driverFinanceTrips(driverUserId: string) {
    const rows = await this.prisma.tripPayment.findMany({ where: { driver_user_id: driverUserId }, orderBy: { created_at: 'desc' }, take: 200 });
    return rows.map((r: any) => {
      const commissionReversed = Math.floor((r.refunded_amount * r.commission_amount) / Math.max(1, r.amount_total));
      const driverReversed = r.refunded_amount - commissionReversed;
      return { ...r, refund_amount: r.refunded_amount, net_after_refunds: r.driver_net_amount - driverReversed };
    });
  }

  async adminFinanceTrips(filter: { status?: PaymentStatus; driver?: string; from?: string; to?: string }) {
    return this.prisma.tripPayment.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.driver ? { driver_user_id: filter.driver } : {}),
        ...(filter.from || filter.to ? { created_at: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  async adminLedger(actorType?: LedgerActor) {
    return this.prisma.ledgerEntry.findMany({ where: actorType ? { actor_type: actorType } : {}, orderBy: { created_at: 'desc' }, take: 1000 });
  }

  async adminReconciliation(date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const approved = await this.prisma.tripPayment.count({ where: { status: PaymentStatus.APPROVED, updated_at: { gte: start, lte: end } } });
    const settled = await this.prisma.tripPayment.count({ where: { settlement_status: SettlementStatus.SETTLED, updated_at: { gte: start, lte: end } } });
    return { date, approved_internal: approved, settled_internal: settled, drift: approved - settled, notes: 'MP API reconciliation adapter pending credentials; internal consistency check performed' };
  }

  private computeRefundSplit(refundAmount: number, amountTotal: number, commissionAmount: number) {
    const commissionReversal = Math.floor((refundAmount * commissionAmount) / Math.max(1, amountTotal));
    const driverReversal = refundAmount - commissionReversal;
    return { commissionReversal, driverReversal };
  }

  private async ensureRefundFraudSignals(trx: any, driverUserId: string) {
    const now = new Date();
    const since7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const since30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const refunds7d = await trx.tripRefund.count({ where: { status: RefundStatus.APPROVED, created_at: { gte: since7 }, tripPayment: { driver_user_id: driverUserId } } });
    const refunds30d = await trx.tripRefund.count({ where: { status: RefundStatus.APPROVED, created_at: { gte: since30 }, tripPayment: { driver_user_id: driverUserId } } });
    const approved30d = await trx.tripPayment.count({ where: { driver_user_id: driverUserId, status: { in: [PaymentStatus.APPROVED, PaymentStatus.REFUNDED] }, updated_at: { gte: since30 } } });
    const ratio30d = approved30d > 0 ? refunds30d / approved30d : 0;

    if (refunds7d > 3) {
      await trx.fraudSignal.create({
        data: {
          id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: driverUserId,
          type: FraudSignalType.REFUND_VELOCITY_HIGH,
          severity: FraudSeverity.MEDIUM,
          score_delta: 10,
          payload_json: { refunds_7d: refunds7d } as any,
          created_at: now,
        },
      });
    }

    if (ratio30d > 0.25) {
      await trx.fraudSignal.create({
        data: {
          id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: driverUserId,
          type: FraudSignalType.REFUND_RATIO_HIGH,
          severity: FraudSeverity.HIGH,
          score_delta: 18,
          payload_json: { refunds_30d: refunds30d, approved_30d: approved30d, ratio_30d: ratio30d } as any,
          created_at: now,
        },
      });

      const hasActive = await trx.userHold.findFirst({ where: { user_id: driverUserId, hold_type: HoldType.PAYOUT_HOLD, status: HoldStatus.ACTIVE, OR: [{ ends_at: null }, { ends_at: { gt: now } }] } });
      if (!hasActive) {
        await trx.userHold.create({
          data: {
            id: `hold_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            user_id: driverUserId,
            hold_type: HoldType.PAYOUT_HOLD,
            status: HoldStatus.ACTIVE,
            reason: 'auto_refund_ratio_high',
            starts_at: now,
            ends_at: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
            payload_json: { ratio_30d: ratio30d } as any,
          },
        });
      }
    }
  }

  async adminRefundTripPayment(tripPaymentId: string, amount: number, reason: string, adminUserId: string) {
    return this.prisma.$transaction(async (trx: any) => {
      await trx.$executeRawUnsafe('SELECT id FROM "TripPayment" WHERE id = $1 FOR UPDATE', tripPaymentId);
      const payment = await trx.tripPayment.findUnique({ where: { id: tripPaymentId } });
      if (!payment) throw new BadRequestException('TripPayment not found');
      if (payment.status !== PaymentStatus.APPROVED && payment.status !== PaymentStatus.REFUNDED) throw new BadRequestException('TripPayment must be APPROVED/REFUNDED');

      const processing = await trx.tripRefund.findFirst({ where: { trip_payment_id: tripPaymentId, status: RefundStatus.PROCESSING } });
      if (processing) throw new BadRequestException('Refund already processing for this payment');

      const refundable = payment.amount_total - payment.refunded_amount;
      if (amount <= 0) throw new BadRequestException('Refund amount must be > 0');
      if (amount > refundable) throw new BadRequestException('Refund amount exceeds refundable balance');

      const idempotencyKey = createHash('sha256').update(`${tripPaymentId}:${amount}:${reason}`).digest('hex');
      const existingByKey = await trx.tripRefund.findUnique({ where: { idempotency_key: idempotencyKey } });
      if (existingByKey) return { refund: existingByKey, idempotent: true };

      const refund = await trx.tripRefund.create({
        data: {
          trip_payment_id: tripPaymentId,
          amount,
          reason,
          status: RefundStatus.PROCESSING,
          idempotency_key: idempotencyKey,
          payload_json: { requested_by: adminUserId } as any,
        },
      });

      try {
        const mp = await this.mpRefund(payment.mp_payment_id ?? payment.trip_id, amount, reason);
        const mpRefundId = String(mp?.id ?? '');
        if (!mpRefundId) throw new Error('Missing mp_refund_id');

        const existingByMp = await trx.tripRefund.findUnique({ where: { mp_refund_id: mpRefundId } });
        if (existingByMp && existingByMp.id !== refund.id) return { refund: existingByMp, idempotent: true };

        const { commissionReversal, driverReversal } = this.computeRefundSplit(amount, payment.amount_total, payment.commission_amount);

        await trx.ledgerEntry.createMany({
          data: [
            { actor_type: LedgerActor.PLATFORM, actor_user_id: null, trip_id: payment.trip_id, type: LedgerEntryType.REFUND_REVERSAL, amount: -amount, reference_id: mpRefundId, payload_json: { refund_id: refund.id } as any },
            { actor_type: LedgerActor.PLATFORM, actor_user_id: null, trip_id: payment.trip_id, type: LedgerEntryType.COMMISSION_REVERSAL, amount: -commissionReversal, reference_id: mpRefundId, payload_json: { refund_id: refund.id } as any },
            { actor_type: LedgerActor.DRIVER, actor_user_id: payment.driver_user_id, trip_id: payment.trip_id, type: LedgerEntryType.DRIVER_NET_REVERSAL, amount: -driverReversal, reference_id: mpRefundId, payload_json: { refund_id: refund.id } as any },
          ],
        });

        const nextRefunded = payment.refunded_amount + amount;
        const full = nextRefunded >= payment.amount_total;
        let nextSettlement = payment.settlement_status;
        if (full) nextSettlement = SettlementStatus.FAILED;
        else if (payment.settlement_status === SettlementStatus.NOT_SETTLED) nextSettlement = SettlementStatus.NOT_SETTLED;
        else nextSettlement = SettlementStatus.SETTLED;

        await trx.tripPayment.update({
          where: { id: payment.id },
          data: {
            refunded_amount: nextRefunded,
            refunded_at: full ? new Date() : null,
            is_fully_refunded: full,
            status: full ? PaymentStatus.REFUNDED : PaymentStatus.APPROVED,
            settlement_status: nextSettlement,
          },
        });

        await trx.tripRefund.update({ where: { id: refund.id }, data: { status: RefundStatus.APPROVED, mp_refund_id: mpRefundId, payload_json: { requested_by: adminUserId, mp } as any } });

        const summary = await trx.driverPayoutSummary.findUnique({ where: { driver_user_id: payment.driver_user_id } });
        const nextSummary = {
          total_gross: BigInt((summary?.total_gross ?? BigInt(0)) - BigInt(amount)),
          total_commission: BigInt((summary?.total_commission ?? BigInt(0)) - BigInt(commissionReversal)),
          total_bonus_discount: BigInt(summary?.total_bonus_discount ?? BigInt(0)),
          total_net: BigInt((summary?.total_net ?? BigInt(0)) - BigInt(driverReversal)),
        };
        await trx.driverPayoutSummary.upsert({ where: { driver_user_id: payment.driver_user_id }, update: nextSummary, create: { driver_user_id: payment.driver_user_id, ...nextSummary } });

        const trip = await trx.trip.findUnique({ where: { id: payment.trip_id } });
        if (trip?.completed_at) {
          const y = trip.completed_at.getUTCFullYear();
          const m = trip.completed_at.getUTCMonth() + 1;
          const now = new Date();
          const sameMonth = y === now.getUTCFullYear() && m === now.getUTCMonth() + 1;
          if (!sameMonth && full) {
            await trx.bonusAdjustment.create({
              data: {
                driver_user_id: payment.driver_user_id,
                trip_id: payment.trip_id,
                year: y,
                month: m,
                amount,
                reason: 'revoke_next_month_discount',
                status: 'PENDING',
                payload_json: { refund_id: refund.id, revoke_next_month_discount: true } as any,
              },
            });
          }
        }

        await this.ensureRefundFraudSignals(trx, payment.driver_user_id);

        return { refund: await trx.tripRefund.findUnique({ where: { id: refund.id } }), idempotent: false };
      } catch (error: any) {
        this.logger.error(`Refund failed for payment=${tripPaymentId}: ${error?.message ?? error}`);
        await trx.tripRefund.update({ where: { id: refund.id }, data: { status: RefundStatus.FAILED, payload_json: { requested_by: adminUserId, error: String(error?.message ?? error) } as any } });
        return { refund: await trx.tripRefund.findUnique({ where: { id: refund.id } }), idempotent: false, failed: true };
      }
    });
  }

  async adminFinanceRefunds(filter: { status?: string; driver?: string; from?: string; to?: string }) {
    const rows = await this.prisma.tripRefund.findMany({
      where: {
        ...(filter.status ? { status: filter.status as any } : {}),
        ...(filter.from || filter.to ? { created_at: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } } : {}),
        ...(filter.driver ? { tripPayment: { driver_user_id: filter.driver } } : {}),
      } as any,
      include: { tripPayment: true },
      orderBy: { created_at: 'desc' },
      take: 500,
    });

    return rows.map((r: any) => ({
      ...r,
      refunded_amount: r.tripPayment?.refunded_amount ?? 0,
      is_fully_refunded: r.tripPayment?.is_fully_refunded ?? false,
    }));
  }

  async adminBonusAdjustments() {
    return this.prisma.bonusAdjustment.findMany({ where: { status: 'PENDING' as any }, orderBy: { created_at: 'asc' }, take: 500 });
  }

  async applyBonusAdjustment(id: string) {
    const adj = await this.prisma.bonusAdjustment.findUnique({ where: { id } });
    if (!adj) throw new BadRequestException('Bonus adjustment not found');
    if (adj.status === 'APPLIED') return { adjustment: adj, idempotent: true };

    const nextMonth = new Date(Date.UTC(adj.year, adj.month, 1));
    const y = nextMonth.getUTCFullYear();
    const m = nextMonth.getUTCMonth() + 1;

    const target = await this.prisma.monthlyBonusLedger.findFirst({ where: { driver_user_id: adj.driver_user_id, year: y, month: m, status: 'ACTIVE' as any }, orderBy: { starts_at: 'desc' } });
    if (target) await this.prisma.monthlyBonusLedger.update({ where: { id: target.id }, data: { status: 'REVOKED' as any } });

    const applied = await this.prisma.bonusAdjustment.update({ where: { id }, data: { status: 'APPLIED' as any, payload_json: { ...(adj.payload_json as any), applied_at: new Date().toISOString(), target_bonus_id: target?.id ?? null } as any } });
    return { adjustment: applied, revoked_bonus_id: target?.id ?? null };
  }

  async revokeBonusLedger(id: string, reason: string) {
    const row = await this.prisma.monthlyBonusLedger.update({ where: { id }, data: { status: 'REVOKED' as any } });
    return { ...row, reason };
  }
}
