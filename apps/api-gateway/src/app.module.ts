import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { JwtClaimsMiddleware } from './auth/jwt-claims.middleware';
import {
  RequireAdminOrSosMiddleware,
  RequireDriverMiddleware,
  RequirePassengerMiddleware,
  RequirePassengerOrDriverMiddleware,
} from './auth/require-roles.middleware';

const authRoutes: RouteInfo[] = [{ path: 'api/auth/(.*)', method: RequestMethod.ALL }];
const rideRoutes: RouteInfo[] = [{ path: 'api/rides/(.*)', method: RequestMethod.ALL }];
const tripsRoutes: RouteInfo[] = [{ path: 'api/trips/(.*)', method: RequestMethod.ALL }];
const driverPresenceRoutes: RouteInfo[] = [{ path: 'api/drivers/presence/(.*)', method: RequestMethod.ALL }];
const driverRoutes: RouteInfo[] = [{ path: 'api/drivers/(.*)', method: RequestMethod.ALL }];
const adminDriverRoutes: RouteInfo[] = [{ path: 'api/admin/drivers/(.*)', method: RequestMethod.ALL }];
const adminTripsRoutes: RouteInfo[] = [{ path: 'api/admin/trips/(.*)', method: RequestMethod.ALL }];
const adminGeoZonesRoutes: RouteInfo[] = [
  { path: 'api/admin/geozones/(.*)', method: RequestMethod.ALL },
  { path: 'api/admin/geozones', method: RequestMethod.ALL },
];
const adminSafetyAlertsRoutes: RouteInfo[] = [
  { path: 'api/admin/safety-alerts/(.*)', method: RequestMethod.ALL },
  { path: 'api/admin/safety-alerts', method: RequestMethod.ALL },
];
const adminScoresRoutes: RouteInfo[] = [
  { path: 'api/admin/scores/(.*)', method: RequestMethod.ALL },
  { path: 'api/admin/scores', method: RequestMethod.ALL },
];
const adminUserScoreRoutes: RouteInfo[] = [
  { path: 'api/admin/users/:user_id/score', method: RequestMethod.ALL },
  { path: 'api/admin/users/:user_id/score/adjust', method: RequestMethod.ALL },
  { path: 'api/admin/users/:user_id/restrictions', method: RequestMethod.ALL },
];
const adminRestrictionsRoutes: RouteInfo[] = [{ path: 'api/admin/restrictions/:id/lift', method: RequestMethod.ALL }];
const adminConfigRoutes: RouteInfo[] = [{ path: 'api/admin/config/:key', method: RequestMethod.ALL }];
const adminPremiumZoneRoutes: RouteInfo[] = [
  { path: 'api/admin/premium-zones/(.*)', method: RequestMethod.ALL },
  { path: 'api/admin/premium-zones', method: RequestMethod.ALL },
];
const adminFraudRoutes: RouteInfo[] = [{ path: 'api/admin/fraud/(.*)', method: RequestMethod.ALL }];
const publicBadgeRoutes: RouteInfo[] = [{ path: 'api/public/badges/me', method: RequestMethod.GET }];
const adminLevelsRoutes: RouteInfo[] = [{ path: 'api/admin/levels', method: RequestMethod.ALL }];
const adminMonthlyPerformanceRoutes: RouteInfo[] = [{ path: 'api/admin/monthly-performance', method: RequestMethod.ALL }];
const adminBonusesRoutes: RouteInfo[] = [
  { path: 'api/admin/bonuses/(.*)', method: RequestMethod.ALL },
  { path: 'api/admin/bonuses', method: RequestMethod.ALL },
];
const adminPoliciesRoutes: RouteInfo[] = [{ path: 'api/admin/policies/:key', method: RequestMethod.ALL }];
const driverCommissionRoutes: RouteInfo[] = [{ path: 'api/drivers/commission/current', method: RequestMethod.ALL }];
const paymentRoutes: RouteInfo[] = [{ path: 'api/payments/(.*)', method: RequestMethod.ALL }];
const paymentCreatePreferenceRoutes: RouteInfo[] = [{ path: 'api/payments/payments/create-preference', method: RequestMethod.POST }];
const paymentDriverFinanceRoutes: RouteInfo[] = [{ path: 'api/payments/drivers/finance/(.*)', method: RequestMethod.ALL }];
const paymentAdminFinanceRoutes: RouteInfo[] = [{ path: 'api/payments/admin/finance/(.*)', method: RequestMethod.ALL }];
const paymentAdminPaymentRoutes: RouteInfo[] = [{ path: 'api/payments/admin/payments/(.*)', method: RequestMethod.ALL }];

const passengerTripRoutes: RouteInfo[] = [
  { path: 'api/trips/request', method: RequestMethod.POST },
  { path: 'api/trips/:id/accept-bid', method: RequestMethod.POST },
  { path: 'api/trips/:id/rate', method: RequestMethod.POST },
  { path: 'api/trips/:id/cancel', method: RequestMethod.POST },
];

