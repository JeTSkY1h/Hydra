# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Workspace-Struktur für Layer-Caching zuerst kopieren
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile

# Quellcode kopieren
COPY packages/shared  ./packages/shared
COPY packages/backend ./packages/backend

# Prisma Client generieren und TypeScript kompilieren
RUN pnpm --filter @hydra/backend exec prisma generate
RUN pnpm --filter @hydra/backend build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
RUN corepack enable

# Nur das nötigste für den Runtime
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile --prod

# Prisma Schema + Config (für migrate deploy UND generate)
COPY packages/backend/prisma         ./packages/backend/prisma
COPY packages/backend/prisma.config.ts ./packages/backend/

# Prisma Client im Runtime-Stage generieren
RUN pnpm --filter @hydra/backend exec prisma generate

# Gebaute Artefakte aus Stage 1
COPY --from=builder /app/packages/shared/src   ./packages/shared/src
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Entrypoint
COPY packages/backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
