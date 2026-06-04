import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Wallet } from './wallet.entity';
import { ILedgerEntry } from '../types/entities';
import { LedgerEntryType } from '../types/enums';

@Entity('ledger_entries')
export class LedgerEntry implements ILedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column()
  walletId: string;

  @ManyToOne(() => Transaction)
  transaction: Transaction;

  @Column()
  transactionId: string;

  @Column({ type: 'enum', enum: LedgerEntryType })
  type: LedgerEntryType;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column()
  currency: string;

  @CreateDateColumn()
  createdAt: Date;
}
