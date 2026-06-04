import { IsNotEmpty, IsNumberString, IsString, IsUUID } from 'class-validator';

export class ChargeDto {
  @IsUUID()
  walletId: string;

  @IsUUID()
  merchantId: string;

  @IsNumberString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
