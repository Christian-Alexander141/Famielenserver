# 🐳 Docker Anleitung für den Familienserver

Diese Anleitung erklärt, wie du den Familienserver mit Docker betreibst. Docker vereinfacht die Installation und den Betrieb, da alle Abhängigkeiten in Containern gekapselt sind.

---

## 📋 Voraussetzungen

- [Docker](https://www.docker.com/get-started) (Version 20.10 oder neuer)
- [Docker Compose](https://docs.docker.com/compose/install/) (normalerweise mit Docker Desktop enthalten)
- Mindestens **2 GB RAM** für Docker
- **4 GB freier Festplattenspeicher**

---

## 🚀 Schnellstart

### 1. Repository klonen und in das Verzeichnis wechseln
```bash
cd /home/alex/Dokumente/Github/Famielenserver
```

### 2. Docker Container bauen und starten
```bash
docker-compose up -d --build
```

### 3. Status prüfen
```bash
docker-compose ps
```

### 4. Im Browser öffnen
- **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
- **Backend (Flask):** [http://localhost:5000](http://localhost:5000)

---

## 📚 Detaillierte Befehle

### Container bauen und starten

| Befehl | Beschreibung |
|--------|--------------|
| `docker-compose up -d --build` | Baue Images neu und starte Container im Hintergrund |
| `docker-compose up -d` | Starte Container mit bestehenden Images |
| `docker-compose up` | Starte Container im Vordergrund (Logs werden angezeigt) |

**Optionen:**
- `-d` = Detached Mode (Container laufen im Hintergrund)
- `--build` = Images neu bauen (notwendig nach Code-Änderungen)
- `--force-recreate` = Container neu erstellen (auch wenn sie existieren)

---

### Container verwalten

| Befehl | Beschreibung |
|--------|--------------|
| `docker-compose ps` | Zeige Status aller Container |
| `docker-compose logs` | Zeige Logs aller Container |
| `docker-compose logs backend` | Zeige Logs nur vom Backend |
| `docker-compose logs frontend` | Zeige Logs nur vom Frontend |
| `docker-compose logs -f` | Folge den Logs in Echtzeit |
| `docker-compose restart` | Starte alle Container neu |
| `docker-compose restart backend` | Starte nur das Backend neu |
| `docker-compose stop` | Stoppe alle Container |
| `docker-compose down` | Stoppe und entferne alle Container |
| `docker-compose down -v` | Stoppe, entferne Container **und Volumes** |

---

### Container manuell verwalten

| Befehl | Beschreibung |
|--------|--------------|
| `docker ps` | Zeige alle laufenden Container |
| `docker ps -a` | Zeige alle Container (auch gestoppte) |
| `docker images` | Zeige alle Docker-Images |
| `docker rm familienserver-backend` | Entferne den Backend-Container |
| `docker rm familienserver-frontend` | Entferne den Frontend-Container |
| `docker rmi familienserver-backend` | Entferne das Backend-Image |
| `docker rmi familienserver-frontend` | Entferne das Frontend-Image |
| `docker system prune` | Bereinige nicht verwendete Container, Images und Netzwerke |

---

## 🏗️ Docker Architektur

### Container Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                            │
│                                                           │
│  ┌──────────────────┐    ┌──────────────────┐            │
│  │  Backend         │    │  Frontend        │            │
│  │  (Flask)         │    │  (Next.js)       │            │
│  │  Port: 5000      │    │  Port: 3000      │            │
│  │  Container:      │    │  Container:      │            │
│  │  familienserver- │    │  familienserver- │            │
│  │  backend         │    │  frontend        │            │
│  └────────┬─────────┘    └────────┬─────────┘            │
│           │                         │                         │
│           └─────────────┬───────────┘                         │
│                         │                                   │
│                 Docker Network:                           │
│                 familienserver-network                   │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                  Host Ports:
                  3000 → Frontend
                  5000 → Backend
```

---

### Docker Dateien

| Datei | Beschreibung |
|-------|--------------|
| `Dockerfile.backend` | Build-Anweisungen für das Flask-Backend |
| `Dockerfile.frontend` | Build-Anweisungen für das Next.js-Frontend |
| `docker-compose.yml` | Konfiguration für Docker Compose |
| `.env` | Umgebungsvariablen für Docker |

---

## 📂 Daten persistent speichern

Die hochgeladenen Dateien werden in einem **Volume** gespeichert, das mit deinem Host-System verbunden ist:

- **Host-Pfad:** `./familienserver/public/uploads/`
- **Container-Pfad:** `/app/familienserver/public/uploads/`

### Wichtig:
- Dateien bleiben erhalten, auch wenn Container neu gestartet werden
- Dateien gehen **verloren**, wenn du das Projekt-Verzeichnis löschst
- Für Backups: Sichere den Ordner `familienserver/public/uploads/`

---

## 🔧 Konfiguration anpassen

### Ports ändern

In `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "5000:5000"  # Host:Container - hier ändern
  frontend:
    ports:
      - "3000:3000"  # Host:Container - hier ändern
```

### Umgebungsvariablen

In `.env`:

```env
# Backend
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=http://backend:5000
```

**Wichtig:** Im Docker-Netzwerk ist der Backend-Service unter dem Namen `backend` erreichbar. Die Frontend-Container verwenden diese URL, um mit dem Backend zu kommunizieren.

---

## 🌐 Netzwerk-Konfiguration für Heimnetzwerk

### Auf anderen Geräten im Netzwerk zugreifen

1. **IP-Adresse deines Servers herausfinden:**
   ```bash
   hostname -I  # Linux
   ipconfig     # Windows
   ```

2. **Auf anderen Geräten im Browser öffnen:**
   - Frontend: `http://DEINE_IP:3000`
   - Backend: `http://DEINE_IP:5000`

3. **Firewall öffnen:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 3000/tcp
   sudo ufw allow 5000/tcp
   ```

---

## 🔄 Container aktualisieren

Nach Code-Änderungen:

```bash
# 1. Container stoppen
docker-compose down

# 2. Images neu bauen und Container starten
docker-compose up -d --build
```

---

## ⚠️ Fehlerbehebung

### Problem: Port bereits belegt

**Fehlermeldung:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Lösung:**
```bash
# 1. Prüfe, welcher Prozess den Port blockiert
sudo lsof -i :5000

# 2. Prozess beenden (wenn es ein alter Container ist)
docker-compose down

# 3. Container neu starten
docker-compose up -d --build
```

### Problem: Container startet nicht

**Fehlermeldung:**
```
familienserver-backend | ModuleNotFoundError: No module named 'flask'
```

**Lösung:**
```bash
# Images neu bauen
docker-compose build --no-cache

# Container starten
docker-compose up -d
```

### Problem: Frontend zeigt "Keine Verbindung zum Server"

**Lösung:**
1. Prüfe, ob beide Container laufen:
   ```bash
   docker-compose ps
   ```

2. Prüfe die Logs:
   ```bash
   docker-compose logs frontend
   docker-compose logs backend
   ```

3. Starte beide Container neu:
   ```bash
   docker-compose restart
   ```

### Problem: Uploads funktionieren nicht

**Lösung:**
1. Prüfe, ob der Upload-Ordner existiert:
   ```bash
   mkdir -p familienserver/public/uploads
   ```

2. Prüfe die Berechtigungen:
   ```bash
   chmod -R 777 familienserver/public/uploads
   ```

---

## 🧹 Aufräumen

### Nicht mehr benötigte Container und Images entfernen

```bash
# Alle gestoppten Container entfernen
docker container prune

# Nicht verwendete Images entfernen
docker image prune

# Alles bereinigen (Container, Images, Netzwerke, Volumes)
docker system prune -a --volumes
```

**Achtung:** `docker system prune -a --volumes` entfernt **alle** nicht verwendeten Ressourcen, inklusive deiner hochgeladenen Dateien!

---

## 📊 Docker Ressourcen überwachen

```bash
# Container-Ressourcen anzeigen
docker stats

# Docker Disk Usage anzeigen
docker system df

# Detaillierte Informationen zu einem Container
docker inspect familienserver-backend
```

---

## 🔐 Sicherheitstipps

1. **Docker nicht als Root ausführen**
2. **Ports nicht unnötig freigeben** (nur 3000 und 5000 sind notwendig)
3. **Regelmäßig Updates durchführen:**
   ```bash
   docker-compose pull
   docker-compose up -d --build
   ```
4. **Backups erstellen:**
   ```bash
   # Upload-Ordner sichern
   tar -czvf familienserver_backup_$(date +%Y%m%d).tar.gz familienserver/public/uploads/
   ```

---

## 📖 Nützliche Docker-Befehle

| Aufgabe | Befehl |
|---------|--------|
| Alle Container stoppen | `docker stop $(docker ps -aq)` |
| Alle Container entfernen | `docker rm $(docker ps -aq)` |
| Alle Images entfernen | `docker rmi $(docker images -q)` |
| Docker neu starten | `sudo systemctl restart docker` |
| Docker-Status prüfen | `sudo systemctl status docker` |

---

## 🎯 Zusammenfassung der wichtigsten Befehle

```bash
# ✅ Starten
cd /home/alex/Dokumente/Github/Famielenserver
docker-compose up -d --build

# 📊 Status prüfen
docker-compose ps

# 📝 Logs anzeigen
docker-compose logs -f

# 🔄 Neu starten
docker-compose restart

# ❌ Stoppen
docker-compose down

# 🧹 Aufräumen (nur Container, nicht die Dateien!)
docker-compose down -v
```

---

## 💡 Tipps für die Entwicklung

### Frontend hot-reload aktivieren
Für die Entwicklung kannst du das Frontend mit hot-reload starten:

```bash
# Backend normal mit Docker
docker-compose up -d backend

# Frontend lokal mit hot-reload
cd familienserver
npm run dev
```

### Backend lokal debuggen
```bash
# Frontend mit Docker
docker-compose up -d frontend

# Backend lokal
source venv/bin/activate
python3 server.py --port 5001
```

---

## 📞 Support

Bei Problemen:

1. **Logs prüfen:**
   ```bash
   docker-compose logs
   ```

2. **Container-Status prüfen:**
   ```bash
   docker-compose ps
   ```

3. **Docker-Version prüfen:**
   ```bash
   docker --version
docker-compose --version
   ```

---

**Viel Erfolg mit deinem Familienserver!** 🎉
