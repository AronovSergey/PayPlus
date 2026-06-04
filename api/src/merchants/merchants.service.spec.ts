import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Merchant } from '../entities/merchant.entity';
import { MerchantsService } from './merchants.service';

describe('MerchantsService', () => {
  let service: MerchantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: getRepositoryToken(Merchant), useValue: {} },
      ],
    }).compile();
    service = module.get<MerchantsService>(MerchantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
