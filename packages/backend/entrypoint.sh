#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter @hydra/backend exec prisma migrate deploy

echo "Starting server..."
exec node packages/backend/dist/index.js
