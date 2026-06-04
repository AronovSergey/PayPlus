import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RefundDto {
  @IsUUID()
  originalTransactionId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
