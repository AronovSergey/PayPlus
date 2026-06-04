import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Big } from 'big.js';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, OptimisticLockVersionMismatchError, Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { Merchant } from '../entities/merchant.entity';
import { Transaction } from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntryType, MerchantStatus, TransactionStatus, TransactionType, WalletStatus } from '../types/enums';
import { ChargeDto } from './dto/charge.dto';
import { RefundDto } from './dto/refund.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }

  async findAll(filters: {
    walletId?: string;
    merchantId?: string;
    type?: TransactionType;
    status?: TransactionStatus;
  } = {}): Promise<Transaction[]> {
    const where: Record<string, unknown> = {};
    if (filters.walletId) { where.walletId = filters.walletId; }
    if (filters.merchantId) { where.merchantId = filters.merchantId; }
    if (filters.type) { where.type = filters.type; }
    if (filters.status) { where.status = filters.status; }
    return this.transactionRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async charge(dto: ChargeDto): Promise<Transaction> {
    // idempotency: same key returns the original transaction without reprocessing
    const existing = await this.transactionRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const wallet = await manager.findOne(Wallet, { where: { id: dto.walletId } });
        // wallet must exist — bad request if caller sends a non-existent ID
        if (!wallet) {
          throw new NotFoundException(`Wallet ${dto.walletId} not found`);
        }

        const merchant = await manager.findOne(Merchant, { where: { id: dto.merchantId } });
        // merchant must exist — bad request if caller sends a non-existent ID
        if (!merchant) {
          throw new NotFoundException(`Merchant ${dto.merchantId} not found`);
        }

        // declined: wallet is inactive — still persisted so the caller has a record
        if (wallet.status !== WalletStatus.ACTIVE) {
          const declined = manager.create(Transaction, {
            walletId: dto.walletId,
            merchantId: dto.merchantId,
            type: TransactionType.CHARGE,
            amount: dto.amount,
            currency: dto.currency,
            status: TransactionStatus.DECLINED,
            declineReason: 'wallet_inactive',
            idempotencyKey: dto.idempotencyKey,
          });
          return manager.save(Transaction, declined);
        }

        // declined: merchant is inactive — still persisted so the caller has a record
        if (merchant.status !== MerchantStatus.ACTIVE) {
          const declined = manager.create(Transaction, {
            walletId: dto.walletId,
            merchantId: dto.merchantId,
            type: TransactionType.CHARGE,
            amount: dto.amount,
            currency: dto.currency,
            status: TransactionStatus.DECLINED,
            declineReason: 'merchant_inactive',
            idempotencyKey: dto.idempotencyKey,
          });
          return manager.save(Transaction, declined);
        }

        // declined: not enough balance — persisted then thrown as 409 with details
        if (new Big(wallet.balance).lt(dto.amount)) {
          const declined = manager.create(Transaction, {
            walletId: dto.walletId,
            merchantId: dto.merchantId,
            type: TransactionType.CHARGE,
            amount: dto.amount,
            currency: dto.currency,
            status: TransactionStatus.DECLINED,
            declineReason: 'insufficient_funds',
            idempotencyKey: dto.idempotencyKey,
          });
          const saved = await manager.save(Transaction, declined);
          throw Object.assign(new ConflictException({
            code: 'insufficient_funds',
            message: 'Wallet does not have enough available balance',
            details: {
              wallet_id: wallet.id,
              available_balance: wallet.balance,
              requested_amount: dto.amount,
            },
          }), { transaction: saved });
        }

        wallet.balance = new Big(wallet.balance).minus(dto.amount).toFixed(2);
        // version column incremented here — concurrent charge to same wallet will throw OptimisticLockVersionMismatchError
        await manager.save(Wallet, wallet);

        const transaction = manager.create(Transaction, {
          walletId: dto.walletId,
          merchantId: dto.merchantId,
          type: TransactionType.CHARGE,
          amount: dto.amount,
          currency: dto.currency,
          status: TransactionStatus.COMPLETED,
          idempotencyKey: dto.idempotencyKey,
        });
        const saved = await manager.save(Transaction, transaction);

        const ledgerEntry = manager.create(LedgerEntry, {
          walletId: dto.walletId,
          transactionId: saved.id,
          type: LedgerEntryType.CHARGE,
          amount: dto.amount,
          currency: dto.currency,
        });
        await manager.save(LedgerEntry, ledgerEntry);

        return saved;
      });
    } catch (err) {
      // two concurrent charges read the same wallet version — one wins, the other retries
      if (err instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException({
          code: 'concurrent_modification',
          message: 'Wallet was modified concurrently, please retry',
        });
      }
      throw err;
    }
  }

  async refund(dto: RefundDto): Promise<Transaction> {
    // idempotency: same key returns the original refund without reprocessing
    const existing = await this.transactionRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    // original transaction must exist and be a completed charge
    const original = await this.transactionRepo.findOne({
      where: { id: dto.originalTransactionId },
    });
    if (!original) {
      throw new NotFoundException(`Transaction ${dto.originalTransactionId} not found`);
    }
    if (original.type !== TransactionType.CHARGE || original.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Refund must reference a completed charge transaction');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const wallet = await manager.findOne(Wallet, { where: { id: original.walletId } });
        if (!wallet) {
          throw new NotFoundException(`Wallet ${original.walletId} not found`);
        }

        wallet.balance = new Big(wallet.balance).plus(original.amount).toFixed(2);
        // version column incremented here — concurrent modification throws OptimisticLockVersionMismatchError
        await manager.save(Wallet, wallet);

        const refund = manager.create(Transaction, {
          walletId: original.walletId,
          merchantId: original.merchantId,
          type: TransactionType.REFUND,
          amount: original.amount,
          currency: original.currency,
          status: TransactionStatus.COMPLETED,
          originalTransactionId: original.id,
          idempotencyKey: dto.idempotencyKey,
        });
        const saved = await manager.save(Transaction, refund);

        const ledgerEntry = manager.create(LedgerEntry, {
          walletId: original.walletId,
          transactionId: saved.id,
          type: LedgerEntryType.REFUND,
          amount: original.amount,
          currency: original.currency,
        });
        await manager.save(LedgerEntry, ledgerEntry);

        return saved;
      });
    } catch (err) {
      if (err instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException({
          code: 'concurrent_modification',
          message: 'Wallet was modified concurrently, please retry',
        });
      }
      throw err;
    }
  }
}
