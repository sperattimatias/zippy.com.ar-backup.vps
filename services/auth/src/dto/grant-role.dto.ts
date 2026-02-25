import { IsIn, IsString } from 'class-validator';

export class GrantRoleDto {
  @IsString()
  user_id!: string;

  @IsString()
  @IsIn(['driver'])
  role!: 'driver';
}
