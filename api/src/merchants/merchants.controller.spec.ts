import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

describe('MerchantsController', () => {
  let controller: MerchantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantsController],
      providers: [{ provide: MerchantsService, useValue: {} }],
    }).compile();
    controller = module.get<MerchantsController>(MerchantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
