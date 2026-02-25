import { UnauthorizedException } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

describe('JwtAccessGuard', () => {
  it('rejects missing bearer token', async () => {
    const guard = new JwtAccessGuard({} as any, { getOrThrow: jest.fn() } as any);

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    };

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
