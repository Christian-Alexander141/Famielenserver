#!/usr/bin/env bash
# Familienserver – Startskript
#
#   ./start.sh            Menü anzeigen
#   ./start.sh start      Server starten (Dauerbetrieb, z. B. auf dem Raspberry Pi)
#   ./start.sh dev        Entwicklungsmodus mit automatischem Neuladen
#   ./start.sh build      Nur das Frontend neu bauen
#   ./start.sh password   Passwort ändern
#   ./start.sh service    Als Systemdienst einrichten (startet automatisch beim Booten)

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT="$(pwd)"
VENV="$ROOT/venv"
PORT="${PORT:-5000}"

info() { echo "👉 $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# Wert aus Umgebung oder .env lesen (wie das Backend)
env_value() {
  local key="$1" value="${!1:-}"
  if [ -z "$value" ] && [ -f .env ]; then
    value="$(grep -E "^$key=" .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//")"
  fi
  echo "$value"
}

LOG_DIR="$(env_value FAMILIENSERVER_LOG_DIR)"
LOG_DIR="${LOG_DIR:-$ROOT/logs}"

# ------------------------------------------------------------ Voraussetzungen

check_python() {
  command -v python3 >/dev/null || fail "Python 3 fehlt. Installieren mit: sudo apt install python3 python3-venv"
  python3 -c 'import sys; sys.exit(sys.version_info < (3, 9))' || fail "Python 3.9 oder neuer wird benötigt."
}

check_node() {
  command -v npm >/dev/null || fail "Node.js/npm fehlt (wird nur zum Bauen des Frontends gebraucht). Siehe RASPBERRY_PI.md."
}

