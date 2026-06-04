import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: getRepositoryToken(LedgerEntry), useValue: {} },
      ],
    }).compile();
    service = module.get<LedgerService>(LedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
