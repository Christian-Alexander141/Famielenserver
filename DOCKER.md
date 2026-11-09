# 🐳 Docker Anleitung für Familienserver

> **⚠️ WICHTIG:** Docker ist **nicht** für den Raspberry Pi 3B empfohlen, da dieser nicht genug Ressourcen hat. Diese Anleitung ist für Entwicklungsumgebungen auf leistungsfähigeren Maschinen geeignet.

---

## 📋 Voraussetzungen

- Docker (Version 20.10 oder neuer)
- Docker Compose (Version 2.0 oder neuer)
- Mindestens 2GB RAM (für Entwicklung)
- 4GB RAM empfohlen (für Produktionstests)

---

## 🚀 Installation und Start

### 1. Docker Image bauen

```bash
# Im Projektverzeichnis
docker-compose build
```

### 2. Container starten

```bash
# Im Hintergrund starten (daemon mode)
docker-compose up -d
```

### 3. Status prüfen

```bash
# Alle laufenden Container anzeigen
docker-compose ps

# Logs anzeigen (für Debugging)
docker-compose logs -f
```

---

## 🎯 Ports und Zugriff

| Dienst | Port | Beschreibung |
|--------|------|--------------|
| Frontend (Next.js) | 3000 | Webinterface |
| Backend (Flask) | 5000 | API-Server |

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000/api`

---

## 📁 Docker Konfiguration

### docker-compose.yml

```yaml
version: '3.8'

services:
  familienserver:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"  # Frontend
      - "5000:5000"  # Backend
    volumes:
      # Uploads-Pfad speichern, damit Dateien auch nach Container-Neustart erhalten bleiben
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
      # Node modules cachern für schnellere Builds
      - /app/familienserver/node_modules
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
    restart: unless-stopped
    # Für Entwicklung: Automatisch neustarten bei Dateiänderungen
    develop:
      watch:
        - path: ./familienserver
          action: sync
        - path: ./server.py
          action: sync

  # Optional: Separater Backend-Container für bessere Trennung
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    volumes:
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
    environment:
      - FLASK_ENV=development
    restart: unless-stopped
```

---

## 🔧 Dockerfile

### Dockerfile (vollständig, Frontend + Backend)

```dockerfile
# Stage 1: Frontend bauen
FROM node:18-alpine AS frontend-builder

WORKDIR /app/familienserver

# Abhängigkeiten installieren
COPY familienserver/package.json familienserver/package-lock.json ./
RUN npm ci

# Source-Code kopieren
COPY familienserver ./

# Next.js bauen
RUN npm run build

# Stage 2: Backend vorbereiten
FROM python:3.9-slim AS backend-builder

WORKDIR /app

# Python Abhängigkeiten installieren
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend-Code kopieren
COPY server.py ./
COPY familienserver/public/uploads familienserver/public/uploads

# Stage 3: Final Image
FROM node:18-alpine

WORKDIR /app

# Python für Backend installieren
RUN apk add --no-cache python3 py3-pip && pip install flask flask-cors

# Backend-Code und Frontend-Build kopieren
COPY --from=frontend-builder /app/familienserver/.next ./
COPY --from=frontend-builder /app/familienserver/public ./public
COPY --from=frontend-builder /app/familienserver/package.json ./
COPY --from=frontend-builder /app/familienserver/node_modules ./node_modules

COPY --from=backend-builder /app/server.py ./
COPY --from=backend-builder /app/requirements.txt ./

# Upload-Ordner erstellen
RUN mkdir -p familienserver/public/uploads

# Ports freigeben
EXPOSE 3000 5000

# Startskript
CMD ["sh", "-c", "python server.py > /dev/null 2>&1 & cd familienserver && npm run start"]
```

### Dockerfile.backend (nur Backend)

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./

# Upload-Ordner erstellen
RUN mkdir -p familienserver/public/uploads

EXPOSE 5000

CMD ["python", "server.py", "--host", "0.0.0.0", "--port", "5000"]
```

### Dockerfile.frontend (nur Frontend)

