import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { JwtAccessGuard } from './common/jwt-access.guard';
import { RolesGuard } from './common/roles.guard';
import { PaymentsController } from './payments/payments.controller';
import { PaymentMvpService } from './payments/payment-mvp.service';
import { PaymentsService } from './payments/payments.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        PAYMENT_SERVICE_PORT: Joi.number().default(3004),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        MP_WEBHOOK_SECRET: Joi.string().optional(),
        // Internal URL to the ride service (docker network), used for meritocracy-based commission computation.
        RIDE_SERVICE_URL: Joi.string().uri().optional(),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController, PaymentsController],
  providers: [PrismaService, JwtAccessGuard, RolesGuard, PaymentsService, PaymentMvpService],
})
export class AppModule {}
