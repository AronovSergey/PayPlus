import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  let service: WalletsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: getRepositoryToken(Wallet), useValue: {} },
      ],
    }).compile();
    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