```dockerfile
FROM node:18-alpine

WORKDIR /app/familienserver

COPY familienserver/package.json familienserver/package-lock.json ./
RUN npm ci

COPY familienserver ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

---

## 🛠️ Nützliche Docker Befehle

### Container starten

```bash
# Container im Vordergrund starten (Logs werden angezeigt)
docker-compose up

# Container im Hintergrund starten
docker-compose up -d

# Container mit spezifischer Konfiguration starten
docker-compose -f docker-compose.yml up -d
```

### Container stoppen

```bash
# Alle Container anhalten
docker-compose down

# Container anhalten und Volumes löschen (⚠️ ACHTUNG: Uploads gehen verloren!)
docker-compose down -v

# Container anhalten und Cache löschen
docker-compose down --rmi all
```

### Container und Images komplett entfernen

```bash
# ⚠️ ACHTUNG: Dies löscht ALLE Docker Container, Images und Volumes!
docker system prune -a --volumes
```

### Container-Status prüfen

```bash
# Alle Container anzeigen (auch gestoppte)
docker ps -a

# Nur laufende Container anzeigen
docker ps

# Container-Ressourcen anzeigen
docker stats
```

### Logs anzeigen

```bash
# Logs aller Container anzeigen
docker-compose logs

# Logs mit automatischem Follow
docker-compose logs -f

# Logs eines spezifischen Containers
docker logs familienserver

# Logs mit Follow für spezifischen Container
docker logs -f familienserver
```

### In Container eintreten

```bash
# Shell im laufenden Container öffnen
docker exec -it familienserver /bin/sh

# Shell im laufenden Container mit Bash öffnen
docker exec -it familienserver /bin/bash
```

### Netzwerk prüfen

```bash
# Docker-Netzwerk anzeigen
docker network ls

# Netzwerk-Details anzeigen
docker network inspect familienserver_default
```

### Volumes verwalten

```bash
# Volumes anzeigen
docker volume ls

# Volume-Details anzeigen
docker volume inspect familienserver_familienserver

# Volume löschen
docker volume rm familienserver_familienserver
```

---

## 🔄 Images bauen und aktualisieren

### Image neu bauen

```bash
# Image neu bauen (ohne Cache)
docker-compose build --no-cache

# Nur ein spezifisches Image neu bauen
docker-compose build backend
```

### Images anzeigen

```bash
# Alle Images anzeigen
docker images

# Images filtern
docker images familienserver*
```

### Images entfernen

```bash
# Spezifisches Image entfernen
docker rmi familienserver_familienserver

# Alle nicht genutzten Images entfernen
docker image prune

# Alle nicht genutzten Images und Container entfernen
docker system prune
```

---

## 📊 Ressourcen begrenzen

Für bessere Performance auf Ressourcen-beschränkten Maschinen:

### docker-compose.yml mit Ressourcenlimits

```yaml
services:
  familienserver:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "5000:5000"
    volumes:
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'      # Maximal 50% CPU-Nutzung
          memory: 512M     # Maximal 512MB RAM
        reservations:
          cpus: '0.25'     # Garantierte 25% CPU
          memory: 256M     # Garantierter 256MB RAM
    ulimits:
      nofile:
        soft: 1024
        hard: 2048
```

---

## 🌐 Netzwerk-Konfiguration

### Ports ändern

```yaml
services:
  familienserver:
    ports:
      - "8080:3000"  # Frontend auf Port 8080
      - "8000:5000"  # Backend auf Port 8000
```

### Netzwerk alias verwenden

```yaml
services:
  familienserver:
    networks:
      - my_network

  backend:
    networks:
      - my_network

networks:
  my_network:
    driver: bridge
```

---

## 🔐 Umgebung Variablen

### .env-Datei für Docker

```bash
# .env-Datei im Projektverzeichnis erstellen
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
UPLOAD_FOLDER=./familienserver/public/uploads
MAX_FILE_SIZE=500  # MB
```

---

## ⚡ Performance-Optimierungen

### Build-Cache nutzen

```bash
# Cache nutzen für schnellere Builds
docker-compose build

