import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IMerchant } from '../types/entities';
import { MerchantStatus } from '../types/enums';

@Entity('merchants')
export class Merchant implements IMerchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.ACTIVE })
  status: MerchantStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
