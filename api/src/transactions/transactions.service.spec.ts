import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { Merchant } from '../entities/merchant.entity';
import { Transaction } from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { MerchantStatus, TransactionStatus, TransactionType, WalletStatus } from '../types/enums';
import { ChargeDto } from './dto/charge.dto';
import { TransactionsService } from './transactions.service';

const mockWallet = (overrides = {}): Wallet => ({
  id: 'wallet-1',
  externalId: 'emp-001',
  currency: 'ILS',
  balance: '500.00',
  status: WalletStatus.ACTIVE,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockMerchant = (overrides = {}): Merchant => ({
  id: 'merchant-1',
  name: 'Test Merchant',
  status: MerchantStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockTransaction = (overrides = {}): Transaction => ({
  id: 'tx-1',
  walletId: 'wallet-1',
  merchantId: 'merchant-1',
  type: TransactionType.CHARGE,
  amount: '100.00',
  currency: 'ILS',
  status: TransactionStatus.COMPLETED,
  idempotencyKey: 'key-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const chargeDto: ChargeDto = {
  walletId: 'wallet-1',
  merchantId: 'merchant-1',
  amount: '100.00',
  currency: 'ILS',
  idempotencyKey: 'key-1',
};

describe('TransactionsService.charge', () => {
  let service: TransactionsService;
  let transactionRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const buildManager = (walletOverrides = {}, merchantOverrides = {}) => ({
    findOne: jest.fn((entity) => {
      if (entity === Wallet) return Promise.resolve(mockWallet(walletOverrides));
      if (entity === Merchant) return Promise.resolve(mockMerchant(merchantOverrides));
      return Promise.resolve(null);
    }),
    create: jest.fn((_, data) => data),
    save: jest.fn((_, data) => Promise.resolve({ id: 'tx-new', ...data })),
  });

  beforeEach(async () => {
    transactionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(Wallet), useValue: {} },
        { provide: getRepositoryToken(Merchant), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('returns existing transaction when idempotency key already exists', async () => {
    const existing = mockTransaction();
    transactionRepo.findOne.mockResolvedValue(existing);

    const result = await service.charge(chargeDto);

    expect(result).toBe(existing);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when wallet does not exist', async () => {
    dataSource.transaction.mockImplementation(async (cb) => {
      const manager = {
        findOne: jest.fn((entity) => {
          if (entity === Wallet) return Promise.resolve(null);
          return Promise.resolve(mockMerchant());
        }),
        create: jest.fn(),
        save: jest.fn(),
      };
      return cb(manager);
    });

    await expect(service.charge(chargeDto)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when merchant does not exist', async () => {
    dataSource.transaction.mockImplementation(async (cb) => {
      const manager = {
        findOne: jest.fn((entity) => {
          if (entity === Wallet) return Promise.resolve(mockWallet());
          if (entity === Merchant) return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        create: jest.fn(),
        save: jest.fn(),
      };
      return cb(manager);
    });

    await expect(service.charge(chargeDto)).rejects.toThrow(NotFoundException);
  });

  it('saves declined transaction when wallet is inactive', async () => {
    const manager = buildManager({ status: WalletStatus.INACTIVE });
    dataSource.transaction.mockImplementation((cb) => cb(manager));

    const result = await service.charge(chargeDto);

    const saved = manager.save.mock.calls[0][1];
    expect(saved.status).toBe(TransactionStatus.DECLINED);
    expect(saved.declineReason).toBe('wallet_inactive');
    expect(result).toBeDefined();
  });

  it('saves declined transaction when merchant is inactive', async () => {
    const manager = buildManager({}, { status: MerchantStatus.INACTIVE });
    dataSource.transaction.mockImplementation((cb) => cb(manager));

    const result = await service.charge(chargeDto);

    const saved = manager.save.mock.calls[0][1];
    expect(saved.status).toBe(TransactionStatus.DECLINED);
    expect(saved.declineReason).toBe('merchant_inactive');
    expect(result).toBeDefined();
  });

  it('saves declined transaction and throws 409 when balance is insufficient', async () => {
    const manager = buildManager({ balance: '50.00' });
    dataSource.transaction.mockImplementation((cb) => cb(manager));

    await expect(service.charge(chargeDto)).rejects.toThrow(ConflictException);

    const saved = manager.save.mock.calls[0][1];
    expect(saved.status).toBe(TransactionStatus.DECLINED);
    expect(saved.declineReason).toBe('insufficient_funds');
  });

  it('throws 409 when optimistic lock version mismatch occurs', async () => {
    dataSource.transaction.mockRejectedValue(new OptimisticLockVersionMismatchError('Wallet', 1, 2));

    await expect(service.charge(chargeDto)).rejects.toThrow(ConflictException);
  });

  it('completes charge and creates ledger entry when all validations pass', async () => {
    const manager = buildManager();
    dataSource.transaction.mockImplementation((cb) => cb(manager));

    const result = await service.charge(chargeDto);

    // wallet save — balance deducted
    const walletSave = manager.save.mock.calls[0][1];
    expect(walletSave.balance).toBe('400.00');

    // transaction save
    const txSave = manager.save.mock.calls[1][1];
    expect(txSave.status).toBe(TransactionStatus.COMPLETED);

    // ledger entry save
    const ledgerSave = manager.save.mock.calls[2][1];
    expect(ledgerSave.type).toBe('charge');
    expect(ledgerSave.amount).toBe('100.00');

    expect(result).toBeDefined();
  });
});
