# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Backend API for a digital wallet system. Supports wallets, merchants, atomic charge/refund transactions, and an immutable ledger.

The implementation checklist (phases 1–12 + bonus) lives in `tasks.md`.

---

## Stack
- **Runtime:** NestJS · TypeORM · PostgreSQL
- **Validation:** class-validator · class-transformer

---

## Commands

### Backend
```bash
npm run start:dev                                    # dev with hot reload
npm run test                                         # all unit tests
npm run test -- --testPathPattern=merchants          # single module tests
npm run test:e2e                                     # end-to-end tests
npm run build
```

### Database
```bash
psql -U postgres -c "CREATE DATABASE wallet_db;"    # run once
```

---

## Architecture (NestJS)

### Module Structure
```
src/
├── merchants/      → CRUD + activate/deactivate; owns Merchant repo
├── wallets/        → create, get, list, activate/deactivate; owns Wallet repo
├── transactions/   → charge, refund, get, list; owns Transaction + Wallet repos + DataSource
├── ledger/         → list entries by wallet or transaction; owns LedgerEntry repo
├── common/
│   ├── filters/    → GlobalExceptionFilter (structured error format)
├── entities/
│   ├── wallet.entity.ts
│   ├── merchant.entity.ts
│   ├── transaction.entity.ts
│   └── ledger-entry.entity.ts
└── app.module.ts
```

### Entity Shapes (TypeScript interfaces)

```ts
interface IWallet {
  id: string;                  // uuid
  externalId: string;          // employee/company identity
  currency: string;            // e.g. 'ILS'
  balance: string;             // decimal(18,2) — TypeORM returns as string
  status: WalletStatus;        // active | inactive
  version: number;             // @VersionColumn — incremented on every save; drives optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

interface IMerchant {
  id: string;                  // uuid
  name: string;
  status: MerchantStatus;      // active | inactive
  createdAt: Date;
  updatedAt: Date;
}

interface ITransaction {
  id: string;                  // uuid
  walletId: string;            // FK → wallets
  merchantId: string;          // FK → merchants
  type: TransactionType;       // charge | refund
  amount: string;              // decimal(18,2)
  currency: string;
  status: TransactionStatus;   // completed | declined
  declineReason: string | null;
  originalTransactionId: string | null;  // for refunds
  idempotencyKey: string;      // unique per request
  createdAt: Date;
  updatedAt: Date;
}

interface ILedgerEntry {
  id: string;                  // uuid
  walletId: string;            // FK → wallets
  transactionId: string;       // FK → transactions
  type: LedgerEntryType;       // charge | refund
  amount: string;              // decimal(18,2)
  currency: string;
  createdAt: Date;
}
```

### Enums
```ts
enum WalletStatus       { ACTIVE = 'active', INACTIVE = 'inactive' }
enum MerchantStatus     { ACTIVE = 'active', INACTIVE = 'inactive' }
enum TransactionType    { CHARGE = 'charge', REFUND = 'refund' }
enum TransactionStatus  { COMPLETED = 'completed', DECLINED = 'declined' }
enum LedgerEntryType    { CHARGE = 'charge', REFUND = 'refund' }
```

---

## Code Style

Always use curly braces for `if` statements and loops, even for single-line bodies:
```ts
// correct
if (!wallet) {
  throw new NotFoundException('Wallet not found');
}

// wrong
if (!wallet) throw new NotFoundException('Wallet not found');
```

---

## Key Patterns

**Business logic in services only** — controllers validate input via DTO, call service, return result.

**`synchronize: true`** — dev only; never enable in production.

**Optimistic locking** — `Wallet` has a `@VersionColumn() version: number`. TypeORM appends `WHERE id = ? AND version = ?` on every `save()`. If a concurrent transaction already incremented the version, TypeORM throws `OptimisticLockVersionMismatchError` — catch it and return a 409. No `pessimistic_write` / `SELECT FOR UPDATE` anywhere.

**Atomic charge flow** — inside `DataSource.transaction()`:
1. Fetch wallet (no lock)
2. Validate wallet is `active`
3. Validate merchant is `active`
4. Validate `balance >= amount` — if not, save transaction as `declined` and return (no ledger entry)
5. Deduct balance, `save(wallet)` — TypeORM version check fires here; catch `OptimisticLockVersionMismatchError` → 409
6. Save transaction as `completed`
7. Save ledger entry — all atomically

**Refund flow:**
1. Check `idempotencyKey` — return existing if duplicate (before opening any transaction)
2. Find original transaction — must be `charge` + `completed`
3. Open `DataSource.transaction()`, fetch wallet (no lock)
4. Credit wallet balance, `save(wallet)` — version check fires here; catch `OptimisticLockVersionMismatchError` → 409
5. Save refund transaction as `completed`
6. Save ledger entry of type `refund`

**Idempotency** — `idempotencyKey` is unique on the `transactions` table. If a duplicate key arrives, return the existing transaction without re-processing.

**Ledger is append-only** — never update or delete ledger entries. Declined transactions do NOT create ledger entries.

**Money arithmetic:** always cast `Number(wallet.balance)` before arithmetic — TypeORM returns `decimal` as string.

**DTOs:** every endpoint has a DTO with class-validator decorators. `ValidationPipe` is global in `main.ts`.

**Error handling:** use the global exception filter to return structured errors. Throw NestJS built-in exceptions — never raw `Error`.

**Config:** never access `process.env` directly — always use `ConfigService`.

---

## Required Error Format

All error responses must follow this structure:
```json
{
  "error": {
    "code": "insufficient_funds",
    "message": "Wallet does not have enough available balance",
    "status": 409,
    "details": {
      "wallet_id": "uuid",
      "available_balance": "50.00",
      "requested_amount": "120.50"
    }
  }
}
```

Implement as a global `ExceptionFilter` in `src/common/filters/`.

---

## API Reference

### Merchants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/merchants | Create a merchant |
| GET | /api/merchants/:id | Get merchant by id |
| GET | /api/merchants | List merchants (pagination optional) |
| PATCH | /api/merchants/:id/status | Activate / inactivate a merchant |

### Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/wallets | Create a wallet |
| GET | /api/wallets/:id | Get wallet by id (includes balance) |
| GET | /api/wallets | List wallets (pagination optional) |
| PATCH | /api/wallets/:id/status | Activate / inactivate a wallet |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/transactions/charge | Create an immediate charge |
| POST | /api/transactions/refund | Create a refund |
| GET | /api/transactions/:id | Get transaction by id |
| GET | /api/transactions | List transactions (filters optional) |

### Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallets/:id/ledger-entries | List ledger entries for a wallet |
| GET | /api/transactions/:id/ledger-entries | List ledger entries for a transaction |

---

## Business Rules
1. Inactive wallets cannot perform successful transactions — decline with reason
2. Inactive merchants cannot create successful transactions — decline with reason
3. Balance cannot go negative — decline with `insufficient_funds`
4. Declined transactions do NOT produce ledger entries
5. Ledger entries are append-only — never mutated
6. Refund must reference a completed charge transaction
7. Idempotency key must be unique — duplicate returns existing transaction
8. Money stored as `decimal(18,2)` — never `float`

---

## Environment Variables

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=wallet_db
PORT=3001
```

