# 🚀 Familienserver ohne Docker betreiben

Diese Anleitung erklärt, wie du den Familienserver **ohne Docker** direkt auf deinem System ausführst.

---

## ❌ Häufiger Fehler

**Fehlermeldung:**
```
npm error code ENOENT
npm error Could not read package.json: Error: ENOENT: no such file or directory
```

**Ursache:** Du versuchst `npm run dev` im **falschen Verzeichnis** auszuführen. Die `package.json` befindet sich im Unterordner `familienserver/`, nicht im Root-Verzeichnis des Projekts.

---

## ✅ Korrekte Ausführung

### 1. **Backend (Flask) starten**

Wechsle in das Projektverzeichnis und starte das Flask-Backend:

```bash
cd /home/alex/Dokumente/Github/Famielenserver

# Virtuelle Python-Umgebung aktivieren
source venv/bin/activate  # Linux/macOS
# oder: .\venv\Scripts\activate  # Windows

# Flask-Server starten
python3 server.py
```

**Backend läuft auf:** [http://localhost:5000](http://localhost:5000)

---

### 2. **Frontend (Next.js) starten**

Wechsle in den `familienserver`-Ordner und starte das Next.js-Frontend:

```bash
cd /home/alex/Dokumente/Github/Famielenserver/familienserver
npm run dev
```

**Frontend läuft auf:** [http://localhost:3000](http://localhost:3000)

---

## 📍 Wichtig: Arbeitsverzeichnis

| Aufgabe | Verzeichnis | Befehl |
|---------|-------------|--------|
| **Backend starten** | `/home/alex/Dokumente/Github/Famielenserver/` | `python3 server.py` |
| **Frontend starten** | `/home/alex/Dokumente/Github/Famielenserver/familienserver/` | `npm run dev` |

---

## 📋 Voraussetzungen prüfen

### Node.js und npm
```bash
# Version prüfen
node --version  # Sollte >= 18 sein
npm --version   # Sollte >= 9 sein

# Falls nicht installiert (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Falls nicht installiert (Windows/macOS):
# Lade von https://nodejs.org/ herunter
```

### Python und venv
```bash
# Python Version prüfen
python3 --version  # Sollte >= 3.8 sein

# Virtuelle Umgebung erstellen (falls noch nicht geschehen)
python3 -m venv venv

# Virtuelle Umgebung aktivieren
source venv/bin/activate  # Linux/macOS
# oder: .\venv\Scripts\activate  # Windows

# Python-Abhängigkeiten installieren
pip install -r requirements.txt
```

---

## 🚀 Schritt-für-Schritt Anleitung

### Schritt 1: Projekt vorbereiten
```bash
cd /home/alex/Dokumente/Github/Famielenserver
```

### Schritt 2: Python-Umgebung einrichten
```bash
# Virtuelle Umgebung erstellen (nur beim ersten Mal)
python3 -m venv venv

# Virtuelle Umgebung aktivieren
source venv/bin/activate  # Linux/macOS

# Abhängigkeiten installieren
pip install -r requirements.txt
```

### Schritt 3: Frontend-Abhängigkeiten installieren
```bash
cd familienserver
npm install
cd ..
```

### Schritt 4: Backend starten
```bash
# In /home/alex/Dokumente/Github/Famielenserver/
python3 server.py
```

### Schritt 5: Frontend starten (in neuem Terminal!)
```bash
cd /home/alex/Dokumente/Github/Famielenserver/familienserver
npm run dev
```

---

## 🎯 Alternative: Alles mit einem Skript

Verwende das `start.sh`-Skript für einfache Inbetriebnahme:

```bash
cd /home/alex/Dokumente/Github/Famielenserver

# Skript ausführbar machen (nur beim ersten Mal)
chmod +x start.sh

# Skript ausführen
./start.sh
```

Das Skript bietet ein Menü mit Optionen:
1. Nur Backend starten
2. Nur Frontend starten
3. Beide starten
4. Beenden

---

## 🔧 API-Konfiguration

Das Frontend muss mit dem Backend kommunizieren können. Standardmäßig ist die API-Basis-URL auf `http://localhost:5000` eingestellt.

### Falls du andere Ports verwendest:

Erstelle eine `.env.local`-Datei im `familienserver`-Ordner:

```bash
cd familienserver
cp .env.local.example .env.local
```

Dann passe die URL an:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

---

## 🌐 Netzwerk-Konfiguration für Heimnetzwerk

### Auf anderen Geräten zugreifen

1. **Backend URL anpassen** (in `familienserver/app/lib/config.ts`):
   ```typescript
   NEXT_PUBLIC_API_BASE_URL=http://DEINE_IP:5000
   ```

2. **Firewall öffnen:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 3000/tcp
   sudo ufw allow 5000/tcp
   ```

3. **IP-Adresse herausfinden:**
   ```bash
   hostname -I  # Linux
   ipconfig     # Windows
   ```

4. **Auf anderen Geräten im Browser öffnen:**
   - Frontend: `http://DEINE_IP:3000`
   - Backend: `http://DEINE_IP:5000`

---

## ⚠️ Häufige Probleme & Lösungen

### Problem 1: `npm` findet `package.json` nicht
```bash
npm error ENOENT: no such file or directory, open '/home/alex/.../package.json'
```

**Lösung:** Wechsle in das richtige Verzeichnis:
```bash
cd familienserver
npm run dev
```

### Problem 2: Python-Modul nicht gefunden
```bash
ModuleNotFoundError: No module named 'flask'
```

**Lösung:** Installiere die Abhängigkeiten:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Problem 3: Port bereits belegt
```bash
Error: listen EADDRINUSE: address already in use :::5000
```

**Lösung:** Prüfe, welcher Prozess den Port blockiert und beende ihn:
```bash
# Prozess finden
sudo lsof -i :5000
sudo lsof -i :3000

# Prozess beenden (Ersetze PID mit der tatsächlichen Prozess-ID)
kill -9 PID
```

### Problem 4: Frontend kann Backend nicht erreichen
```
Failed to fetch /api/files
```

**Lösung:**
1. Prüfe, ob das Backend läuft:
   ```bash
   curl http://localhost:5000/api/files
   ```
2. Prüfe die API_BASE_URL in der Frontend-Konfiguration

---

## 📊 Nützliche Befehle

| Aufgabe | Backend (Flask) | Frontend (Next.js) |
|---------|------------------|---------------------|
| **Starten** | `python3 server.py` | `npm run dev` |
| **Stoppen** | `STRG + C` | `STRG + C` |
| **Build** | - | `npm run build` |
| **Production Start** | - | `npm run start` |
| **Logs** | `python3 server.py` (direkt) | `npm run dev` (direkt) |

---

## 💡 Entwicklungstipps

### Frontend mit Hot-Reload
```bash
cd familienserver
npm run dev
```
- Änderungen werden automatisch erkannt und die Seite aktualisiert sich

### Backend mit Debug-Modus
```bash
python3 server.py
```
- Debug-Modus ist standardmäßig aktiviert
- Für Produktion: `python3 server.py --debug False`

### Backend auf anderen Port starten
```bash
python3 server.py --port 8000
```

### Frontend auf anderen Port starten
```bash
cd familienserver
npm run dev -- --port 8080
```

---

## 🔄 Dienste neu starten

### Backend neu starten
```bash
# Stoppen mit STRG + C
# Dann neu starten
python3 server.py
```

### Frontend neu starten
```bash
cd familienserver
# Stoppen mit STRG + C
npm run dev
```

---

## 🧹 Aufräumen

### Virtuelle Umgebung deaktivieren
```bash
deactivate
```

### Nicht mehr benötigte Dateien entfernen
```bash
# Python Cache
rm -rf __pycache__/

# Node.js node_modules (wenn du sie neu installieren willst)
rm -rf familienserver/node_modules/
```

---

## 📝 Zusammenfassung

| Schritt | Befehl | Verzeichnis |
|---------|--------|-------------|
| 1. Projekt öffnen | `cd /home/alex/Dokumente/Github/Famielenserver` | Root |
| 2. venv aktivieren | `source venv/bin/activate` | Root |
| 3. Backend starten | `python3 server.py` | Root |
| 4. Frontend-Abhängigkeiten | `npm install` | familienserver/ |
| 5. Frontend starten | `npm run dev` | familienserver/ |

---

**Viel Erfolg!** 🎉

Falls du weitere Hilfe brauchst oder auf Probleme stößt, schau in die anderen Dokumentationen oder frag nach!
