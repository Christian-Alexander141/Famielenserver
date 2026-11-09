# 🗂️ Familienserver

Ein Familien-Server zum Hochladen und Verwalten von Dokumenten im Heimnetzwerk. Inklusive Chatbot für intelligente Dateisuche und erweiterter Ordner-Verwaltung.

---

## 📸 **Screenshots**

### 🖼️ Hauptansicht

**📁 Dateiliste mit Ordnern und Dateien:**
```
┌─────────────────────────────────────────────────────────────┐
│  🗂️ Familienserver                                         ✅ │
│                                                             │
│  🏠 Root / Bilder / Urlaub                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📁 Bilder          🔄  ✏️  ⬇️  🗑️                    │  │
│  │ 📁 Dokumente       🔄  ✏️  ⬇️  🗑️                    │  │
│  │ 📁 Urlaub          🔄  ✏️  ⬇️  🗑️                    │  │
│  │ 📄 Rechnung.pdf    🔄  ✏️  ⬇️  🗑️  2.4MB            │  │
│  │ 🖼️ foto1.jpg      🔄  ✏️  ⬇️  🗑️  1.8MB            │  │
│  │ 🎥 video.mp4       🔄  ✏️  ⬇️  🗑️  45.6MB           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [📁 Neuer Ordner] [🔄 Aktualisieren]                        │
└─────────────────────────────────────────────────────────────┘
```

**📤 Datei-Upload:**
```
┌─────────────────────────────────────────────────────────────┐
│  📤 Dateien/Ordner hochladen                               │
│                                                             │
│  [📁 Dateien auswählen]                                   │
│                                                             │
│  Ausgewählt: meine_datei.pdf                               │
│                                                             │
│  [⬆️ Hochladen]                                           │
│                                                             │
│  💡 Hinweis: In Chrome, Edge, Opera und Safari können     │
│     Sie ganze Ordner auswählen. In Firefox nur           │
│     einzelne Dateien.                                      │
└─────────────────────────────────────────────────────────────┘
```

**📊 Systemmonitoring:**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Systemauslastung                                        │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                  │
│  │  🎯 CPU │    │  🧠 RAM │    │  💾 Disk │                │
│  │  45.2%  │    │  65.4%  │    │  32.1%  │                │
│  │ (52.3°C)│    │         │    │         │                │
│  └─────────┘    └─────────┘    └─────────┘                  │
│                                                             │
│  ⚡ Raspberry Pi - CPU-Temperatur wird angezeigt             │
└─────────────────────────────────────────────────────────────┘
```

**🤖 Chatbot:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Chatbot                                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Du: Suche nach Urlaub                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Bot: Ich habe 3 Dateien gefunden:                  │   │
│  │                                                  │   │
│  │ 📄 Urlaub_2024.pdf          [⬇️]                   │   │
│  │ 🖼️ Urlaub_foto1.jpg        [⬇️]                   │   │
│  │ 🖼️ Urlaub_foto2.jpg        [⬇️]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Suche nach Dateien...]                                    │
└─────────────────────────────────────────────────────────────┘
```

**📁 Ordner Navigation:**
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Root / Bilder / Urlaub                    ← Zurück     │
│                                                             │
│  Aktueller Pfad: /uploads/Bilder/Urlaub                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Funktionen**

### 📁 **Datei- und Ordner-Verwaltung**
- ✅ **Datei-Upload**: Einzelne Dateien oder ganze Ordner (in Chrome/Edge/Safari) hochladen
- ✅ **Ordner erstellen**: Neue Ordner direkt im Browser erstellen
- ✅ **Dateien verschieben**: Dateien und Ordner in andere Ordner verschieben
- ✅ **Umbenennen**: Dateien und Ordner umbenennen
- ✅ **Löschen**: Dateien und Ordner dauerhaft löschen
- ✅ **ZIP-Download**: Ganze Ordner als ZIP-Datei herunterladen
- ✅ **Ordner-Navigation**: Breadcrumb-Leiste für einfache Navigation

### 📊 **Systemmonitoring**
- ✅ **CPU-Auslastung**: Echtzeit-Anzeige mit Prozentsatz
- ✅ **RAM-Auslastung**: Speichernutzung mit Buffers/Cached
- ✅ **Festplatten-Auslastung**: Belegter Speicherplatz
- ✅ **CPU-Temperatur**: Nur auf Raspberry Pi (falls verfügbar)

### 🤖 **Chatbot (regelbasiert)**
- ✅ **Dateisuche**: Suche nach Dateinamen
- ✅ **Typensuche**: Suche nach Dateitypen (PDFs, Bilder, Dokumente, etc.)
- ✅ **Datumssuche**: Suche nach Datum oder Monat
- ✅ **Lokale Suche**: Keine externen APIs, komplett offline
- ✅ **Download-Links**: Direkter Download aus den Suchergebnissen

