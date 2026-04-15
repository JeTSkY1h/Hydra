#!/bin/bash
# deploy.sh — Hydra auf VPS deployen
# Aufruf: ./deploy/deploy.sh user@dein-vps.de
set -e

VPS="${1:?Bitte VPS-Adresse angeben: ./deploy.sh user@vps}"
REMOTE_DIR="/opt/hydra"
STATIC_DIR="/var/www/hydra"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Frontend bauen..."
pnpm --filter @hydra/frontend build

echo "▶ Frontend hochladen nach $VPS:$STATIC_DIR ..."
ssh "$VPS" "mkdir -p $STATIC_DIR"
rsync -avz --delete "$ROOT/packages/frontend/dist/" "$VPS:$STATIC_DIR/"


echo "✓ Deploy abgeschlossen."
