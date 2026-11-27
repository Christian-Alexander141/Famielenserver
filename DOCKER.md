# 🐳 Familienserver mit Docker

Ein einzelner Container enthält Frontend und Backend. Gut geeignet für einen Heimserver, ein NAS oder einen Raspberry Pi 4/5. Auf dem Pi 3B ist die Installation ohne Docker sparsamer, siehe [RASPBERRY_PI.md](RASPBERRY_PI.md).

## Starten

```bash
cp .env.example .env
nano .env                       # FAMILIENSERVER_PASSWORD=… eintragen
mkdir -p data logs              # vorher anlegen, sonst gehören die Ordner root
docker compose up -d --build
```

Danach ist der Server unter `http://<IP-des-Servers>:5000` erreichbar.

## Wichtige Befehle

```bash
docker compose ps               # Status (inkl. Healthcheck)
docker compose logs -f          # Protokoll (zusätzlich als Datei in ./logs)
docker compose restart          # nach Änderungen an .env
docker compose down             # stoppen (Daten in ./data bleiben erhalten)
git pull && docker compose up -d --build    # Update
```

## Daten

Alle Dateien liegen im Ordner `./data` neben der `docker-compose.yml`, eingebunden als `/data` im Container. Das ist der einzige Ordner, der gesichert werden muss (siehe `backup.sh` im [README](README.md#-daten-und-datensicherung)).

Ein anderer Speicherort, z. B. eine USB-Platte: In `docker-compose.yml` unter `volumes` den Eintrag `./data:/data` ändern, etwa zu `/mnt/familie/familienserver:/data`.

**Dateirechte:** Der Container läuft als Benutzer mit UID 1000 (der erste Benutzer auf den meisten Linux-Systemen). Gehört der Datenordner jemand anderem, gibt es beim Hochladen den Fehler *Permission denied*. Abhilfe:

```bash
sudo chown -R 1000:1000 data logs
```

## Einstellungen

Alle Variablen aus der [Tabelle im README](README.md#-einstellungen) können in `.env` gesetzt werden. `docker compose` reicht sie an den Container weiter. Der Port wird in `docker-compose.yml` geändert, z. B. `"8080:5000"`.

## Hinter einem Reverse Proxy mit HTTPS

Für eine eigene Domain mit HTTPS, z. B. mit Caddy oder nginx, in `.env` setzen:

```ini
FAMILIENSERVER_SECURE_COOKIES=1
FAMILIENSERVER_TRUST_PROXY=1
```

Beispiel nginx:

```nginx
server {
    listen 443 ssl;
    server_name familie.example.de;
    # ssl_certificate …

    client_max_body_size 4g;          # passend zu FAMILIENSERVER_MAX_UPLOAD_MB
    proxy_request_buffering off;      # große Uploads direkt durchreichen
    proxy_read_timeout 1h;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Umstieg von Version 1

Früher gab es zwei Container (`familienserver-backend` auf 5000, `familienserver-frontend` auf 3000). Jetzt gibt es nur noch einen auf Port **5000**.

```bash
docker compose down --remove-orphans
mkdir -p data && mv familienserver/public/uploads/* data/    # alte Uploads übernehmen
docker compose up -d --build
```