### 🎨 **Design**
- ✅ **iOS Dark Mode**: Modernes, iOS-inspiriertes Design
- ✅ **Responsive**: Optimiert für Desktop, Tablet und Smartphone
- ✅ **Touch-optimiert**: Einfache Bedienung auf Touchscreens
- ✅ **Barrierefreiheit**: WCAG-konform

---

## 📦 **Projektstruktur**

```
FamilienServer/
├── familienserver/          # Next.js Frontend (Port 3000)
│   ├── app/                 # Next.js App Router
│   │   ├── components/      # React Komponenten
│   │   │   ├── FileUpload.tsx      # Datei-Upload
│   │   │   ├── FileList.tsx        # Dateiliste mit Ordner-Funktionen
│   │   │   ├── SystemMonitor.tsx   # Systemauslastung
│   │   │   └── ChatInterface.tsx   # Chatbot
│   │   ├── lib/             # Hilfsfunktionen
│   │   └── page.tsx         # Hauptseite
│   ├── public/              # Statische Dateien
│   │   └── uploads/         # Hochgeladene Dateien
│   └── package.json
├── server.py                # Flask Backend Server (Port 5000)
├── requirements.txt         # Python Abhängigkeiten
├── start.sh                 # Startskript
├── Dockerfile.backend       # Docker für Backend
├── Dockerfile.frontend      # Docker für Frontend
├── docker-compose.yml       # Docker Compose
├── DOCKER.md                # Docker Anleitung
├── RASPBERRY_PI.md          # Raspberry Pi Anleitung
├── ohne_docker.md           # Anleitung ohne Docker
├── docs/                    # Dokumentation
│   └── images/              # Screenshots (hier eigene hinzufügen)
└── README.md
```

---

## 🛠️ **Installation**

### **Voraussetzungen**

- **Node.js** 18+ (für Next.js Frontend)
- **Python** 3.8+ (für Flask Backend)
- **npm** oder **yarn** (für JavaScript Abhängigkeiten)
- **pip** (für Python Abhängigkeiten)

---

### **Schnellstart (empfohlen)**

Verwende das `start.sh`-Skript:

```bash
# 1. In das Projektverzeichnis wechseln
cd /home/alex/Dokumente/Github/Famielenserver

# 2. Skript ausführbar machen (nur beim ersten Mal)
chmod +x start.sh

# 3. Skript ausführen
./start.sh
```

**Wähle dann Option 3:** "Beide starten (Backend + Frontend)"

- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000

---

### **Manuelle Installation**

#### **Backend (Flask) einrichten**

```bash
cd /home/alex/Dokumente/Github/Famielenserver

# Virtuelle Python-Umgebung erstellen
python3 -m venv venv

# Virtuelle Umgebung aktivieren
source venv/bin/activate  # Linux/macOS
# oder: .\venv\Scripts\activate  # Windows

# Abhängigkeiten installieren
pip install -r requirements.txt

# Backend starten
python3 server.py
```

#### **Frontend (Next.js) einrichten**

```bash
cd familienserver
npm install
npm run dev
```

---

## 🏃‍♂️ **Starten**

### **Entwicklungsumgebung**

