import { IsEnum } from 'class-validator';
import { WalletStatus } from '../../types/enums';

export class UpdateWalletStatusDto {
  @IsEnum(WalletStatus)
  status: WalletStatus;
}
