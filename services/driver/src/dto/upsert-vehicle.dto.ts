import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleCategory } from '@prisma/client';

export class UpsertVehicleDto {
  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  category!: VehicleCategory;

  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) year?: number;
  @IsOptional() @IsString() plate?: string;
  @IsOptional() @IsString() color?: string;
}
