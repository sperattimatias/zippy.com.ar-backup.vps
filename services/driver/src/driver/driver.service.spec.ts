import { DriverService } from './driver.service';

describe('DriverService', () => {
  it('requests driver profile', async () => {
    const prisma: any = {
      driverProfile: { upsert: jest.fn().mockResolvedValue({ id: 'dp1', user_id: 'u1', status: 'PENDING_DOCS' }) },
      driverEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new DriverService(prisma, {} as any, {} as any, {} as any);
    const res = await service.requestDriver('u1');
    expect(res.status).toBe('PENDING_DOCS');
  });

  it('presigns document', async () => {
    const prisma: any = {
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'dp1' }) },
      driverDocument: { create: jest.fn().mockResolvedValue({ id: 'doc1' }) },
      driverEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const minio: any = { presignedPutObject: jest.fn().mockResolvedValue('https://signed-put') };
    const service = new DriverService(prisma, minio, {} as any, {} as any);
    const res = await service.presignDocument('u1', { type: 'SELFIE' as any, mime_type: 'image/jpeg', size_bytes: 100 });
    expect(res.put_url).toContain('signed-put');
  });

  it('approve calls auth grant-role', async () => {
    const { of } = require('rxjs');
    const post = jest.fn().mockReturnValue(of({ data: { ok: true } }));
    const prisma: any = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'dp1', user_id: 'u1' }),
        update: jest.fn().mockResolvedValue({ id: 'dp1', user_id: 'u1' }),
      },
      driverEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const http: any = { post };
    const cfg: any = { getOrThrow: jest.fn().mockReturnValue('http://auth:3001') };
    const service = new DriverService(prisma, {} as any, http, cfg);
    const res = await service.approve('dp1', 'admin1');
    expect(res.user_id).toBe('u1');
  });
});
