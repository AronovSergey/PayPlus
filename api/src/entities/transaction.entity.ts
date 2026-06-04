import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';
import { Wallet } from './wallet.entity';
import { ITransaction } from '../types/entities';
import { TransactionStatus, TransactionType } from '../types/enums';

@Entity('transactions')
export class Transaction implements ITransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column()
  walletId: string;

  @ManyToOne(() => Merchant)
  merchant: Merchant;

  @Column()
  merchantId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column()
  currency: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ nullable: true, type: 'varchar' })
  declineReason?: string;

  @Column({ nullable: true, type: 'varchar' })
  originalTransactionId?: string;

  @Column({ unique: true })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
