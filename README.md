# 🗂️ Familienserver

Ein Familien-Server zum Hochladen und Verwalten von Dokumenten im Heimnetzwerk. Inklusive Chatbot für intelligente Dateisuche.

## 🚀 Funktionen

- **Datei-Upload**: Einfaches Hochladen von Dateien und Ordnern
- **Dateiverwaltung**: Anzeigen, Herunterladen und Löschen von Dateien
- **Systemmonitoring**: Echtzeit-Anzeige von CPU, RAM und Speicherauslastung
- **Chatbot**: Intelligente Suche nach Dateien (in Arbeit)
- **Dark Mode**: iOS-inspiriertes Design für beste Benutzererfahrung

## 📦 Projektstruktur

```
FamilienServer/
├── familienserver/          # Next.js Frontend
│   ├── app/                 # Next.js App Router
│   │   ├── components/      # React Komponenten
│   │   ├── lib/             # Hilfsfunktionen
│   │   ├── api/             # API Routes (für Next.js API)
│   ├── public/              # Statische Dateien & Uploads
│   │   └── uploads/         # Hochgeladene Dateien
│   ├── package.json
│   └── ...
├── server.py                # Flask Backend Server
├── requirements.txt         # Python Abhängigkeiten
└── README.md
```

## 🛠️ Installation

### Voraussetzungen

- Node.js 18+ 
- Python 3.8+
- npm oder yarn

### Frontend (Next.js) einrichten

```bash
cd familienserver
npm install
```

### Backend (Flask) einrichten

```bash
# Erstelle virtuelle Umgebung
python -m venv venv

# Aktiviere virtuelle Umgebung
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Installiere Abhängigkeiten
pip install -r requirements.txt
```

## 🏃‍♂️ Starten

### Entwicklungsumgebung

**Terminal 1: Backend starten**
```bash
python server.py
```
Der Server läuft unter `http://localhost:5000`

**Terminal 2: Frontend starten**
```bash
cd familienserver
npm run dev
```
Das Frontend läuft unter `http://localhost:3000`

### Produktion

**Backend:**
```bash
python server.py --host 0.0.0.0 --port 5000
```

**Frontend:**
```bash
cd familienserver
npm run build
npm run start
```

## 🌐 Netzwerk-Konfiguration

Für die Nutzung im Heimnetzwerk:

1. **Backend URL anpassen**:
   - In `familienserver/app/lib/config.ts`
   - Oder Umgebungsvariable setzen: `NEXT_PUBLIC_API_BASE_URL=http://IHRE_IP:5000`

2. **Firewall öffnen**: Erlaube Port 5000 (Backend) und 3000 (Frontend)

3. **Auf anderen Geräten zugreifen**: 
   - Öffnen Sie `http://IHRE_SERVER_IP:3000` im Browser

## 📁 Datei-Upload

- Einzelne Dateien oder ganze Ordner hochladen
- Alle Dateitypen sind erlaubt
- Maximal 1GB pro Datei (konfigurierbar)
- Dateien werden in `familienserver/public/uploads/` gespeichert

## 🤖 Chatbot

Der Chatbot kann nach Dateien suchen:

- **Beispiele:**
  - "Suche nach Urlaub"
  - "Zeige mir alle PDFs"
  - "Finde Rechnungen"

- **Funktionen:**
  - Dateinamen-Suche
  - Ergebnisvorschau
  - Direkter Download-Link

## 🎨 Design

- iOS Dark Mode Design
- Responsive Layout für alle Geräte
- Touch-optimiert für Tablets und Smartphones
- Barrierefreiheit (WCAG)

## 🔧 Konfiguration

### Backend-Einstellungen

In `server.py` können Sie folgende Parameter anpassen:

```python
UPLOAD_FOLDER = Path('familienserver/public/uploads')  # Upload-Ordner
MAX_CONTENT_LENGTH = 1024 * 1024 * 1024  # Max. Dateigröße (1GB)
```

### Frontend-Einstellungen

In `familienserver/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_UPLOAD_FOLDER=public/uploads
```

## 📊 API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/files` | Liste aller Dateien |
| POST | `/api/upload` | Datei hochladen |
| GET | `/api/download/<filename>` | Datei herunterladen |
| DELETE | `/api/delete/<filename>` | Datei löschen |
| GET | `/api/systeminfo` | Systeminformationen |
| POST | `/api/chat` | Chatbot-Suche |

## 🛡️ Sicherheit

- **Achtung**: Dieser Server ist für den privaten Gebrauch im Heimnetzwerk gedacht
- **Nicht für das öffentliche Internet freigeben**
- **Keine Authentifizierung** in der Standardkonfiguration
- Für sichere Nutzung:
  - Firewall-Konfiguration
  - VPN für externen Zugriff
  - Authentifizierung hinzufügen (z.B. Basic Auth, JWT)

## 🚧 Roadmap

- [x] Next.js Migration
- [x] React Komponenten
- [x] Datei-Upload/Download
- [x] Systemmonitoring
- [x] Grundlegender Chatbot
- [ ] Benutzerauthentifizierung
- [ ] Dateiversionen
- [ ] Datei-Vorschau (Bilder, PDFs)
- [ ] Verschlüsselung
- [ ] Backup-Funktionen
- [ ] Fortgeschrittene Suchfunktionen
- [ ] Sprachsteuerung

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte erstellen Sie einen Pull Request.

## 📜 Lizenz

Dieses Projekt ist für den persönlichen Gebrauch gedacht.

## 📞 Support

Bei Fragen oder Problemen öffnen Sie bitte ein Issue auf GitHub.

---

Erstellt mit ❤️ für Familien