const attachClientFingerprintHeaders = (req: any, _res: any, next: any) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xff) ? xff[0] : (typeof xff === 'string' ? xff.split(',')[0].trim() : req.ip);
  req.headers['x-client-ip'] = req.headers['x-client-ip'] ?? ip ?? '';
  req.headers['x-client-ua'] = req.headers['x-client-ua'] ?? req.headers['user-agent'] ?? '';
  if (req.headers['x-device-fp']) req.headers['x-device-fp'] = req.headers['x-device-fp'];
  next();
};

const driverTripRoutes: RouteInfo[] = [
  { path: 'api/trips/:id/bids', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/en-route', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/arrived', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/verify-otp', method: RequestMethod.POST },
  { path: 'api/trips/:id/location', method: RequestMethod.POST },
  { path: 'api/trips/:id/complete', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/cancel', method: RequestMethod.POST },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        API_GATEWAY_PORT: Joi.number().default(3000),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
        RIDE_SERVICE_URL: Joi.string().uri().required(),
        DRIVER_SERVICE_URL: Joi.string().uri().required(),
        PAYMENT_SERVICE_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [AppController],
  providers: [
    AuthGuard,
    RolesGuard,
    Reflector,
    JwtClaimsMiddleware,
    RequirePassengerMiddleware,
    RequireDriverMiddleware,
    RequireAdminOrSosMiddleware,
    RequirePassengerOrDriverMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtClaimsMiddleware, RequirePassengerOrDriverMiddleware).forRoutes(...driverRoutes, ...publicBadgeRoutes);

    consumer
      .apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware)
      .forRoutes(
        ...adminDriverRoutes,
        ...adminTripsRoutes,
        ...adminGeoZonesRoutes,
        ...adminSafetyAlertsRoutes,
        ...adminScoresRoutes,
        ...adminUserScoreRoutes,
        ...adminRestrictionsRoutes,
        ...adminConfigRoutes,
        ...adminPremiumZoneRoutes,
        ...adminFraudRoutes,
        ...adminLevelsRoutes,
        ...adminMonthlyPerformanceRoutes,
        ...adminBonusesRoutes,
        ...adminPoliciesRoutes,
      );

    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverPresenceRoutes, ...driverCommissionRoutes);
    consumer.apply(JwtClaimsMiddleware, RequirePassengerMiddleware).forRoutes(...passengerTripRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverTripRoutes);
    consumer.apply(attachClientFingerprintHeaders).forRoutes(...tripsRoutes, ...paymentRoutes);
    consumer.apply(JwtClaimsMiddleware, RequirePassengerMiddleware).forRoutes(...paymentCreatePreferenceRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...paymentDriverFinanceRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware).forRoutes(...paymentAdminFinanceRoutes, ...paymentAdminPaymentRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.AUTH_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/auth': '/auth' },
        }),
      )
      .forRoutes(...authRoutes);

    consumer
      .apply(createProxyMiddleware({ target: process.env.DRIVER_SERVICE_URL, changeOrigin: true }))
      .forRoutes(...driverRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/drivers': '/admin/drivers' },
        }),
      )
      .forRoutes(...adminDriverRoutes);

    const tripProxy = createProxyMiddleware({ target: process.env.RIDE_SERVICE_URL, changeOrigin: true });
    consumer.apply(tripProxy).forRoutes(...tripsRoutes, ...driverPresenceRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/trips': '/admin/trips' },
        }),
      )
      .forRoutes(...adminTripsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/geozones': '/admin/geozones' },
        }),
      )
      .forRoutes(...adminGeoZonesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/safety-alerts': '/admin/safety-alerts' },
        }),
      )
      .forRoutes(...adminSafetyAlertsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/scores': '/admin/scores' },
        }),
      )
      .forRoutes(...adminScoresRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/users': '/admin/users' },
        }),
      )
      .forRoutes(...adminUserScoreRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/restrictions': '/admin/restrictions' },
        }),
      )
      .forRoutes(...adminRestrictionsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/config': '/admin/config' },
        }),
      )
      .forRoutes(...adminConfigRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/premium-zones': '/admin/premium-zones' },
        }),
      )
      .forRoutes(...adminPremiumZoneRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/fraud': '/admin/fraud' },
        }),
      )
      .forRoutes(...adminFraudRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/public/badges': '/public/badges' },
        }),
      )
      .forRoutes(...publicBadgeRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/levels': '/admin/levels' },
        }),
      )
      .forRoutes(...adminLevelsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/monthly-performance': '/admin/monthly-performance' },
        }),
      )
      .forRoutes(...adminMonthlyPerformanceRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/bonuses': '/admin/bonuses' },
        }),
      )
      .forRoutes(...adminBonusesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/policies': '/admin/policies' },
        }),
      )
      .forRoutes(...adminPoliciesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/drivers/commission/current': '/drivers/commission/current' },
        }),
      )
      .forRoutes(...driverCommissionRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/rides': '/' },
        }),
      )
      .forRoutes(...rideRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.PAYMENT_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/payments': '/' },
        }),
      )
      .forRoutes(...paymentRoutes);
  }
}
