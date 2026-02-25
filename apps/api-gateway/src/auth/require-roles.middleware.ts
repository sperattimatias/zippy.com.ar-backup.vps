import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RequirePassengerMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('passenger')) throw new ForbiddenException('passenger role required');
    next();
  }
}

@Injectable()
export class RequireDriverMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('driver')) throw new ForbiddenException('driver role required');
    next();
  }
}

@Injectable()
export class RequirePassengerOrDriverMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.some((r) => ['passenger', 'driver'].includes(r))) {
      throw new ForbiddenException('passenger/driver role required');
    }
    next();
  }
}

@Injectable()
export class RequireAdminMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('admin')) {
      throw new ForbiddenException('admin role required');
    }
    next();
  }
}
