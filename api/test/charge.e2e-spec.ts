import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/exception.filter';

describe('POST /api/transactions/charge — insufficient_funds', () => {
  let app: INestApplication<App>;
  let walletId: string;
  let merchantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api');
    await app.init();

    // create a wallet and deposit exactly 50.00
    const wallet = await request(app.getHttpServer())
      .post('/api/wallets')
      .send({ externalId: 'e2e-emp-001', currency: 'ILS' })
      .expect(201);
    walletId = wallet.body.id;

    await request(app.getHttpServer())
      .post(`/api/wallets/${walletId}/deposit`)
      .send({ amount: '50.00' })
      .expect(201);

    // create an active merchant
    const merchant = await request(app.getHttpServer())
      .post('/api/merchants')
      .send({ name: 'E2E Merchant' })
      .expect(201);
    merchantId = merchant.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the exact insufficient_funds error shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '120.50',
        currency: 'ILS',
        idempotencyKey: 'e2e-insufficient-funds-test',
      })
      .expect(409);

    expect(res.body).toEqual({
      error: {
        code: 'insufficient_funds',
        message: 'Wallet does not have enough available balance',
        status: 409,
        details: {
          wallet_id: walletId,
          available_balance: '50.00',
          requested_amount: '120.50',
        },
      },
    });
  });
});
