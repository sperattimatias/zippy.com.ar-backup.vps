import { IsOptional, IsString, MinLength } from 'class-validator';

export class ReviewActionDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
