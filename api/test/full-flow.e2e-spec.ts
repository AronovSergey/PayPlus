import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/exception.filter';

describe('Full flow — wallet charge and refund', () => {
  let app: INestApplication<App>;
  let walletId: string;
  let merchantId: string;
  let chargeId: string;
  let refundId: string;
  const run = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. health check passes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
  });

  it('2. creates an active merchant', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/merchants')
      .send({ name: 'Flow Merchant' })
      .expect(201);

    merchantId = res.body.id;
    expect(res.body.status).toBe('active');
  });

  it('3. creates a wallet with zero balance', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wallets')
      .send({ externalId: 'flow-emp-001', currency: 'ILS' })
      .expect(201);

    walletId = res.body.id;
    expect(res.body.balance).toBe('0.00');
    expect(res.body.status).toBe('active');
  });

  it('4. charge is declined when balance is 0', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '100.00',
        currency: 'ILS',
        idempotencyKey: `flow-charge-before-deposit-${run}`,
      })
      .expect(409);

    expect(res.body.error.code).toBe('insufficient_funds');
    expect(res.body.error.details.available_balance).toBe('0.00');
    expect(res.body.error.details.requested_amount).toBe('100.00');
  });

  it('5. no ledger entry created for declined charge', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}/ledger-entries`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('6. deposits 500.00 into the wallet', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/wallets/${walletId}/deposit`)
      .send({ amount: '500.00' })
      .expect(201);

    expect(res.body.balance).toBe('500.00');
  });

  it('7. charge of 100.00 completes successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '100.00',
        currency: 'ILS',
        idempotencyKey: `flow-charge-001-${run}`,
      })
      .expect(201);

    chargeId = res.body.id;
    expect(res.body.status).toBe('completed');
    expect(res.body.type).toBe('charge');
  });

  it('8. wallet balance is deducted after charge', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}`)
      .expect(200);

    expect(res.body.balance).toBe('400.00');
  });

  it('9. charge creates exactly one ledger entry', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}/ledger-entries`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('charge');
    expect(res.body[0].amount).toBe('100.00');
  });

  it('10. idempotent charge returns the same transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '100.00',
        currency: 'ILS',
        idempotencyKey: `flow-charge-001-${run}`,
      })
      .expect(201);

    expect(res.body.id).toBe(chargeId);

    const wallet = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}`)
      .expect(200);

    // balance must not change on duplicate
    expect(wallet.body.balance).toBe('400.00');
  });

  it('11. refund of the charge completes successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions/refund')
      .send({
        originalTransactionId: chargeId,
        idempotencyKey: `flow-refund-001-${run}`,
      })
      .expect(201);

    refundId = res.body.id;
    expect(res.body.status).toBe('completed');
    expect(res.body.type).toBe('refund');
    expect(res.body.originalTransactionId).toBe(chargeId);
  });

  it('12. wallet balance is credited after refund', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}`)
      .expect(200);

    expect(res.body.balance).toBe('500.00');
  });

  it('13. refund creates a ledger entry — wallet now has 2 entries', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/wallets/${walletId}/ledger-entries`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].type).toBe('refund');
    expect(res.body[1].type).toBe('charge');
  });

  it('14. ledger entries by transaction — charge has 1 entry', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/transactions/${chargeId}/ledger-entries`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('charge');
  });

  it('15. ledger entries by transaction — refund has 1 entry', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/transactions/${refundId}/ledger-entries`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('refund');
  });

  it('16. cannot refund a non-charge transaction', async () => {
    await request(app.getHttpServer())
      .post('/api/transactions/refund')
      .send({
        originalTransactionId: refundId,
        idempotencyKey: `flow-refund-invalid-${run}`,
      })
      .expect(400);
  });

  it('17. deactivating wallet declines future charges', async () => {
    await request(app.getHttpServer())
      .patch(`/api/wallets/${walletId}/status`)
      .send({ status: 'inactive' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '10.00',
        currency: 'ILS',
        idempotencyKey: `flow-charge-inactive-wallet-${run}`,
      })
      .expect(201);

    expect(res.body.status).toBe('declined');
    expect(res.body.declineReason).toBe('wallet_inactive');
  });

  it('18. deactivating merchant declines future charges', async () => {
    await request(app.getHttpServer())
      .patch(`/api/wallets/${walletId}/status`)
      .send({ status: 'active' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/merchants/${merchantId}/status`)
      .send({ status: 'inactive' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/transactions/charge')
      .send({
        walletId,
        merchantId,
        amount: '10.00',
        currency: 'ILS',
        idempotencyKey: `flow-charge-inactive-merchant-${run}`,
      })
      .expect(201);

    expect(res.body.status).toBe('declined');
    expect(res.body.declineReason).toBe('merchant_inactive');
  });
});
