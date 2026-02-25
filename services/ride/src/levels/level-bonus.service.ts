import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  ActorType,
  BonusStatus,
  BonusType,
  LevelTier,
  PeriodStatus,
  ScoreEventType,
  TripStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';

type Perf = {
  tripsCompleted: number;
  tripsCancelledLate: number;
  noShowCount: number;
  safetyMajorAlerts: number;
  completionRate: number;
  cancelRate: number;
  avgScore: number;
};

type ActiveCommission = {
  driver_user_id: string;
  at: string;
  default_bps: number;
  discount_bps: number;
  floor_bps: number;
  effective_bps: number;
  bonus_valid_until: string | null;
};

@Injectable()
export class LevelAndBonusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: RideGateway,
  ) {}

  // ---------- Policies ----------
  private async getPolicy<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.commissionPolicy.findUnique({ where: { key } });
    return (row?.value_json as T) ?? fallback;
  }

  async putPolicy(key: string, value: unknown) {
    return this.prisma.commissionPolicy.upsert({
      where: { key },
      update: { value_json: value as any },
      create: { key, value_json: value as any },
    });
  }

  // ---------- Levels ----------
  private levelFromRules(
    score: number,
    perf: Perf,
    rules: any,
    passenger = false,
  ): { tier: LevelTier; payload: any } {
    const ok = {
      bronze: score >= (rules?.bronze?.score_gte ?? 60),
      silver:
        score >= (rules?.silver?.score_gte ?? 75) &&
        perf.tripsCompleted >= (rules?.silver?.trips_completed_last30_gte ?? 30) &&
        perf.cancelRate < (rules?.silver?.cancel_rate_30d_lt ?? (passenger ? 0.1 : 0.08)),
      gold:
        score >= (rules?.gold?.score_gte ?? 85) &&
        perf.tripsCompleted >= (rules?.gold?.trips_completed_last30_gte ?? 80) &&
        perf.cancelRate < (rules?.gold?.cancel_rate_30d_lt ?? (passenger ? 0.06 : 0.05)) &&
        (passenger || perf.safetyMajorAlerts === (rules?.gold?.safety_major_alerts_30d_eq ?? 0)),
      diamond:
        score >= (rules?.diamond?.score_gte ?? 92) &&
        perf.tripsCompleted >= (rules?.diamond?.trips_completed_last30_gte ?? (passenger ? 80 : 150)) &&
        perf.cancelRate < (rules?.diamond?.cancel_rate_30d_lt ?? (passenger ? 0.04 : 0.03)) &&
        (passenger ||
          (perf.safetyMajorAlerts === (rules?.diamond?.safety_major_alerts_30d_eq ?? 0) &&
            perf.noShowCount === (rules?.diamond?.no_show_30d_eq ?? 0))),
    };

    const tier = ok.diamond
      ? LevelTier.DIAMOND
      : ok.gold
        ? LevelTier.GOLD
        : ok.silver
          ? LevelTier.SILVER
          : LevelTier.BRONZE;

    return {
      tier,
      payload: { score, perf, rules_snapshot: rules, checks: ok },
    };
  }

  private async lastWindowPerf(userId: string, actor: ActorType, days: number): Promise<Perf> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    if (actor === ActorType.DRIVER) {
      const [completed, cancelled, noShow, safety, us] = await Promise.all([
        this.prisma.trip.count({
          where: {
            driver_user_id: userId,
            status: TripStatus.COMPLETED,
            completed_at: { gte: since },
          },
        }),
        this.prisma.scoreEvent.count({
          where: {
            user_id: userId,
            actor_type: actor,
            type: ScoreEventType.DRIVER_CANCEL_LATE,
            created_at: { gte: since },
          },
        }),
        this.prisma.scoreEvent.count({
          where: {
            user_id: userId,
            actor_type: actor,
            type: ScoreEventType.DRIVER_NO_SHOW,
            created_at: { gte: since },
          },
        }),
        this.prisma.scoreEvent.count({
          where: {
            user_id: userId,
            actor_type: actor,
            type: ScoreEventType.ROUTE_DEVIATION_MAJOR,
            created_at: { gte: since },
          },
        }),
        this.prisma.userScore.findUnique({
          where: { user_id_actor_type: { user_id: userId, actor_type: actor } },
        }),
      ]);

      const total = completed + cancelled + noShow;
      return {
        tripsCompleted: completed,
        tripsCancelledLate: cancelled,
        noShowCount: noShow,
        safetyMajorAlerts: safety,
        completionRate: total ? completed / total : 0,
        cancelRate: total ? cancelled / total : 0,
        avgScore: us?.score ?? 100,
      };
    }

    const [completed, cancelled, noShow, us] = await Promise.all([
      this.prisma.trip.count({
        where: {
          passenger_user_id: userId,
          status: TripStatus.COMPLETED,
          completed_at: { gte: since },
        },
      }),
      this.prisma.scoreEvent.count({
        where: {
          user_id: userId,
          actor_type: actor,
          type: ScoreEventType.PASSENGER_CANCEL_LATE,
          created_at: { gte: since },
        },
      }),
      this.prisma.scoreEvent.count({
        where: {
          user_id: userId,
          actor_type: actor,
          type: ScoreEventType.PASSENGER_NO_SHOW,
          created_at: { gte: since },
        },
      }),
      this.prisma.userScore.findUnique({
        where: { user_id_actor_type: { user_id: userId, actor_type: actor } },
      }),
    ]);

    const total = completed + cancelled + noShow;
    return {
      tripsCompleted: completed,
      tripsCancelledLate: cancelled,
      noShowCount: noShow,
      safetyMajorAlerts: 0,
      completionRate: total ? completed / total : 0,
      cancelRate: total ? cancelled / total : 0,
      avgScore: us?.score ?? 100,
    };
  }

  async computeDriverLevel(userId: string, now = new Date()) {
    const rules = await this.getPolicy('level_rules', {} as any);
    const perf = await this.lastWindowPerf(userId, ActorType.DRIVER, 30);

    let { tier, payload } = this.levelFromRules(perf.avgScore, perf, rules.driver ?? {}, false);

    // Si tenés userHold en schema y querés capear GOLD/DIAMOND si hay hold:
    const activeHold = await this.prisma.userHold?.findFirst?.({
      where: {
        user_id: userId,
        status: 'ACTIVE' as any,
        hold_type: { in: ['PAYOUT_HOLD', 'ACCOUNT_BLOCK'] as any },
        OR: [{ ends_at: { gt: now } }, { ends_at: null } as any],
      },
    });

    if (activeHold && (tier === LevelTier.GOLD || tier === LevelTier.DIAMOND)) {
      tier = LevelTier.SILVER;
      payload = { ...(payload ?? {}), hold_cap: true, hold_type: activeHold.hold_type };
    }

    const saved = await this.prisma.userLevel.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: ActorType.DRIVER } },
      update: { tier, computed_at: now, valid_until: null, payload_json: payload as any },
      create: { user_id: userId, actor_type: ActorType.DRIVER, tier, computed_at: now, valid_until: null, payload_json: payload as any },
    });

    await this.prisma.userLevelHistory.create({
      data: { user_id: userId, actor_type: ActorType.DRIVER, tier, computed_at: now, payload_json: payload as any },
    });

    this.ws.emitToUser(userId, 'user.level.updated', { actor_type: ActorType.DRIVER, tier });
    return saved;
  }

  async computePassengerLevel(userId: string, now = new Date()) {
    const rules = await this.getPolicy('level_rules', {} as any);
    const perf = await this.lastWindowPerf(userId, ActorType.PASSENGER, 60);

    const { tier, payload } = this.levelFromRules(perf.avgScore, perf, rules.passenger ?? {}, true);

    const saved = await this.prisma.userLevel.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: ActorType.PASSENGER } },
      update: { tier, computed_at: now, valid_until: null, payload_json: payload as any },
      create: { user_id: userId, actor_type: ActorType.PASSENGER, tier, computed_at: now, valid_until: null, payload_json: payload as any },
    });

    await this.prisma.userLevelHistory.create({
      data: { user_id: userId, actor_type: ActorType.PASSENGER, tier, computed_at: now, payload_json: payload as any },
    });

    this.ws.emitToUser(userId, 'user.level.updated', { actor_type: ActorType.PASSENGER, tier });
    return saved;
  }

  async listLevels(actor_type?: ActorType, tier?: LevelTier) {
    return this.prisma.userLevel.findMany({
      where: {
        ...(actor_type ? { actor_type } : {}),
        ...(tier ? { tier } : {}),
      },
      orderBy: { computed_at: 'desc' },
      take: 500,
    });
  }

  // ---------- Monthly performance ----------
  private performanceIndex(avgScore: number, completionRate: number, cancelRate: number) {
    const value = (avgScore / 100) * 0.55 + completionRate * 0.3 + (1 - cancelRate) * 0.15;
    return Math.max(0, Math.min(1, value));
  }

  async computeMonthlyPerformance(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const [driverTripsRaw, passengerTripsRaw] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          OR: [{ completed_at: { gte: from, lt: to } }, { cancelled_at: { gte: from, lt: to } }],
          driver_user_id: { not: null },
        },
        select: { id: true, driver_user_id: true, status: true },
      }),
      this.prisma.trip.findMany({
        where: {
          OR: [{ completed_at: { gte: from, lt: to } }, { cancelled_at: { gte: from, lt: to } }],
        },
        select: { id: true, passenger_user_id: true, status: true },
      }),
    ]);

    // Excluir viajes COMPLETED totalmente reembolsados
    const completedIds = [...new Set(driverTripsRaw.filter((t) => t.status === TripStatus.COMPLETED).map((t) => t.id))];
    const refundedFull = completedIds.length
      ? await this.prisma.externalTripPayment.findMany({
          where: { trip_id: { in: completedIds }, refunded_amount: { gte: 1 } },
          select: { trip_id: true, refunded_amount: true, amount_total: true },
        })
      : [];
    const fullyRefundedTripIds = new Set(refundedFull.filter((p) => p.refunded_amount >= p.amount_total).map((p) => p.trip_id));

    const driverTrips = driverTripsRaw.filter((t) => !(t.status === TripStatus.COMPLETED && fullyRefundedTripIds.has(t.id)));
    const passengerTrips = passengerTripsRaw.filter((t) => !(t.status === TripStatus.COMPLETED && fullyRefundedTripIds.has(t.id)));

    const collect = async (
      actor: ActorType,
      users: string[],
      getTripCounts: (u: string) => { completed: number; cancelled: number },
    ) => {
      for (const userId of users) {
        const counts = getTripCounts(userId);

        const [noShows, safety, us] = await Promise.all([
          this.prisma.scoreEvent.count({
            where: {
              user_id: userId,
              actor_type: actor,
              type: actor === ActorType.DRIVER ? ScoreEventType.DRIVER_NO_SHOW : ScoreEventType.PASSENGER_NO_SHOW,
              created_at: { gte: from, lt: to },
            },
          }),
          actor === ActorType.DRIVER
            ? this.prisma.safetyAlert.count({
                where: {
                  type: { in: ['ROUTE_DEVIATION_MAJOR', 'TRACKING_LOST'] as any },
                  created_at: { gte: from, lt: to },
                  trip: { driver_user_id: userId },
                },
              })
            : Promise.resolve(0),
          this.prisma.userScore.findUnique({
            where: { user_id_actor_type: { user_id: userId, actor_type: actor } },
          }),
        ]);

        const total = counts.completed + counts.cancelled + noShows;
        const completionRate = total ? counts.completed / total : 0;
        const cancelRate = total ? counts.cancelled / total : 0;
        const avgScore = us?.score ?? 100;

        const pi = this.performanceIndex(avgScore, completionRate, cancelRate);

        await this.prisma.monthlyPerformance.upsert({
          where: { user_id_actor_type_year_month: { user_id: userId, actor_type: actor, year, month } },
          update: {
            trips_completed: counts.completed,
            trips_cancelled_late: counts.cancelled,
            no_show_count: noShows,
            avg_score: avgScore,
            safety_major_alerts: safety,
            completion_rate: completionRate,
            cancel_rate: cancelRate,
            performance_index: pi,
            status: PeriodStatus.FINALIZED,
            computed_at: new Date(),
          },
          create: {
            user_id: userId,
            actor_type: actor,
            year,
            month,
            trips_completed: counts.completed,
            trips_cancelled_late: counts.cancelled,
            no_show_count: noShows,
            avg_score: avgScore,
            safety_major_alerts: safety,
            completion_rate: completionRate,
            cancel_rate: cancelRate,
            performance_index: pi,
            status: PeriodStatus.FINALIZED,
            computed_at: new Date(),
          },
        });
      }
    };

    const dUsers = [...new Set(driverTrips.map((t) => t.driver_user_id).filter(Boolean) as string[])];
    const pUsers = [...new Set(passengerTrips.map((t) => t.passenger_user_id).filter(Boolean) as string[])];

    await collect(ActorType.DRIVER, dUsers, (u) => ({
      completed: driverTrips.filter((t) => t.driver_user_id === u && t.status === TripStatus.COMPLETED).length,
      cancelled: driverTrips.filter((t) => t.driver_user_id === u && t.status === TripStatus.CANCELLED_BY_DRIVER).length,
    }));

    await collect(ActorType.PASSENGER, pUsers, (u) => ({
      completed: passengerTrips.filter((t) => t.passenger_user_id === u && t.status === TripStatus.COMPLETED).length,
      cancelled: passengerTrips.filter((t) => t.passenger_user_id === u && t.status === TripStatus.CANCELLED_BY_PASSENGER).length,
    }));

    return { year, month, drivers: dUsers.length, passengers: pUsers.length };
  }

  async listMonthlyPerformance(year: number, month: number, actor_type?: ActorType) {
    return this.prisma.monthlyPerformance.findMany({
      where: {
        year,
        month,
        ...(actor_type ? { actor_type } : {}),
      },
      orderBy: [{ performance_index: 'desc' }, { trips_completed: 'desc' }],
      take: 1000,
    });
  }

  // ---------- Bonuses ----------
  /**
   * Calcula bonos mensuales (descuento de comisión) para DRIVERS según ranking.
   *
   * IMPORTANTE: tu schema de MonthlyBonusLedger tiene @@unique([driver_user_id, year, month])
   * => Solo puede existir 1 ledger por driver por mes (independiente de bonus_type).
   * Por eso mantenemos 1 tipo efectivo: COMMISSION_DISCOUNT.
   */
  async computeMonthlyBonuses(year: number, month: number) {
    // reglas/valores de bonos
    const rules = await this.getPolicy('bonus_rules', {
      top_10_discount_bps: 300,
      top_3_discount_bps: 500,
      top_1_discount_bps: 800,
      min_trips_completed: 0,
      require_no_show_eq: 0,
      require_safety_major_alerts_eq: 0,
      commission_floor_bps: 200,
    } as any);

    // traemos performance finalizada de drivers
    const perf = await this.prisma.monthlyPerformance.findMany({
      where: {
        year,
        month,
        actor_type: ActorType.DRIVER,
        status: PeriodStatus.FINALIZED,
        trips_completed: { gte: Number(rules?.min_trips_completed ?? 0) },
        no_show_count: { lte: Number(rules?.require_no_show_eq ?? 0) },
        safety_major_alerts: { lte: Number(rules?.require_safety_major_alerts_eq ?? 0) },
      },
      orderBy: [{ performance_index: 'desc' }, { trips_completed: 'desc' }],
      take: 5000,
    });

    const n = perf.length;
    if (!n) return { year, month, awarded: 0 };

    const top1 = Math.max(1, Math.floor(n * 0.01));
    const top3 = Math.max(1, Math.floor(n * 0.03));
    const top10 = Math.max(1, Math.floor(n * 0.10));

    let awarded = 0;

    for (let i = 0; i < n; i++) {
      const row = perf[i];
      const driverUserId = row.user_id;

      // Si hay hold activo => negar bono (si tu schema lo soporta)
      const hold = await this.prisma.userHold?.findFirst?.({
        where: {
          user_id: driverUserId,
          status: 'ACTIVE' as any,
          hold_type: { in: ['PAYOUT_HOLD', 'ACCOUNT_BLOCK'] as any },
          OR: [{ ends_at: { gt: new Date() } }, { ends_at: null } as any],
        },
      });

      if (hold) {
        this.ws.emitSosAlert?.('admin.fraud.bonus_denied', {
          driver_user_id: driverUserId,
          year,
          month,
          reason: `hold_active:${hold.hold_type}`,
        });
        continue;
      }

      // asignación por percentil
      let discount = 0;
      let label = '';

      if (i < top1) {
        discount = Number(rules?.top_1_discount_bps ?? 0);
        label = 'top_1';
      } else if (i < top3) {
        discount = Number(rules?.top_3_discount_bps ?? 0);
        label = 'top_3';
      } else if (i < top10) {
        discount = Number(rules?.top_10_discount_bps ?? 0);
        label = 'top_10';
      } else {
        discount = 0;
      }

      if (discount <= 0) continue;

      const startsAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endsAt = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // válido hasta el 1 del mes siguiente

      // UPSERT usando el unique real: @@unique([driver_user_id, year, month])
      await this.prisma.monthlyBonusLedger.upsert({
        where: {
          driver_user_id_year_month: {
            driver_user_id: driverUserId,
            year,
            month,
          },
        },
        update: {
          bonus_type: BonusType.COMMISSION_DISCOUNT,
          discount_bps: discount,
          reason: `monthly_rank:${label} rank=${i + 1}/${n}`,
          status: BonusStatus.ACTIVE,
          starts_at: startsAt,
          ends_at: endsAt,
        },
        create: {
          driver_user_id: driverUserId,
          year,
          month,
          bonus_type: BonusType.COMMISSION_DISCOUNT,
          discount_bps: discount,
          reason: `monthly_rank:${label} rank=${i + 1}/${n}`,
          status: BonusStatus.ACTIVE,
          starts_at: startsAt,
          ends_at: endsAt,
        },
      });

      this.ws.emitToUser(driverUserId, 'driver.bonus.updated', {
        year,
        month,
        bonus_type: BonusType.COMMISSION_DISCOUNT,
        discount_bps: discount,
        valid_until: endsAt.toISOString(),
      });

      awarded++;
    }

    return { year, month, awarded };
  }

  async listBonuses(year: number, month: number) {
    return this.prisma.monthlyBonusLedger.findMany({
      where: { year, month },
      orderBy: [{ discount_bps: 'desc' }, { created_at: 'desc' }],
      take: 2000,
    });
  }

  async revokeBonus(id: string, reason: string) {
    return this.prisma.monthlyBonusLedger.update({
      where: { id },
      data: {
        status: BonusStatus.REVOKED as any,
        reason: `revoked:${reason}`,
      },
    });
  }

  /**
   * Devuelve la comisión efectiva (bps) aplicando descuento activo + piso.
   * Usa `driver_user_id` según tu schema.
   */
  async getActiveCommissionBps(driverUserId: string, at = new Date()): Promise<ActiveCommission> {
    const defaultBps = Number(await this.getPolicy('commission_default_bps', 1000 as any));
    const rules = await this.getPolicy('bonus_rules', { commission_floor_bps: 200 } as any);
    const floor = Number(rules?.commission_floor_bps ?? 200);

    const bonus = await this.prisma.monthlyBonusLedger.findFirst({
      where: {
        driver_user_id: driverUserId,
        bonus_type: BonusType.COMMISSION_DISCOUNT,
        status: BonusStatus.ACTIVE,
        starts_at: { lte: at },
        ends_at: { gte: at },
      },
      orderBy: { starts_at: 'desc' },
    });

    const discount = Number(bonus?.discount_bps ?? 0);
    const effective = Math.max(defaultBps - discount, floor);

    return {
      driver_user_id: driverUserId,
      at: at.toISOString(),
      default_bps: defaultBps,
      discount_bps: discount,
      floor_bps: floor,
      effective_bps: effective,
      bonus_valid_until: bonus?.ends_at ? bonus.ends_at.toISOString() : null,
    };
  }

  // ---------- Crons ----------
  // 01:15 UTC todos los días: recomputa niveles (si querés)
  @Cron('15 1 * * *')
  async cronRecomputeLevelsLight() {
    // intencionalmente liviano: no recorre todos los usuarios.
    // si después querés batch por cohortes, lo armamos.
    return true;
  }

  // 02:10 UTC día 1 del mes: compute performance del mes anterior
  @Cron('10 2 1 * *')
  async cronMonthlyCompute() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;

    // mes anterior
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;

    await this.computeMonthlyPerformance(prevYear, prevMonth);
    await this.computeMonthlyBonuses(prevYear, prevMonth);
    return { prevYear, prevMonth };
  }
}
