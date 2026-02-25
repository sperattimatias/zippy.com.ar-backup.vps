import { IsString } from 'class-validator';

export class ConnectMpDto {
  @IsString()
  mp_account_id!: string;
}