**Terminal 1: Backend**
```bash
cd /home/alex/Dokumente/Github/Famielenserver
source venv/bin/activate
python3 server.py
```
→ **Backend läuft auf:** [http://localhost:5000](http://localhost:5000)

**Terminal 2: Frontend**
```bash
cd familienserver
npm run dev
```
→ **Frontend läuft auf:** [http://localhost:3000](http://localhost:3000)

### **Produktion**

**Backend:**
```bash
python3 server.py --host 0.0.0.0 --port 5000
```

**Frontend:**
```bash
cd familienserver
npm run build
npm run start
```

---

## 🌐 **Netzwerk-Konfiguration**

Für die Nutzung im **Heimnetzwerk**:

### **1. Backend-URL anpassen**
In `familienserver/app/lib/config.ts`:
```typescript
NEXT_PUBLIC_API_BASE_URL=http://DEINE_IP:5000
```

Oder Umgebungsvariable setzen:
```bash
# In familienserver/.env.local
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:5000
```

### **2. Firewall öffnen**
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

### **3. Auf anderen Geräten zugreifen**
- **Frontend:** `http://DEINE_SERVER_IP:3000`
- **Backend:** `http://DEINE_SERVER_IP:5000`

---

## 📁 **Datei- und Ordner-Verwaltung**

### **Ordner erstellen**
1. Klicke auf **"📁 Neuer Ordner"**
2. Gib einen Namen ein
3. Bestätige mit **"Erstellen"**

### **In Ordner navigieren**
- Klicke auf einen Ordner in der Liste
- Nutze die **Breadcrumb-Leiste** oben, um zurück zu navigieren
- **"← Zurück"** - Gehe zum vorherigen Ordner
- **"🏠 Root"** - Gehe zum Root-Verzeichnis

### **Dateien/Ordner verschieben**
1. Klicke auf **"🔄"** (Verschieben-Button)
2. Gib den **Zielpfad** ein (z.B. `Bilder/Urlaub/neuer_name.jpg`)
3. Bestätige mit **"Verschieben"**

### **Dateien/Ordner umbenennen**
1. Klicke auf **"✏️"** (Umbenennen-Button)
2. Gib den **neuen Namen** ein
3. Bestätige mit **"Umbenennen"**

### **Dateien/Ordner löschen**
1. Klicke auf **"🗑️"** (Löschen-Button)
2. Bestätige im **Lösch-Dialog**
3. Datei/Ordner wird **dauerhaft gelöscht**

### **Ordner als ZIP downloaden**
1. Klicke auf **"⬇️"** bei einem Ordner
2. Der gesamte Ordner wird als **ZIP-Datei** heruntergeladen

### **Dateien hochladen**
1. Klicke auf **"📁 Dateien auswählen"**
2. Wähle eine oder mehrere Dateien aus
3. Klicke auf **"⬆️ Hochladen"**
4. **Tipp:** In Chrome/Edge/Safari können ganze Ordner hochgeladen werden

---

## 🤖 **Chatbot**

Der **regelbasierte Chatbot** hilft dir, Dateien zu finden:

### **Beispiel-Suchen:**

| Suche | Beispiel | Ergebnis |
|-------|----------|----------|
| **Textsuche** | "Urlaub" | Finde Dateien mit "urlaub" im Namen |
| **Dateityp** | "PDFs" | Finde alle PDF-Dateien |
| **Dokumente** | "Dokumente" | Finde PDF, DOC, TXT, etc. |
| **Bilder** | "Bilder" | Finde JPG, PNG, GIF, etc. |
| **Videos** | "Videos" | Finde MP4, MOV, AVI, etc. |
| **Datum** | "2024" | Finde Dateien mit "2024" im Namen |
| **Monat** | "Januar" | Finde Dateien mit "januar" im Namen |

### **Funktionen:**
- ✅ **Schnelle Suche** - Sofortige Ergebnisse
- ✅ **Download-Links** - Direkter Download aus den Ergebnissen
- ✅ **Hinweise** - Zeigt Tipps an (z.B. "Es gibt 15 PDF-Dateien")
- ✅ **Keine externen APIs** - Alles läuft lokal
- ✅ **Datenschutz** - Keine Daten verlassen dein System

---

## 📊 **API-Endpunkte**

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/files` | Liste aller Dateien/Ordner im Root |
| GET | `/api/files/<path>` | Liste Dateien/Ordner in einem Ordner |
| POST | `/api/upload` | Datei hochladen |
| POST | `/api/mkdir/<path>` | Ordner erstellen |
| POST | `/api/move` | Datei/Ordner verschieben oder umbenennen |
| DELETE | `/api/delete/<path>` | Datei/Ordner löschen |
| GET | `/api/download/<path>` | Einzelne Datei downloaden |
| GET | `/api/download-zip/<path>` | **Ordner als ZIP downloaden** |
| GET | `/api/systeminfo` | Systeminformationen (CPU, RAM, Disk) |
| POST | `/api/chat` | Chatbot-Suche |

---

## 🔧 **Konfiguration**

### **Backend-Einstellungen**

In `server.py`:

```python
UPLOAD_FOLDER = Path('familienserver/public/uploads')  # Upload-Ordner
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # Max. Dateigröße (500MB)
```

### **Frontend-Einstellungen**

In `familienserver/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_UPLOAD_FOLDER=public/uploads
```

---

## 🌐 **Netzwerk-Konfiguration für Raspberry Pi**

Falls du den Server auf einem **Raspberry Pi** betreibst:

- **Ports freigeben:** 3000 (Frontend) und 5000 (Backend)
- **CPU-Temperatur:** Wird automatisch angezeigt (nur auf Raspberry Pi)
- **Docker vermeiden:** Zu ressourcenintensiv für Pi 3B

**Detaillierte Anleitung:** [RASPBERRY_PI.md](RASPBERRY_PI.md)

---

## 🛡️ **Sicherheit**

⚠️ **Wichtig:** Dieser Server ist für den **privaten Gebrauch im Heimnetzwerk** gedacht!

### **Empfehlungen für sicheren Betrieb:**

1. **Firewall aktivieren**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw allow 5000/tcp
   sudo ufw enable
   ```

2. **Nicht öffentlich zugänglich machen**
   - Nur im **lokalen Netzwerk** betreiben
   - **Nicht** Port-Forwarding im Router einrichten

3. **Externe Zugriffe nur über VPN**
   - Verwende WireGuard oder OpenVPN
   - Kein direkter Internet-Zugriff

4. **Regelmäßige Backups**
   ```bash
   # Upload-Ordner sichern
   tar -czvf familienserver_backup_$(date +%Y%m%d).tar.gz familienserver/public/uploads/
   ```

5. **Authentifizierung hinzufügen** (für Produktion)
   - Basic Auth
   - JWT Token
   - Session-Based Auth

---

## 🚧 **Roadmap**

- [x] Next.js Migration
- [x] React Komponenten
- [x] Datei-Upload/Download
- [x] Systemmonitoring
- [x] Grundlegender Chatbot
- [x] **Ordner-Verwaltung** (Erstellen, Verschieben, Löschen)
- [x] **ZIP-Download** für Ordner
- [x] **Breadcrumb-Navigation**
- [x] Raspberry Pi Optimierung
- [ ] Drag & Drop Upload
- [ ] Mehrfachauswahl für Aktionen
- [ ] Datei-Vorschau (Bilder, PDFs)
- [ ] Verschlüsselung
- [ ] Backup-Funktionen
- [ ] Benutzerauthentifizierung
- [ ] Fortgeschrittene Suchfunktionen

---

## 🤝 **Mitwirken**

Beiträge sind willkommen! Bitte erstellen Sie einen **Pull Request**.

### **Wie du mithelfen kannst:**
- 🐛 **Bugs melden:** Erstelle ein Issue mit Schritten zur Reproduktion
- 💡 **Feature-Vorschläge:** Diskutiere neue Ideen in den Issues
- 📝 **Dokumentation verbessern:** Korrigiere oder ergänze die README
- 🎨 **Design-Verbesserungen:** UI/UX Optimierungen
- 🐳 **Docker Verbesserungen:** Optimierungen für Container
- 🍓 **Raspberry Pi:** Hardware-spezifische Anpassungen

---

## 📜 **Lizenz**

Dieses Projekt ist für den **persönlichen Gebrauch** gedacht.

---

## 📞 **Support**

Bei Fragen oder Problemen:

1. **Dokumentation lesen:** [DOCKER.md](DOCKER.md), [RASPBERRY_PI.md](RASPBERRY_PI.md), [ohne_docker.md](ohne_docker.md)
2. **Issues prüfen:** Eventuell wurde dein Problem bereits gelöst
3. **Neues Issue erstellen:** Beschreibe dein Problem mit Schritten zur Reproduktion
4. **Discord/Forum:** (falls verfügbar)

---

## 💡 **Tipps & Tricks**

### **Upload-Größe erhöhen**
In `server.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB
```

### **Upload-Ordner ändern**
In `server.py`:
```python
UPLOAD_FOLDER = Path('/pfad/zum/neuen/upload/ordner')
```

### **Externe Festplatte nutzen**
1. Festplatte mounten:
   ```bash
   sudo mkdir /mnt/familienserver
   sudo mount /dev/sda1 /mnt/familienserver
   ```
2. In `server.py` anpassen:
   ```python
   UPLOAD_FOLDER = Path('/mnt/familienserver')
   ```
3. Berechtigungen setzen:
   ```bash
   sudo chmod -R 777 /mnt/familienserver
   ```

### **Swapp-Speicher erhöhen (Raspberry Pi)**
```bash
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048
sudo /etc/init.d/dphys-swapfile restart
```

---

## 🐳 **Docker-Installation (optional)**

Für die Entwicklung auf leistungsfähigen Maschinen:

- [📖 **Docker-Anleitung (DOCKER.md)**](DOCKER.md)
- [🍓 **Raspberry Pi Anleitung (RASPBERRY_PI.md)**](RASPBERRY_PI.md)
- [📋 **Anleitung ohne Docker (ohne_docker.md)**](ohne_docker.md)

> **⚠️ WICHTIG:** Docker wird **Nicht empfohlen** für Raspberry Pi 3B!

---

## 🎉 **Screenshots selbst erstellen**

Falls du **echte Screenshots** hinzufügen möchtest:

1. Server und Frontend starten
2. Screenshots erstellen (Windows: Win+Shift+S, Mac: CMD+Shift+4, Linux: Flameshot)
3. Bilder in `docs/images/` speichern
4. In der README einbinden:
   ```markdown
   ![Hauptansicht](docs/images/screenshot-main.png)
   ```

**Anleitung:** [docs/images/README.md](docs/images/README.md)

---

**Erstellt mit ❤️ für Familien**

*Ein einfacher, leistungsfähiger Server für dein Heimnetzwerk*
