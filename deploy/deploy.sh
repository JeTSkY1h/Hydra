#!/bin/bash
# deploy.sh — Hydra auf VPS deployen
# Aufruf: ./deploy/deploy.sh user@dein-vps.de
set -e

VPS="${1:?Bitte VPS-Adresse angeben: ./deploy.sh user@vps}"
REMOTE_DIR="/opt/hydra"
STATIC_DIR="/var/www/hydra"

echo "▶ Frontend bauen..."
pnpm --filter @hydra/frontend build

echo "▶ Frontend hochladen nach $VPS:$STATIC_DIR ..."
ssh "$VPS" "mkdir -p $STATIC_DIR"
rsync -avz --delete packages/frontend/dist/ "$VPS:$STATIC_DIR/"

echo "▶ Code auf VPS aktualisieren..."
ssh "$VPS" "
  mkdir -p $REMOTE_DIR &&
  cd $REMOTE_DIR &&
  git pull
"

echo "▶ Backend-Container neu bauen und starten..."
ssh "$VPS" "
  cd $REMOTE_DIR &&
  docker compose -f docker-compose.prod.yml up -d --build
"

echo "✓ Deploy abgeschlossen."
