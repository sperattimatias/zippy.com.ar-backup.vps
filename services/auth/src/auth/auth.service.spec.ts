import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access.jwt.token'),
  } as any;

  const configService = {
    get: jest.fn((key: string, def?: unknown) => {
      const map: Record<string, unknown> = {
        JWT_ACCESS_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_DAYS: 30,
      };
      return map[key] ?? def;
    }),
    getOrThrow: jest.fn(() => '12345678901234567890123456789012'),
  } as any;

  it('refresh rotates token and revokes old one', async () => {
    const prisma = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'old-token-id',
          token_hash: 'old',
          revoked_at: null,
          expires_at: new Date(Date.now() + 100000),
          user: {
            id: 'user-1',
            email: 'admin@zippy.com.ar',
            roles: [{ role: { name: 'admin' } }],
          },
        }),
        create: jest.fn().mockResolvedValue({ id: 'new-token-id' }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    const result = await service.refresh({ refresh_token: 'refresh-token-raw-value-123456' });

    expect(result.access_token).toBe('access.jwt.token');
    expect(result.refresh_token).toBeDefined();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'old-token-id' },
      data: expect.objectContaining({ revoked_at: expect.any(Date), replaced_by_token_id: 'new-token-id' }),
    });
  });
});
