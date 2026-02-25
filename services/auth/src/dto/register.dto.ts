import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@zippy.com.ar' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 10,
    example: 'MyS3curePassw0rd!',
    description: 'At least 10 chars, including uppercase, lowercase, number, and special char',
  })
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'password must include at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password!: string;
}
