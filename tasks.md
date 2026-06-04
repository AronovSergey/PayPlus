# Task List

> Infrastructure first. No logic until the skeleton runs end-to-end.

---

## Phase 1 — Bootstrap

- [x] `nest new api --package-manager npm`
- [x] Install deps: `@nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer`
- [x] Create `.env` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`
- [x] Configure `ConfigModule.forRoot()` in `app.module.ts`
- [x] Configure `TypeOrmModule.forRootAsync()` using `ConfigService`
- [x] Verify DB connection boots without error (`npm run start:dev`)

---

## Phase 2 — Entities

- [x] Create `src/entities/wallet.entity.ts` — `id(uuid), externalId, currency, balance decimal(18,2), status(enum), createdAt, updatedAt`
- [x] Create `src/entities/merchant.entity.ts` — `id(uuid), name, status(enum), createdAt, updatedAt`
- [x] Create `src/entities/transaction.entity.ts` — `id(uuid), @ManyToOne wallet, @ManyToOne merchant, type(enum), amount decimal(18,2), currency, status(enum), declineReason(nullable), originalTransactionId(nullable), idempotencyKey(unique), createdAt, updatedAt`
- [x] Create `src/entities/ledger-entry.entity.ts` — `id(uuid), @ManyToOne wallet, @ManyToOne transaction, type(enum), amount decimal(18,2), currency, createdAt`
- [x] Add all enums: `WalletStatus`, `MerchantStatus`, `TransactionType`, `TransactionStatus`, `LedgerEntryType`
- [x] Register all entities in `TypeOrmModule` + `synchronize: true` (dev only)
- [x] Confirm all tables created in Postgres

---

## Phase 3 — Common Infrastructure

- [x] Create `src/common/filters/exception.filter.ts` — global filter returning structured error format
- [x] Register filter globally in `main.ts` via `app.useGlobalFilters()`
- [x] Add `ValidationPipe` globally in `main.ts`
- [x] Test that an unknown route returns the structured error format

---

## Phase 4 — Merchants Module Skeleton

- [x] `nest g module merchants`
- [x] `nest g controller merchants`
- [x] `nest g service merchants`
- [x] Inject `TypeOrmModule.forFeature([Merchant])` into `MerchantsModule`
- [x] Create `dto/create-merchant.dto.ts` — `name: string`
- [x] Create `dto/update-status.dto.ts` — `status: MerchantStatus`

---

## Phase 5 — Merchants Logic

- [x] `create()` — save merchant with status `active`
- [x] `findById()` — return merchant or throw `NotFoundException`
- [x] `findAll()` — return list (add basic pagination: `page`, `limit` if time allows)
- [x] `updateStatus()` — activate or inactivate
- [x] Wire up: `POST /api/merchants`, `GET /api/merchants/:id`, `GET /api/merchants`, `PATCH /api/merchants/:id/status`
- [x] Test all four endpoints

---

## Phase 6 — Wallets Module Skeleton

- [ ] `nest g module wallets`
- [ ] `nest g controller wallets`
- [ ] `nest g service wallets`
- [ ] Inject `TypeOrmModule.forFeature([Wallet])` into `WalletsModule`
- [ ] Create `dto/create-wallet.dto.ts` — `externalId: string`, `currency: string`
- [ ] Create `dto/update-status.dto.ts` — `status: WalletStatus`

---

## Phase 7 — Wallets Logic

- [ ] `create()` — save wallet with `balance: 0`, status `active`
- [ ] `findById()` — return wallet (includes balance) or throw `NotFoundException`
- [ ] `findAll()` — return list (basic pagination optional)
- [ ] `updateStatus()` — activate or inactivate
- [ ] Wire up: `POST /api/wallets`, `GET /api/wallets/:id`, `GET /api/wallets`, `PATCH /api/wallets/:id/status`
- [ ] Test all four endpoints

---

## Phase 8 — Transactions Module Skeleton

- [ ] `nest g module transactions`
- [ ] `nest g controller transactions`
- [ ] `nest g service transactions`
- [ ] Inject `TypeOrmModule.forFeature([Transaction, Wallet, Merchant])` + `DataSource`
- [ ] Create `dto/charge.dto.ts` — `walletId, merchantId, amount, currency, idempotencyKey`
- [ ] Create `dto/refund.dto.ts` — `originalTransactionId, idempotencyKey`

---

## Phase 9 — Charge Logic (Core)

- [ ] Check `idempotencyKey` — if exists return existing transaction immediately
- [ ] Open `dataSource.transaction(async manager => { ... })`
- [ ] Lock wallet with `pessimistic_write`
- [ ] Validate wallet status is `active` — if not, save as `declined` (reason: `wallet_inactive`)
- [ ] Validate merchant status is `active` — if not, save as `declined` (reason: `merchant_inactive`)
- [ ] Validate `balance >= amount` — if not, save as `declined` (reason: `insufficient_funds`) + return structured error
- [ ] Deduct balance, save wallet
- [ ] Save transaction as `completed`
- [ ] Save `LedgerEntry` of type `charge`
- [ ] All three saves inside same DB transaction
- [ ] Wire up `POST /api/transactions/charge`
- [ ] Test: concurrent requests — only one should succeed when balance is insufficient

---

## Phase 10 — Refund Logic

- [ ] Find original transaction — throw if not found or not `charge` + `completed`
- [ ] Check `idempotencyKey` — return existing if duplicate
- [ ] Open `dataSource.transaction()`
- [ ] Lock wallet with `pessimistic_write`
- [ ] Credit wallet balance
- [ ] Save refund transaction as `completed`
- [ ] Save `LedgerEntry` of type `refund`
- [ ] Wire up `POST /api/transactions/refund`
- [ ] Test: refund credits balance correctly

---

## Phase 11 — Transaction Queries

- [ ] `findById(id)` — return transaction or `NotFoundException`
- [ ] `findAll()` — return list with optional filters (`walletId`, `merchantId`, `type`, `status`)
- [ ] Wire up: `GET /api/transactions/:id`, `GET /api/transactions`
- [ ] Test filters work correctly

---

## Phase 12 — Ledger Module

- [ ] `nest g module ledger`
- [ ] `nest g controller ledger`
- [ ] `nest g service ledger`
- [ ] Inject `TypeOrmModule.forFeature([LedgerEntry])`
- [ ] `findByWallet(walletId)` — all ledger entries for a wallet, ordered by `createdAt DESC`
- [ ] `findByTransaction(transactionId)` — all ledger entries for a transaction
- [ ] Wire up: `GET /api/wallets/:id/ledger-entries`, `GET /api/transactions/:id/ledger-entries`
- [ ] Test: charge creates 1 entry, refund creates 1 entry, declined creates 0 entries

---

## Bonus (if time allows)

- [ ] Docker Compose — `docker-compose.yml` with Postgres + app
- [ ] `README.md` — setup instructions + tradeoffs/assumptions
- [ ] Swagger — `@nestjs/swagger`, decorate all DTOs + controllers
- [ ] Structured logging — log every request + response time
- [ ] Healthcheck endpoint — `GET /health`
- [ ] Unit tests — TransactionsService charge + refund logic
- [ ] Integration tests — full charge → refund flow
