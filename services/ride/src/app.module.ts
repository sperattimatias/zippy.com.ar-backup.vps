import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { JwtAccessGuard } from './common/jwt-access.guard';
import { RolesGuard } from './common/roles.guard';
import { RideController } from './ride/ride.controller';
import { RideService } from './ride/ride.service';
import { RideGateway } from './ride/ride.gateway';
import { ScoreService } from './score/score.service';
import { MeritocracyService } from './meritocracy/meritocracy.service';
import { LevelAndBonusService } from './levels/level-bonus.service';
import { FraudService } from './fraud/fraud.service';
import { PolicyBootstrapService } from './bootstrap/policy-bootstrap.service';
import { InternalCommissionController } from './internal/internal-commission.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        RIDE_SERVICE_PORT: Joi.number().default(3002),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      }),
    }),
    JwtModule.register({}),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController, RideController, InternalCommissionController],
  providers: [PrismaService, JwtAccessGuard, RolesGuard, RideService, RideGateway, MeritocracyService, ScoreService, LevelAndBonusService, FraudService, PolicyBootstrapService],
})
export class AppModule {}
