import { LedgerEntryType, MerchantStatus, TransactionStatus, TransactionType, WalletStatus } from './enums';

export interface IWallet {
  id: string;
  externalId: string;
  currency: string;
  balance: string;
  status: WalletStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMerchant {
  id: string;
  name: string;
  status: MerchantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  walletId: string;
  merchantId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  status: TransactionStatus;
  declineReason?: string;
  originalTransactionId?: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILedgerEntry {
  id: string;
  walletId: string;
  transactionId: string;
  type: LedgerEntryType;
  amount: string;
  currency: string;
  createdAt: Date;
}
