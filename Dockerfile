# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile

COPY packages/shared  ./packages/shared
COPY packages/backend ./packages/backend

RUN pnpm --filter @hydra/backend exec prisma generate
RUN pnpm --filter @hydra/backend build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile --prod

# Gebaute Artefakte aus Stage 1
COPY --from=builder /app/packages/shared/src   ./packages/shared/src
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Prisma Schema + Config (für migrate deploy)
COPY packages/backend/prisma           ./packages/backend/prisma
COPY packages/backend/prisma.config.ts ./packages/backend/

# Entrypoint
COPY packages/backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]