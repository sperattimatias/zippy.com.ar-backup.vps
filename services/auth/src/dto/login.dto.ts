import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@zippy.com.ar' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 10, example: 'MyS3curePassw0rd!' })
  @IsString()
  @MinLength(10)
  password!: string;
}
