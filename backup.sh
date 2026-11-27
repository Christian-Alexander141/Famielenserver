#!/usr/bin/env bash
# Familienserver – Datensicherung
#
#   ./backup.sh /media/usb/familienserver-backup [Anzahl]
#
# Legt bei jedem Aufruf eine vollständige Kopie des Datenordners als datierten
# Ordner an (z. B. 2026-11-27_0300). Unveränderte Dateien werden per Hardlink
# geteilt – jede Sicherung sieht vollständig aus, belegt aber nur Platz für
# Änderungen. Die neuesten [Anzahl] Sicherungen bleiben erhalten (Standard: 14).
#
# Täglich um 3 Uhr automatisch (crontab -e):
#   0 3 * * * /pfad/zum/Famielenserver/backup.sh /media/usb/familienserver-backup
#
# Jeder Lauf wird zusätzlich in logs/backup.log protokolliert.
#
# Das Ziel sollte auf einem ANDEREN Datenträger liegen (USB-Platte, NAS),
# sonst schützt die Sicherung nicht vor einem Plattendefekt.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

TARGET="${1:?Aufruf: ./backup.sh <Zielordner> [Anzahl der Sicherungen, Standard 14]}"
KEEP="${2:-14}"
[[ "$KEEP" =~ ^[0-9]+$ ]] && [ "$KEEP" -ge 1 ] || { echo "❌ Anzahl muss eine Zahl ≥ 1 sein" >&2; exit 1; }
command -v rsync >/dev/null || { echo "❌ rsync fehlt: sudo apt install rsync" >&2; exit 1; }

# Ausgabe zusätzlich in den Log-Ordner schreiben
LOG_DIR="${FAMILIENSERVER_LOG_DIR:-}"
if [ -z "$LOG_DIR" ] && [ -f .env ]; then
  LOG_DIR="$(grep -E '^FAMILIENSERVER_LOG_DIR=' .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//")"
fi
LOG_DIR="${LOG_DIR:-$(pwd)/logs}"
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/backup.log") 2>&1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="

# Datenordner wie der Server bestimmen: Umgebung → .env → Standard
SOURCE="${FAMILIENSERVER_DATA_DIR:-}"
if [ -z "$SOURCE" ] && [ -f .env ]; then
  SOURCE="$(grep -E '^FAMILIENSERVER_DATA_DIR=' .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//")"
fi
SOURCE="${SOURCE:-$(pwd)/data}"
[ -d "$SOURCE" ] || { echo "❌ Datenordner nicht gefunden: $SOURCE" >&2; exit 1; }

mkdir -p "$TARGET"
STAMP="$(date +%Y-%m-%d_%H%M)"
DEST="$TARGET/$STAMP"
LATEST="$TARGET/latest"
if [ -e "$DEST" ]; then
  echo "ℹ️  Für $STAMP gibt es schon eine Sicherung – nichts zu tun."
  exit 0
fi

echo "📦 Sichere $SOURCE → $DEST"
LINK_ARGS=()
[ -d "$LATEST" ] && LINK_ARGS=(--link-dest="$(cd "$LATEST" && pwd -P)")

# Zwischenspeicher (abgebrochene Uploads, Vorschaubilder) muss nicht gesichert werden
rsync -a --delete "${LINK_ARGS[@]}" \
  --exclude '.familienserver/tmp/' \
  --exclude '.familienserver/thumbs/' \
  "$SOURCE/" "$DEST.partial/"
mv "$DEST.partial" "$DEST"
ln -sfn "$STAMP" "$LATEST"

# Alte Sicherungen entfernen – nur Ordner, die genau wie eine Sicherung heißen
mapfile -t BACKUPS < <(find "$TARGET" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended \
  -regex '.*/[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}' -printf '%f\n' | sort)
REMOVE=$(( ${#BACKUPS[@]} - KEEP ))
for (( i = 0; i < REMOVE; i++ )); do
  echo "🧹 Entferne alte Sicherung ${BACKUPS[$i]}"
  rm -rf -- "${TARGET:?}/${BACKUPS[$i]}"
done

echo "✅ Fertig: $DEST (${#BACKUPS[@]} Sicherungen vorhanden, behalte $KEEP)"
