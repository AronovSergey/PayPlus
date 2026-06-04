# PayPlus — Digital Wallet API

Backend API for a digital wallet system. Supports wallets, merchants, atomic charge/refund transactions, and an immutable ledger.

## Stack

- **NestJS** · **TypeORM** · **PostgreSQL**
- **class-validator** for DTO validation
- **Jest** for unit and e2e tests

---

## Setup

### 1. Prerequisites

- Node.js 18+
- Docker (for Postgres)

### 2. Install dependencies

```bash
cd api
npm install
```

### 3. Environment

Copy `.env.example` to `.env` in the root and adjust if needed:

```bash
cp .env.example .env
```

### 4. Start Postgres

```bash
docker-compose up -d
```

### 5. Run the API

```bash
cd api
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

---

## Testing

```bash
# Unit tests
npm test

# Single test file
npm test -- --testPathPatterns=transactions.service

# E2E tests (requires running Postgres)
npm run test:e2e
```

---

## API Reference

### Merchants

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/merchants | Create a merchant |
| GET | /api/merchants/:id | Get merchant by ID |
| GET | /api/merchants?page=1&limit=20 | List merchants |
| PATCH | /api/merchants/:id/status | Activate / deactivate |

### Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/wallets | Create a wallet |
| GET | /api/wallets/:id | Get wallet by ID (includes balance) |
| GET | /api/wallets?page=1&limit=20 | List wallets |
| PATCH | /api/wallets/:id/status | Activate / deactivate |
| POST | /api/wallets/:id/deposit | Deposit funds (test only) |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/transactions/charge | Charge a wallet |
| POST | /api/transactions/refund | Refund a charge |
| GET | /api/transactions/:id | Get transaction by ID |
| GET | /api/transactions | List transactions (filterable) |

**Charge filters:** `walletId`, `merchantId`, `type` (`charge`/`refund`), `status` (`completed`/`declined`)

### Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallets/:id/ledger-entries | Ledger entries for a wallet |
| GET | /api/transactions/:id/ledger-entries | Ledger entries for a transaction |

---

## Key Design Decisions

**Optimistic locking** — Wallet uses `@VersionColumn()` instead of `SELECT FOR UPDATE`. Concurrent writes to the same wallet that conflict return a 409 `concurrent_modification` error.

**Idempotency** — Every charge and refund requires an `idempotencyKey`. Duplicate keys return the original transaction without reprocessing.

**Declined transactions** — A charge can be declined (wallet inactive, merchant inactive, insufficient funds). Declined transactions are persisted but produce no ledger entry and do not affect the balance.

**Immutable ledger** — Ledger entries are append-only. The sum of all ledger entries for a wallet always equals its current balance.

**Money** — Stored as `decimal(18,2)`. Never floats.

---

## Error Format

All errors follow this structure:

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
