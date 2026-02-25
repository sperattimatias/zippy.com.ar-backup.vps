import { IsIn, IsString } from 'class-validator';

export class GrantRoleDto {
  @IsString()
  user_id!: string;

  @IsString()
  @IsIn(['passenger', 'driver', 'admin', 'sos'])
  role!: 'passenger' | 'driver' | 'admin' | 'sos';
}