# Cache löschen für sauberen Build
docker-compose build --no-cache
```

### Multi-Stage Builds

Die bereitgestellten Dockerfiles nutzen bereits Multi-Stage Builds, um die Image-Größe zu reduzieren.

---

## 🐛 Fehlerbehebung

### Häufige Probleme und Lösungen

#### 1. Port bereits in Verwendung

**Fehler:** `Error: listen EADDRINUSE: address already in use :::3000`

**Lösung:**
```bash
# Welcher Prozess blockiert den Port?
netstat -tulnp | grep 3000

# Prozess beenden
kill -9 <PID>

# Oder: Andere Ports in docker-compose.yml verwenden
```

#### 2. Volumes-Berechtigungen

**Fehler:** `Permission denied` beim Zugriff auf Uploads

**Lösung:**
```bash
# Berechtigungen für Upload-Ordner setzen
chmod -R 777 familienserver/public/uploads

# Oder in docker-compose.yml UID/GID setzen
services:
  familienserver:
    user: "1000:1000"  # Anpassen an Benutzer-ID
```

#### 3. Docker-Speicher voll

**Fehler:** `no space left on device`

**Lösung:**
```bash
# Docker-Speicher aufräumen
docker system prune -a --volumes

# Docker-Speicherlimit erhöhen (Docker Desktop)
# Einstellungen -> Resources -> Advanced -> Disk image size
```

#### 4. Images können nicht gebaut werden

**Fehler:** `ERROR: build failed`

**Lösung:**
```bash
# Logs anzeigen
docker-compose build 2>&1 | less

# Dependencies prüfen
# - Node.js Version prüfen
# - Python Version prüfen
# - npm/node_modules löschen und neu installieren
```

#### 5. Frontend und Backend können nicht kommunizieren

**Fehler:** CORS-Fehler oder Verbindung fehlgeschlagen

**Lösung:**
```bash
# In docker-compose.yml CORS-Einstellungen prüfen
environment:
  - NEXT_PUBLIC_API_BASE_URL=http://backend:5000

# Netzwerk-Konfiguration prüfen
# - Beide Container müssen im gleichen Netzwerk sein
# - Service-Namen können als Hostname verwendet werden
```

---

## 🧪 Entwicklung mit Hot-Reload

### Für Next.js Hot-Reload

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    volumes:
      - ./familienserver:/app/familienserver
      - /app/familienserver/node_modules
    command: npm run dev
    environment:
      - NODE_ENV=development
```

### Für Flask Hot-Reload

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    volumes:
      - ./server.py:/app/server.py
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
    command: python server.py --debug
    environment:
      - FLASK_ENV=development
```

---

## 📦 Produktion

### Für Produktion optimierte Konfiguration

```yaml
version: '3.8'

services:
  familienserver:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:3000"    # Frontend auf Port 80
      - "5000:5000"  # Backend auf Port 5000
    volumes:
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE_URL=http://<IHRE_DOMAIN>:5000
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

### Mit Nginx als Reverse Proxy

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend
    restart: always

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE_URL=https://<IHRE_DOMAIN>/api
    restart: always

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    expose:
      - "5000"
    volumes:
      - ./familienserver/public/uploads:/app/familienserver/public/uploads
    environment:
      - FLASK_ENV=production
    restart: always
```

### nginx.conf

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:5000;
}

server {
    listen 80;
    server_name <IHRE_DOMAIN>;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 💡 Tipps und Tricks

### Docker-Container exportieren

```bash
# Container als Tar-Archiv exportieren
docker export familienserver > familienserver.tar

# Container aus Tar-Archiv importieren
docker import familienserver.tar familienserver:latest
```

### Images speichern und laden

```bash
# Image speichern
docker save familienserver:latest > familienserver-image.tar

# Image laden
docker load < familienserver-image.tar
```

### Container als Service starten (Docker Swarm)

```bash
# Docker Swarm initialisieren
docker swarm init

# Service erstellen
docker service create --name familienserver --publish published=3000,target=3000 familienserver:latest
```

---

## 📝 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0.0 | 2024-01-00 | Initialversion |

---

## 🤝 Mitwirken

Beiträge zu dieser Docker-Konfiguration sind willkommen! Bitte erstellen Sie einen Pull Request mit Ihren Verbesserungen.

---

## 📜 Lizenz

Diese Docker-Konfiguration ist Teil des Familienserver-Projekts und unterliegt der gleichen Lizenz.