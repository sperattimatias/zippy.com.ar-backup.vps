import { LedgerActor, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePreferenceDto {
  @IsString() trip_id!: string;
}

export class AdminFinanceTripsFilterDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class AdminLedgerFilterDto {
  @IsOptional() @IsEnum(LedgerActor) actor_type?: LedgerActor;
}

export class ReconciliationDto {
  @IsDateString() date!: string;
}

export class AdminRefundDto {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  reason!: string;
}

export class AdminRefundsFilterDto {
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}


export class RevokeBonusLedgerDto {
  @IsString()
  reason!: string;
}
