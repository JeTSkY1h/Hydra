# Hydra

A self-hosted, zero-knowledge bookkeeping web app for small teams. All data is encrypted in the browser before it reaches the server — the server only stores ciphertext and cannot read any of it.

## Features

- **Inventory** — track products and stock levels
- **Budget** — record income and expenses, monthly cash overview
- **Assets** — track asset values
- **Credits** — manage outstanding loans and repayments
- **Multi-user** — invite-based registration, admin/member roles
- **Zero-knowledge encryption** — all data encrypted client-side with libsodium (XSalsa20-Poly1305 + Argon2id)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Hono (Node.js) |
| Database | PostgreSQL (via Prisma) |
| Crypto | libsodium-wrappers-sumo |
| UI | Chakra UI |
| Auth | JWT + Argon2id |

## How Encryption Works

Hydra uses a 3-layer encryption model:

1. **Data layer** — all app data (transactions, products, etc.) is encrypted with a shared Vault Key using `XSalsa20-Poly1305`
2. **Vault Key layer** — the Vault Key is encrypted with each user's public key (`crypto_box_seal`) so the server never sees it in plaintext
3. **Key derivation** — each user's keypair is derived from their password + a KDF salt using Argon2id, and never stored

The server stores only encrypted blobs. Even with full database access, no plaintext data is readable.

For the full cryptographic details see [ENCRYPTION.md](ENCRYPTION.md).

## Setup

**Requirements:** Docker, Node.js (LTS), pnpm

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Run database migrations (use Node LTS for prisma)
cd packages/backend
nvm use --lts
pnpm prisma migrate deploy

# Start dev servers
cd ../..
pnpm dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

On first visit, navigate to `/register` to create the initial admin account.

## User Management

- The first registered user automatically becomes **Admin**
- Admins can invite new users via a one-time link (Settings page)
- Invited users receive access to all encrypted data through the invite token
- Only admins can create, edit, or delete data — members have read-only access
