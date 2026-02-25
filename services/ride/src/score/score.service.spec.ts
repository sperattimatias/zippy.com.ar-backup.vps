import { ForbiddenException } from '@nestjs/common';
import { ActorType, RestrictionStatus, ScoreEventType } from '@prisma/client';
import { ScoreService } from './score.service';

describe('ScoreService', () => {
  it('clamps score to 0..100', async () => {
    const prisma: any = {
      userScore: {
        upsert: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 95, status: RestrictionStatus.NONE }),
        update: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 100, status: RestrictionStatus.NONE }),
      },
      scoreEvent: { create: jest.fn().mockResolvedValue({}) },
      userRestriction: { create: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn({ userScore: prisma.userScore, scoreEvent: prisma.scoreEvent, userRestriction: prisma.userRestriction })),
    };
    const ws: any = { emitToUser: jest.fn(), emitSosAlert: jest.fn() };
    const svc = new ScoreService(prisma, ws, { updateBadge: jest.fn() } as any);
    const out = await svc.applyScoreEvent({ user_id: 'u1', actor_type: ActorType.DRIVER, type: ScoreEventType.MANUAL_ADJUST, delta: 20 });
    expect(out.updatedScore.score).toBe(100);
  });

  it('auto-block creates restriction for score below 40', async () => {
    const prisma: any = {
      userScore: {
        upsert: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 45, status: RestrictionStatus.LIMITED }),
        update: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 30, status: RestrictionStatus.BLOCKED }),
      },
      scoreEvent: { create: jest.fn().mockResolvedValue({}) },
      userRestriction: { create: jest.fn().mockResolvedValue({ id: 'r1' }) },
      $transaction: jest.fn(async (fn: any) => fn({ userScore: prisma.userScore, scoreEvent: prisma.scoreEvent, userRestriction: prisma.userRestriction })),
    };
    const ws: any = { emitToUser: jest.fn(), emitSosAlert: jest.fn() };
    const svc = new ScoreService(prisma, ws, { updateBadge: jest.fn() } as any);
    const out = await svc.applyScoreEvent({ user_id: 'u1', actor_type: ActorType.DRIVER, type: ScoreEventType.DRIVER_CANCEL_LATE, delta: -15 });
    expect(out.autoRestriction).toBeTruthy();
    expect(prisma.userRestriction.create).toHaveBeenCalled();
  });

  it('driver presence online is blocked when active blocked restriction exists', async () => {
    const prisma: any = {
      userRestriction: { findFirst: jest.fn().mockResolvedValue({ status: RestrictionStatus.BLOCKED, ends_at: new Date(Date.now() + 1000) }) },
    };
    const svc = new ScoreService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any, { updateBadge: jest.fn() } as any);
    await expect(svc.ensureDriverCanGoOnline('d1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
