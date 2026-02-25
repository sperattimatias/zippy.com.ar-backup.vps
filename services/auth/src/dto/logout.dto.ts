import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
