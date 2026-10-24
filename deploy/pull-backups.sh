#!/bin/bash
# pull-backups.sh — DB-Backups vom VPS auf diesen Rechner ziehen
# Aufruf: ./deploy/pull-backups.sh user@dein-vps.de [lokales-zielverzeichnis]
set -e

VPS="${1:?Bitte VPS-Adresse angeben: ./pull-backups.sh user@vps}"
REMOTE_DIR="/opt/hydra/backups"
LOCAL_DIR="${2:-$HOME/hydra-backups}"

mkdir -p "$LOCAL_DIR"

echo "▶ Ziehe Backups von $VPS:$REMOTE_DIR nach $LOCAL_DIR ..."
rsync -avz "$VPS:$REMOTE_DIR/" "$LOCAL_DIR/"

echo "✓ Backups liegen jetzt in $LOCAL_DIR"
