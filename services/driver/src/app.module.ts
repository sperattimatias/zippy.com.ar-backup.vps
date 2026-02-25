import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AppController } from './app.controller';
import { DriverController } from './driver/driver.controller';
import { DriverService } from './driver/driver.service';
import { PrismaService } from './prisma/prisma.service';
import { MinioService } from './minio/minio.service';
import { JwtAccessGuard } from './common/jwt-access.guard';
import { RolesGuard } from './common/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        DRIVER_SERVICE_PORT: Joi.number().default(3003),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        MINIO_ENDPOINT: Joi.string().required(),
        MINIO_PORT: Joi.number().default(9000),
        MINIO_ROOT_USER: Joi.string().required(),
        MINIO_ROOT_PASSWORD: Joi.string().required(),
        MINIO_BUCKET: Joi.string().default('zippy-private'),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      }),
    }),
    HttpModule,
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController, DriverController],
  providers: [DriverService, PrismaService, MinioService, JwtAccessGuard, RolesGuard],
})
export class AppModule {}
