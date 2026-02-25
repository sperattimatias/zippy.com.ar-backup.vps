import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { DriverDocumentType } from '@prisma/client';

export class PresignDocumentDto {
  @ApiProperty({ enum: DriverDocumentType })
  @IsEnum(DriverDocumentType)
  type!: DriverDocumentType;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mime_type!: string;

  @ApiProperty({ example: 350000 })
  @IsInt()
  @Min(1)
  @Max(8_000_000)
  size_bytes!: number;
}
