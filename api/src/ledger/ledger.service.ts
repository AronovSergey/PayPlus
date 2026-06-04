import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  findByWallet(walletId: string): Promise<LedgerEntry[]> {
    return this.ledgerRepo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }

  findByTransaction(transactionId: string): Promise<LedgerEntry[]> {
    return this.ledgerRepo.find({
      where: { transactionId },
      order: { createdAt: 'DESC' },
    });
  }
}
