import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtAccessGuard } from './common/jwt-access.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        AUTH_SERVICE_PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_EXPIRES_DAYS: Joi.number().default(30),
        EMAIL_VERIFICATION_TTL_MIN: Joi.number().default(10),
      }),
    }),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    JwtModule.register({}),
  ],
  controllers: [AppController, AuthController],
  providers: [AuthService, PrismaService, JwtAccessGuard],
})
export class AppModule {}