setup_venv() {
  check_python
  if [ ! -x "$VENV/bin/python" ]; then
    info "Lege Python-Umgebung in ./venv an …"
    python3 -m venv "$VENV" || fail "venv konnte nicht angelegt werden. Installieren mit: sudo apt install python3-venv"
  fi
  local stamp="$VENV/.pyproject.sha"
  local current
  current="$(sha256sum pyproject.toml | cut -d' ' -f1)"
  if [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$current" ]; then
    info "Installiere Python-Pakete aus pyproject.toml …"
    "$VENV/bin/pip" install --quiet --upgrade pip
    "$VENV/bin/pip" install --quiet -e .
    echo "$current" > "$stamp"
  fi
}

# ------------------------------------------------------------------ Passwort

has_password() {
  [ -f .env ] && grep -Eq '^FAMILIENSERVER_PASSWORD=.+' .env
}

ask_password() {
  local pw1 pw2
  while true; do
    read -rsp "Neues Familien-Passwort (mind. 8 Zeichen): " pw1; echo
    read -rsp "Passwort wiederholen: " pw2; echo
    if [ "${#pw1}" -lt 8 ]; then echo "Zu kurz – bitte mindestens 8 Zeichen."; continue; fi
    if [ "$pw1" != "$pw2" ]; then echo "Die Eingaben stimmen nicht überein."; continue; fi
    if [[ "$pw1" == *$'\n'* || "$pw1" == *"'"* ]]; then echo "Bitte keine Zeilenumbrüche oder Apostrophe verwenden."; continue; fi
    break
  done
  umask 077
  touch .env
  # alte Zeile entfernen, neue anhängen (in Apostrophen, damit Sonderzeichen erhalten bleiben)
  local tmp
  tmp="$(mktemp)"
  grep -v '^FAMILIENSERVER_PASSWORD=' .env > "$tmp" || true
  printf "FAMILIENSERVER_PASSWORD='%s'\n" "$pw1" >> "$tmp"
  mv "$tmp" .env
  chmod 600 .env
  info "Passwort gespeichert in .env (nur für dich lesbar). Bestehende Anmeldungen sind jetzt ungültig."
}

ensure_password() {
  if ! has_password; then
    echo "🔒 Für den Familienserver wird ein gemeinsames Passwort benötigt."
    ask_password
  fi
}

# ------------------------------------------------------------------- Frontend

frontend_outdated() {
  local index="familienserver/out/index.html"
  [ ! -f "$index" ] && return 0
  [ -n "$(find familienserver/app familienserver/package.json familienserver/next.config.ts -newer "$index" -print -quit)" ]
}

build_frontend() {
  check_node
  info "Baue das Frontend (das kann auf dem Raspberry Pi einige Minuten dauern) …"
  (cd familienserver && npm ci --no-audit --no-fund && npm run build)
}

ensure_frontend() {
  frontend_outdated || return 0
  if ! command -v npm >/dev/null && [ -f familienserver/out/index.html ]; then
    # z. B. Raspberry Pi ohne Node.js, Frontend wurde am PC gebaut und kopiert
    info "npm nicht gefunden – verwende das vorhandene Frontend in familienserver/out."
    return 0
  fi
  build_frontend
}

# ------------------------------------------------------------------- Aktionen

lan_address() {
  hostname -I 2>/dev/null | awk '{print $1}'
}

start_server() {
  setup_venv
  ensure_password
  ensure_frontend
  local ip
  ip="$(lan_address)"
  echo
  echo "✅ Familienserver läuft:"
  echo "   Auf diesem Gerät:  http://localhost:$PORT"
  [ -n "$ip" ] && echo "   Im Heimnetz:       http://$ip:$PORT"
  echo "   Protokolle:        $LOG_DIR/"
  echo "   Beenden mit STRG+C"
  echo
  mkdir -p "$LOG_DIR"
  exec "$VENV/bin/gunicorn" --workers 1 --threads 8 --bind "0.0.0.0:$PORT" \
    --error-logfile "$LOG_DIR/gunicorn.log" "backend:create_app()"
}

start_dev() {
  setup_venv
  ensure_password
  check_node
  [ -d familienserver/node_modules ] || (cd familienserver && npm ci --no-audit --no-fund)

  mkdir -p "$LOG_DIR"
  "$VENV/bin/python" server.py --debug --port "$PORT" &
  local backend_pid=$!
  # Beim Beenden (STRG+C) auch das Backend stoppen
  trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM

  echo
  echo "🧪 Entwicklungsmodus: http://localhost:3000  (Backend auf 127.0.0.1:$PORT)"
  echo "   Änderungen am Code werden automatisch neu geladen. Beenden mit STRG+C."
  echo "   Protokolle: $LOG_DIR/ (familienserver.log, frontend-dev.log)"
  echo
  (cd familienserver && FAMILIENSERVER_BACKEND_URL="http://127.0.0.1:$PORT" npm run dev 2>&1 | tee -a "$LOG_DIR/frontend-dev.log")
}

install_service() {
  setup_venv
  ensure_password
  ensure_frontend
  command -v systemctl >/dev/null || fail "systemd wurde nicht gefunden."
  local unit=/etc/systemd/system/familienserver.service
  info "Richte den Dienst $unit ein (dafür wird sudo benötigt) …"
  sudo tee "$unit" >/dev/null <<EOF
[Unit]
Description=Familienserver
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
User=$(id -un)
WorkingDirectory=$ROOT
ExecStartPre=/bin/mkdir -p $LOG_DIR
ExecStart=$VENV/bin/gunicorn --workers 1 --threads 8 --bind 0.0.0.0:$PORT --error-logfile $LOG_DIR/gunicorn.log "backend:create_app()"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now familienserver
  info "Fertig. Status: sudo systemctl status familienserver · Protokolle: $LOG_DIR/"
}

menu() {
  echo "🗂️  Familienserver"
  echo "=================="
  echo "1) Starten (empfohlen)"
  echo "2) Entwicklungsmodus (automatisches Neuladen)"
  echo "3) Frontend neu bauen"
  echo "4) Passwort ändern"
  echo "5) Als Systemdienst einrichten (Autostart)"
  echo "6) Beenden"
  echo
  read -rp "Option (1-6): " choice
  case "$choice" in
    1) start_server ;;
    2) start_dev ;;
    3) build_frontend ;;
    4) ask_password ;;
    5) install_service ;;
    *) echo "👋 Auf Wiedersehen!" ;;
  esac
}

case "${1:-}" in
  start) start_server ;;
  dev) start_dev ;;
  build) build_frontend ;;
  password) ask_password ;;
  service) install_service ;;
  "") menu ;;
  *) fail "Unbekannte Option: $1 (erlaubt: start, dev, build, password, service)" ;;
esac
