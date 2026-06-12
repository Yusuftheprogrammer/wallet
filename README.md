# Wallet API

A REST API for managing digital wallets, built with NestJS. Users can register, create wallets, deposit and withdraw funds, and transfer money between wallets. Every money movement is recorded in a transaction ledger with idempotent transfers.

All routes are prefixed with `/api`.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Business Rules](#business-rules)
- [Database](#database)
- [Docker](#docker)
- [Deployment](#deployment)
- [Testing](#testing)

---

## Features

- **User registration & login** — JWT access tokens with opaque refresh tokens
- **Role-based access** — `user` and `admin` roles with route-level guards
- **Wallet management** — create, read, update, and delete wallets
- **Money operations** — deposit, withdraw, and peer-to-peer transfers
- **Transaction ledger** — full history of transfers, deposits, and withdrawals
- **Idempotent transfers** — duplicate transfer requests with the same key return the original result
- **Atomic transactions** — pessimistic locking and DB transactions for balance updates
- **Production-ready** — Helmet security headers, CORS, input validation, Docker support

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | NestJS 11                           |
| Language     | TypeScript                          |
| Database     | PostgreSQL (Neon, local, or hosted) |
| ORM          | TypeORM                             |
| Auth         | Passport JWT + bcrypt               |
| Validation   | class-validator / class-transformer |
| Package mgr  | pnpm                                |
| Runtime      | Node.js 22                          |

---

## Project Structure

```
src/
├── auth/           # Signup, login, refresh, logout, profile
├── users/          # User CRUD (admin + self-service)
├── wallets/        # Wallets, deposits, withdrawals, transfers
├── config/         # Env validation and database config
├── common/         # Shared utilities (token hashing, duration parsing)
└── general/        # Guards and role decorators
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 14+ (or a hosted provider like [Neon](https://neon.tech))

### Installation

```bash
git clone <repository-url>
cd wallet
pnpm install
```

### Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for details.

### Run locally

```bash
# development (watch mode)
pnpm run start:dev

# production build
pnpm run build
pnpm run start:prod
```

The server starts at `http://localhost:3000`. Health check: `GET /api`.

In development (`NODE_ENV=development`), TypeORM automatically creates database tables on startup.

---

## Environment Variables

| Variable                 | Required | Default                  | Description                                      |
| ------------------------ | -------- | ------------------------ | ------------------------------------------------ |
| `NODE_ENV`               | No       | `development`            | `development`, `production`, or `test`           |
| `PORT`                   | No       | `3000`                   | HTTP port (set automatically on most hosts)      |
| `DATABASE_URL`           | Yes*     | —                        | Full Postgres connection string (Neon, etc.)     |
| `DB_HOST`                | Yes*     | —                        | Postgres host (alternative to `DATABASE_URL`)    |
| `DB_PORT`                | No       | `5432`                   | Postgres port                                    |
| `DB_USERNAME`            | Yes*     | —                        | Postgres username                                |
| `DB_PASSWORD`            | Yes*     | —                        | Postgres password                                |
| `DB_NAME`                | Yes*     | —                        | Postgres database name                           |
| `JWT_SECRET`             | Yes      | —                        | Secret key, minimum 32 characters                |
| `JWT_ACCESS_EXPIRES_IN`  | No       | `15m`                    | Access token lifetime                            |
| `JWT_REFRESH_EXPIRES_IN` | No     | `7d`                     | Refresh token lifetime                           |
| `CORS_ORIGIN`            | No       | `*`                      | Allowed frontend origin                          |

\* Provide either `DATABASE_URL` **or** the individual `DB_*` variables.

### Example `.env`

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require

JWT_SECRET=change-me-to-a-secret-at-least-32-characters-long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
```

---

## Authentication

The API uses a two-token model:

| Token            | Type    | Lifetime | Usage                                      |
| ---------------- | ------- | -------- | ------------------------------------------ |
| `access_token`   | JWT     | 15 min   | Sent as `Authorization: Bearer <token>`  |
| `refresh_token`  | Opaque  | 7 days   | Used to obtain a new access token          |

### Flow

1. **Signup or login** → receive both tokens
2. **Call protected routes** → include `Authorization: Bearer <access_token>`
3. **Access token expires** → `POST /api/auth/refresh` with the refresh token
4. **Logout** → `POST /api/auth/logout` to revoke the refresh token

Refresh tokens are hashed before storage. On refresh, the old token is revoked and a new pair is issued (rotation).

### Roles

| Role    | Access                                                     |
| ------- | ---------------------------------------------------------- |
| `user`  | Own wallets, transactions, and profile                     |
| `admin` | All users and wallets; can create wallets for any user     |

---

## API Reference

### Auth

#### `POST /api/auth/signup`

Create a new account and receive tokens immediately.

**Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `201`**

```json
{
  "message": "Account created successfully",
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "a1b2c3..."
}
```

---

#### `POST /api/auth/login`

**Body**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `200`**

```json
{
  "message": "Logged in successfully",
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "a1b2c3..."
}
```

---

#### `POST /api/auth/refresh`

**Body**

```json
{
  "refresh_token": "a1b2c3..."
}
```

**Response `200`**

```json
{
  "message": "Token refreshed successfully",
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "d4e5f6..."
}
```

---

#### `POST /api/auth/logout`

**Body**

```json
{
  "refresh_token": "a1b2c3..."
}
```

**Response `200`**

```json
{
  "message": "Logged out successfully",
  "success": true
}
```

---

#### `GET /api/auth/profile`

🔒 Requires authentication.

**Response `200`**

```json
{
  "id": 1,
  "publicId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2026-06-12T10:00:00.000Z"
}
```

---

### Users

| Method   | Endpoint                    | Auth        | Description                    |
| -------- | --------------------------- | ----------- | ------------------------------ |
| `GET`    | `/api/users`                | Admin       | List all users                 |
| `POST`   | `/api/users`                | Admin       | Create a user                  |
| `GET`    | `/api/users/:publicId`      | Self/Admin  | Get user by public ID          |
| `PATCH`  | `/api/users/:publicId`      | Self/Admin  | Update user                    |
| `DELETE` | `/api/users/:publicId`      | Admin       | Delete user                    |

#### `POST /api/users` (Admin)

**Body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```

---

#### `PATCH /api/users/:publicId`

**Body** (all fields optional)

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "password": "newpassword123"
}
```

---

### Wallets

| Method   | Endpoint                          | Auth        | Description                         |
| -------- | --------------------------------- | ----------- | ----------------------------------- |
| `GET`    | `/api/wallets`                    | User/Admin  | List wallets (own or all)           |
| `POST`   | `/api/wallets`                    | User        | Create a wallet                     |
| `POST`   | `/api/wallets/admin`              | Admin       | Create a wallet for a user          |
| `GET`    | `/api/wallets/:publicId`          | User/Admin  | Get wallet by public ID             |
| `PATCH`  | `/api/wallets/:publicId`          | User        | Update wallet name                  |
| `DELETE` | `/api/wallets/:publicId`          | User        | Delete wallet                       |
| `POST`   | `/api/wallets/deposit`            | User        | Deposit money into a wallet         |
| `POST`   | `/api/wallets/withdraw`           | User        | Withdraw money from a wallet        |
| `POST`   | `/api/wallets/exchange`           | User        | Transfer money between wallets      |
| `GET`    | `/api/wallets/transactions`       | User/Admin  | List transactions                   |
| `GET`    | `/api/wallets/transactions/:id`   | User/Admin  | Get transaction by public ID        |

#### `POST /api/wallets`

**Body**

```json
{
  "name": "Savings"
}
```

**Response `201`**

```json
{
  "message": "Wallet created successfully",
  "success": true,
  "wallet": {
    "publicId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Savings",
    "balance": 0,
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2026-06-12T10:00:00.000Z"
  }
}
```

---

#### `POST /api/wallets/deposit`

**Body**

```json
{
  "walletId": "550e8400-e29b-41d4-a716-446655440001",
  "amount": 100.50
}
```

**Response `201`**

```json
{
  "message": "Money was deposited successfully",
  "success": true,
  "balance": 100.5,
  "transactionId": "660e8400-e29b-41d4-a716-446655440002"
}
```

---

#### `POST /api/wallets/withdraw`

**Body**

```json
{
  "walletId": "550e8400-e29b-41d4-a716-446655440001",
  "amount": 50.00
}
```

**Response `201`**

```json
{
  "message": "Money was withdrawn successfully",
  "success": true,
  "balance": 50.5,
  "transactionId": "660e8400-e29b-41d4-a716-446655440003"
}
```

---

#### `POST /api/wallets/exchange`

Transfer money between two wallets. The sender wallet must belong to the authenticated user.

**Body**

```json
{
  "senderWalletId": "550e8400-e29b-41d4-a716-446655440001",
  "receiverWalletId": "550e8400-e29b-41d4-a716-446655440004",
  "amount": 25.00,
  "idempotencyKey": "unique-key-abc12345"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transactionId": "660e8400-e29b-41d4-a716-446655440005",
  "status": "completed",
  "amount": 25,
  "newSenderBalance": 25.5
}
```

Sending the same `idempotencyKey` again returns the original transaction without moving money twice.

---

### Error Responses

Validation and business errors follow a consistent shape:

```json
{
  "statusCode": 400,
  "message": "Insufficient funds",
  "error": "Bad Request"
}
```

Common status codes:

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 400  | Validation error or business rule violation  |
| 401  | Missing or invalid token                     |
| 403  | Authenticated but not authorized             |
| 404  | Resource not found                           |
| 409  | Conflict (e.g. email already exists)           |

---

## Business Rules

### Wallets

- Each user can have at most **3 wallets**
- Users can create only **1 wallet per 24 hours**
- Admins can create wallets for users (still subject to the 3-wallet limit)
- Users can only modify, delete, deposit into, or withdraw from their own wallets
- Transfers can only be initiated from the authenticated user's wallets

### Transfers

- Amount must be greater than zero
- Cannot transfer to the same wallet
- Sender must have sufficient balance
- Uses database transactions with pessimistic row locking
- `idempotencyKey` must be 8–128 characters and unique per transfer

### Transactions

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `transfer` | Money moved between two wallets          |
| `deposit`  | Money added to a wallet                  |
| `withdraw` | Money removed from a wallet              |

| Status      | Description                             |
| ----------- | --------------------------------------- |
| `pending`   | Transaction started                     |
| `completed` | Transaction finished successfully       |
| `failed`    | Transaction failed                      |
| `reversed`  | Transaction reversed                    |

Users see only transactions they initiated or that involve their wallets. Admins see all transactions.

---

## Database

### Schema

```
users
├── publicId (UUID, external identifier)
├── name, email, password, role
└── wallets (1:N)

wallets
├── publicId (UUID)
├── name, balance, userId
└── transactions (1:N via from/to)

transactions
├── publicId (UUID)
├── amount, type, status
├── idempotencyKey (unique, transfers only)
├── initiatedBy (user publicId)
├── fromWallet, toWallet
└── startingDate, endingDate

refresh_tokens
├── tokenHash (SHA-256 of refresh token)
├── userId, expiresAt, revokedAt
```

### Production schema setup

With `NODE_ENV=production`, TypeORM `synchronize` is **disabled** — tables are not auto-created. Before the first production deploy, ensure the schema exists (migrations, manual SQL, or a one-time sync in a staging environment).

---

## Docker

Build and run the API in a container:

```bash
docker build -t wallet-api .
docker run -p 3000:3000 --env-file .env wallet-api
```

The Dockerfile uses a multi-stage build:

1. **Builder** — installs dependencies, compiles TypeScript, prunes dev deps
2. **Production** — slim Alpine image, runs as non-root `node` user

---

## Deployment

The project is ready for container-based hosting (Back4App, Render, Railway, Fly.io, etc.).

### Required environment variables

```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<at least 32 characters>
CORS_ORIGIN=https://your-frontend.com
```

The host platform sets `PORT` automatically. The app binds to `0.0.0.0`.

### Back4App / Render checklist

1. Connect your Git repository
2. Select **Docker** as the runtime (uses the included `Dockerfile`)
3. Set the environment variables above
4. Set health check path to `/api`
5. Deploy

### First deploy note

If tables do not exist in production Postgres, the app will fail on startup. Create the schema first or run a one-time deploy with `NODE_ENV=development` against a staging database to let TypeORM sync the schema, then switch to production.

---

## Testing

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# coverage
pnpm run test:cov
```

### Quick manual test with curl

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Create wallet (replace TOKEN)
curl -X POST http://localhost:3000/api/wallets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Main Wallet"}'

# Deposit
curl -X POST http://localhost:3000/api/wallets/deposit \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletId":"WALLET_PUBLIC_ID","amount":100}'
```

---

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm run start`     | Start the app                  |
| `pnpm run start:dev` | Start with hot reload          |
| `pnpm run start:prod`| Run compiled production build  |
| `pnpm run build`     | Compile TypeScript             |
| `pnpm run lint`      | Run ESLint with auto-fix       |
| `pnpm run format`    | Format code with Prettier      |
| `pnpm run test`      | Run unit tests                 |

---

## License

UNLICENSED — private project.
