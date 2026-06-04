import { IsEnum } from 'class-validator';
import { MerchantStatus } from '../../types/enums';

export class UpdateMerchantStatusDto {
  @IsEnum(MerchantStatus)
  status: MerchantStatus;
}
