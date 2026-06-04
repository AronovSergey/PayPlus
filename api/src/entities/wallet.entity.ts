import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IWallet } from '../types/entities';
import { WalletStatus } from '../types/enums';

@Entity('wallets')
export class Wallet implements IWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  externalId: string;

  @Column()
  currency: string;

  @Column('decimal', { precision: 18, scale: 2, default: '0.00' })
  balance: string;

  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE })
  status: WalletStatus;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
