import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bootstraps default config/policies so day-1 meritocracy works without manual DB setup.
 * Safe to run on every boot (idempotent via upsert).
 */
@Injectable()
export class PolicyBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PolicyBootstrapService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async upsertPolicy(key: string, value: unknown) {
    await this.prisma.commissionPolicy.upsert({
      where: { key },
      update: { value_json: value as any },
      create: { key, value_json: value as any },
    });
  }

  private async upsertConfig(key: string, value: unknown) {
    await this.prisma.appConfig.upsert({
      where: { key },
      update: { value_json: value as any },
      create: { key, value_json: value as any },
    });
  }

  async onModuleInit() {
    // Commission (bps) per level tier. Discount bonuses apply on top.
    // Defaults tuned for a low-density market (Firmat / Sur de Santa Fe):
    // - Keep driver earnings attractive from day 1
    // - Still preserve a minimum platform take-rate via floor
    await this.upsertPolicy('commission_tiers_bps', {
      driver: {
        bronze: 1200, // 12%
        silver: 1050, // 10.5%
        gold: 900, // 9%
        diamond: 800, // 8%
      },
      passenger: {
        // reserved for future (e.g., premium passenger pricing)
      },
    });

    // Backward-compatible default (used as fallback).
    await this.upsertPolicy('default_commission_bps', 1200);

    // Bonus rules: discounts in bps and floor to protect unit economics.
    // In a smaller city, monthly trip volume per driver is lower; keep thresholds reachable.
    await this.upsertPolicy('bonus_rules', {
      commission_floor_bps: 300, // never go below 3%
      top_10_discount_bps: 200, // -2%
      top_3_discount_bps: 350, // -3.5%
      top_1_discount_bps: 500, // -5%
      min_trips_completed: 25,
      require_no_show_eq: 0,
      require_safety_major_alerts_eq: 0,
    });

    // Micro-adjustments inside each tier based on score (bps discount).
    // This creates a continuous meritocracy effect day-1 (not only discrete tiers).
    // Applied in InternalCommissionController.
    await this.upsertPolicy('commission_micro_adjustment', {
      // Score is 0..100. discount_bps is subtracted from tier_bps (then floor applies).
      // Firmat tuning: make improvements meaningful but not destabilizing.
      max_discount_bps: 250, // cap
      driver: {
        bronze: [
          { score_gte: 60, discount_bps: 0 },
          { score_gte: 70, discount_bps: 50 },
          { score_gte: 80, discount_bps: 100 },
          { score_gte: 90, discount_bps: 150 },
        ],
        silver: [
          { score_gte: 72, discount_bps: 0 },
          { score_gte: 80, discount_bps: 50 },
          { score_gte: 88, discount_bps: 100 },
          { score_gte: 93, discount_bps: 150 },
        ],
        gold: [
          { score_gte: 82, discount_bps: 0 },
          { score_gte: 88, discount_bps: 50 },
          { score_gte: 92, discount_bps: 100 },
          { score_gte: 95, discount_bps: 150 },
        ],
        diamond: [
          { score_gte: 90, discount_bps: 0 },
          { score_gte: 93, discount_bps: 50 },
          { score_gte: 96, discount_bps: 100 },
          { score_gte: 98, discount_bps: 150 },
        ],
      },
    });

    // Level rules (day-1 meritocracy).
    // Calibrated for Firmat/Sur de Santa Fe expected demand:
    // - Diamond should be achievable for high-performing drivers without requiring mega-city volumes.
    await this.upsertPolicy('level_rules', {
      driver: {
        bronze: { score_gte: 60 },
        silver: { score_gte: 72, trips_completed_last30_gte: 20, cancel_rate_30d_lt: 0.10 },
        gold: { score_gte: 82, trips_completed_last30_gte: 50, cancel_rate_30d_lt: 0.07, safety_major_alerts_30d_eq: 0 },
        diamond: { score_gte: 90, trips_completed_last30_gte: 90, cancel_rate_30d_lt: 0.05, safety_major_alerts_30d_eq: 0, no_show_30d_eq: 0 },
      },
      passenger: {
        bronze: { score_gte: 55 },
        silver: { score_gte: 68, trips_completed_last60_gte: 10, cancel_rate_60d_lt: 0.12 },
        gold: { score_gte: 78, trips_completed_last60_gte: 25, cancel_rate_60d_lt: 0.08 },
        diamond: { score_gte: 88, trips_completed_last60_gte: 50, cancel_rate_60d_lt: 0.06 },
      },
    });

    // Meritocracy: badge thresholds (public).
    await this.upsertConfig('score_thresholds', {
      badge: { excellent: 92, trusted: 78, watchlist: 62 },
    });

    // Meritocracy: peak hours windows (Firmat / Sur de Santa Fe). 0=Sun ... 6=Sat
    // Typical demand patterns:
    // - Weekday commuting + school
    // - Lunch/errands
    // - Afternoon return
    // - Fri/Sat nightlife (cross-midnight)
    await this.upsertConfig('peak_hours', {
      driver_min_score: 60,
      passenger_min_score: 50,
      windows: [
        { days: [1, 2, 3, 4, 5], start: '06:30', end: '09:30' },
        { days: [1, 2, 3, 4, 5], start: '12:00', end: '14:00' },
        { days: [1, 2, 3, 4, 5], start: '17:00', end: '20:30' },
        { days: [5, 6], start: '22:00', end: '04:00' },
        { days: [0], start: '17:30', end: '21:00' },
      ],
    });

    // Matching weights: make meritocracy affect demand (priority) beyond commission.
    // w_* are linear weights used in ride.service.ts prioritization.
    await this.upsertConfig('matching_weights', {
      w_score: 0.40,
      w_distance: 0.35,
      w_reliability: 0.12,
      w_status: 0.05,
      w_peak: 0.08,
      w_zone: 0.10,
      w_tier: 0.10,
      top_n: 15,
      // Penalize drivers flagged as limited (peak limited mode or premium ineligible).
      limited_penalty: 0.15,
      // Tier bonuses are normalized (0..1) and multiplied by w_tier.
      tier_bonus: { bronze: 0.05, silver: 0.15, gold: 0.30, diamond: 0.45 },
    });

    // Premium zones behavior toggles.
    // PremiumZone polygons/thresholds are managed via the admin panel CRUD.
    // These flags decide if low-score users are denied or only "de-prioritized".
    await this.upsertConfig('premium_zones', {
      deny_low_driver: false,
      deny_low_passenger: false,
      // If not denied, matching will still de-prioritize via limited_penalty + premium_bonus.
    });


    // Premium zone preference by tier: boosts priority inside premium zones for top tiers.
    // This is additive on top of zone.premium_bonus (eligible) and still controlled by w_zone.
    await this.upsertConfig('premium_preference_by_tier', {
      eligible_additive_bonus: { bronze: 0.02, silver: 0.05, gold: 0.10, diamond: 0.15 },
      ineligible_penalty: 0.05, // small penalty if inside premium zone but not eligible (city small: don't fully deny)
    });

    // Dynamic top-N selection: adjust how many drivers are notified based on context.
    await this.upsertConfig('dynamic_top_n', {
      base: 15,
      peak_add: 5,
      premium_zone_add: 3,
      restricted_passenger_cap: 10,
      min: 8,
      max: 25,
      limited_max_share: 0.30, // at most 30% of notified drivers can be limited
      reserve_high_tier: { gold: 2, diamond: 1 }, // ensure top tiers are represented when available
    });



// Score cooldown durations (hours) when user drops into LIMITED/BLOCKED (low score auto).
// This prevents a "single bad trip" from destroying a driver, but keeps consequences meaningful.
await this.upsertConfig('score_cooldown_policy', {
  driver: { limited_hours: 6, blocked_hours: 24 },
  passenger: { limited_hours: 3, blocked_hours: 12 },
});

// Score recovery policy (opportunistic): after a cooldown from the last penalty, users recover slowly.
// - Recovery is capped so people cannot "free reset" back to perfect score.
// - Designed for a small market (Firmat): keeps drivers motivated without removing accountability.
await this.upsertConfig('score_recovery_policy', {
  driver: { cooldown_hours_after_penalty: 12, recovery_per_day: 2, cap_score: 88, max_recovery_per_week: 10 },
  passenger: { cooldown_hours_after_penalty: 8, recovery_per_day: 1, cap_score: 84, max_recovery_per_week: 6 },
});

    this.logger.log('Default commission policies and meritocracy configs bootstrapped (idempotent).');
  }
}
