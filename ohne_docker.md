# 🚀 Familienserver ohne Docker – manuelle Installation

Normalerweise reicht `./start.sh` (siehe [README](README.md#-schnellstart)). Diese Anleitung zeigt die einzelnen Schritte, die das Skript ausführt, für eigene Setups oder bei Problemen.

## 1. Python-Umgebung

```bash
cd Famielenserver
python3 -m venv venv
venv/bin/pip install -e .        # Abhängigkeiten aus pyproject.toml
```

## 2. Passwort festlegen

```bash
cp .env.example .env
nano .env        # FAMILIENSERVER_PASSWORD=… eintragen
chmod 600 .env
```

## 3. Frontend bauen

```bash
cd familienserver
npm ci
npm run build    # erzeugt familienserver/out
cd ..
```

## 4. Starten

```bash
mkdir -p logs
venv/bin/gunicorn --workers 1 --threads 8 --bind 0.0.0.0:5000 \
  --error-logfile logs/gunicorn.log "backend:create_app()"
```

Der Server ist dann unter `http://<IP>:5000` erreichbar. Protokolle stehen in `logs/`. Ein Worker mit mehreren Threads ist für einen Familienserver ideal: Große Uploads und Downloads blockieren sich nicht gegenseitig, und der Speicherbedarf bleibt gering.

Zum schnellen Ausprobieren geht auch der eingebaute Flask-Server:

```bash
venv/bin/python server.py              # http://localhost:5000
venv/bin/python server.py --port 8080
```

## Entwicklung

```bash
venv/bin/python server.py --debug      # Backend mit Auto-Reload, nur unter 127.0.0.1
cd familienserver && npm run dev       # Frontend mit Hot-Reload: http://localhost:3000
```

`--debug` bindet den Server absichtlich nur an `127.0.0.1`, weil der Werkzeug-Debugger das Ausführen von Code erlaubt.

## Häufige Probleme

| Problem | Lösung |
|---|---|
| `ModuleNotFoundError: No module named 'flask'` | Mit `venv/bin/python` bzw. `venv/bin/gunicorn` starten oder `source venv/bin/activate` |
| `externally-managed-environment` bei `pip install` | Nicht systemweit installieren, sondern das venv verwenden (Schritt 1) |
| `Kein Passwort gesetzt` | `.env` anlegen (Schritt 2) |
| Seite zeigt „Das Frontend ist noch nicht gebaut“ | Schritt 3 ausführen |
| `Address already in use` | Port belegt: `sudo ss -ltnp 'sport = :5000'` zeigt das Programm |
