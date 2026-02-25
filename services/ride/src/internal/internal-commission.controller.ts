import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActorType, LevelTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LevelAndBonusService } from '../levels/level-bonus.service';

/**
 * Internal-only endpoint used by the payment service to compute commission bps
 * based on day-1 meritocracy (level tier + monthly bonuses + floor).
 *
 * NOTE: This controller is NOT exposed via the public gateway routes.
 * It lives on the ride service network.
 */
@Controller('/internal/commission')
export class InternalCommissionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly levels: LevelAndBonusService,
  ) {}

  @Get('/driver/:driverUserId')
  async getDriverCommission(
    @Param('driverUserId') driverUserId: string,
    @Query('at') at?: string,
  ) {
    const when = at ? new Date(at) : new Date();

    // Resolve tier: use cached userLevel if computed recently, otherwise compute.
    const cached = await this.prisma.userLevel.findUnique({
      where: { user_id_actor_type: { user_id: driverUserId, actor_type: ActorType.DRIVER } },
    });

    const tier: LevelTier = cached?.tier ?? (await this.levels.computeDriverLevel(driverUserId, when)).tier;

    const tierPolicy = await this.prisma.commissionPolicy.findUnique({ where: { key: 'commission_tiers_bps' } });
    const tiers = (tierPolicy?.value_json as any)?.driver ?? {};

    const tierBps = Number(
      tier === LevelTier.DIAMOND ? tiers.diamond
        : tier === LevelTier.GOLD ? tiers.gold
          : tier === LevelTier.SILVER ? tiers.silver
            : tiers.bronze,
    );

    // Continuous meritocracy: micro-adjustment inside tier based on current score.
    const scoreRow = await this.prisma.userScore.findUnique({
      where: { user_id_actor_type: { user_id: driverUserId, actor_type: ActorType.DRIVER } },
    });
    const driverScore = Number(scoreRow?.score ?? 100);

    const microPolicy = await this.prisma.commissionPolicy.findUnique({ where: { key: 'commission_micro_adjustment' } });
    const micro = (microPolicy?.value_json as any) ?? null;
    const tierKey = tier === LevelTier.DIAMOND ? 'diamond'
      : tier === LevelTier.GOLD ? 'gold'
        : tier === LevelTier.SILVER ? 'silver'
          : 'bronze';

    const microRules: Array<{ score_gte: number; discount_bps: number }> = micro?.driver?.[tierKey] ?? [];
    const maxMicro = Number(micro?.max_discount_bps ?? 0);
    let microDiscount = 0;
    for (const r of microRules) {
      if (driverScore >= Number(r.score_gte ?? 0)) microDiscount = Number(r.discount_bps ?? 0);
    }
    if (maxMicro > 0) microDiscount = Math.min(microDiscount, maxMicro);

    // Apply active monthly bonus discount (and floor) via existing service.
    // We keep the floor logic centralized in LevelAndBonusService.
    const bonus = await this.levels.getActiveCommissionBps(driverUserId, when);

    // bonus.default_bps is the legacy policy; we override with tierBps.
    // Apply the same discount and floor.
    const rules = await this.prisma.commissionPolicy.findUnique({ where: { key: 'bonus_rules' } });
    const floor = Number((rules?.value_json as any)?.commission_floor_bps ?? 200);
    const effective = Math.max(tierBps - microDiscount - (bonus.discount_bps ?? 0), floor);

    return {
      driver_user_id: driverUserId,
      at: when.toISOString(),
      tier,
      score: driverScore,
      tier_bps: tierBps,
      micro_discount_bps: microDiscount,
      discount_bps: bonus.discount_bps,
      floor_bps: floor,
      effective_bps: effective,
      bonus_valid_until: bonus.bonus_valid_until,
    };
  }
}
