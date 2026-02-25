import { Injectable } from '@nestjs/common';
import { ActorType, BadgeTier, RestrictionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';

@Injectable()
export class MeritocracyService {
  constructor(private readonly prisma: PrismaService, private readonly ws: RideGateway) {}

  private async getConfig<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appConfig.findUnique({ where: { key } });
    return (row?.value_json as T) ?? fallback;
  }

  computeBadgeTier(score: number, thresholds?: { excellent: number; trusted: number; watchlist: number }) {
    const t = thresholds ?? { excellent: 90, trusted: 75, watchlist: 60 };
    if (score >= t.excellent) return { tier: BadgeTier.EXCELLENT, label: 'Excelente' };
    if (score >= t.trusted) return { tier: BadgeTier.TRUSTED, label: 'Confiable' };
    if (score >= t.watchlist) return { tier: BadgeTier.WATCHLIST, label: 'En observación' };
    return { tier: BadgeTier.RESTRICTED, label: 'Restringido' };
  }

  async updateBadge(userId: string, actorType: ActorType, score: number) {
    const cfg = await this.getConfig('score_thresholds', { badge: { excellent: 90, trusted: 75, watchlist: 60 } });
    const badge = this.computeBadgeTier(score, cfg?.badge);
    const saved = await this.prisma.userBadge.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: actorType } },
      update: { tier: badge.tier, label: badge.label },
      create: { user_id: userId, actor_type: actorType, tier: badge.tier, label: badge.label },
    });
    this.ws.emitToUser(userId, 'user.badge.updated', { actor_type: actorType, tier: saved.tier, label: saved.label });
    return saved;
  }

  async getMyBadge(userId: string, actorType: ActorType) {
    const score = await this.prisma.userScore.findUnique({ where: { user_id_actor_type: { user_id: userId, actor_type: actorType } } });
    if (!score) return { tier: BadgeTier.TRUSTED, label: 'Confiable' };
    const badge = await this.updateBadge(userId, actorType, score.score);
    return { tier: badge.tier, label: badge.label };
  }

  private isInWindow(now: Date, window: { days: number[]; start: string; end: string }) {
    const day = now.getDay();
    if (!window.days.includes(day)) return false;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = window.start.split(':').map(Number);
    const [eh, em] = window.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (end < start) return currentMinutes >= start || currentMinutes <= end;
    return currentMinutes >= start && currentMinutes <= end;
  }

  async isPeakNow() {
    const cfg = await this.getConfig('peak_hours', { windows: [] as any[] });
    const now = new Date();
    return (cfg.windows ?? []).some((w: any) => this.isInWindow(now, w));
  }

  async evaluatePeakGate(userId: string, actorType: ActorType, score: number, status: RestrictionStatus) {
    const cfg = await this.getConfig('peak_hours', { driver_min_score: 50, passenger_min_score: 45 });
    const peak = await this.isPeakNow();
    if (!peak) return { allowed: true, limitedMode: status === RestrictionStatus.LIMITED, reason: 'off_peak' };
    if (status === RestrictionStatus.BLOCKED) {
      await this.prisma.peakGateEvent.create({ data: { user_id: userId, actor_type: actorType, allowed: false, reason: 'blocked_status' } });
      this.ws.emitToUser(userId, 'peak.gate.denied', { actor_type: actorType, reason: 'blocked_status' });
      return { allowed: false, limitedMode: false, reason: 'blocked_status' };
    }
    const min = actorType === ActorType.DRIVER ? (cfg.driver_min_score ?? 50) : (cfg.passenger_min_score ?? 45);
    if (score < min) {
      await this.prisma.peakGateEvent.create({ data: { user_id: userId, actor_type: actorType, allowed: false, reason: 'score_below_peak_min' } });
      this.ws.emitToUser(userId, 'peak.gate.denied', { actor_type: actorType, reason: 'score_below_peak_min', min_score: min });
      return { allowed: false, limitedMode: false, reason: 'score_below_peak_min' };
    }
    return { allowed: true, limitedMode: status === RestrictionStatus.LIMITED, reason: 'peak_allowed' };
  }

  pointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng; const yi = polygon[i].lat;
      const xj = polygon[j].lng; const yj = polygon[j].lat;
      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  async getPremiumContext(point: { lat: number; lng: number }, actorType: ActorType, actorScore: number) {
    const zones = await this.prisma.premiumZone.findMany({ where: { is_active: true } });
    const zone = zones.find((z) => Array.isArray(z.polygon_json) && this.pointInPolygon(point, z.polygon_json as any));
    if (!zone) return { zone: null, eligible: true, premium_bonus: 0 };
    const eligible = actorType === ActorType.DRIVER ? actorScore >= zone.min_driver_score : actorScore >= zone.min_passenger_score;
    return { zone, eligible, premium_bonus: eligible ? 0.5 : 0 };
  }

  async listConfigKeys() {
    return this.prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async getConfigByKey(key: string) {
    return this.prisma.appConfig.findUnique({ where: { key } });
  }

  async putConfig(key: string, value: unknown) {
    return this.prisma.appConfig.upsert({ where: { key }, update: { value_json: value as any }, create: { key, value_json: value as any } });
  }
}
