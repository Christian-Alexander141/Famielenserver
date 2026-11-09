# 📸 Screenshots für den Familienserver

Hier können Screenshots des laufenden Familienservers gespeichert werden.

## 📁 Wie Screenshots erstellen und hinzufügen

### 1. Server starten
```bash
cd /home/alex/Dokumente/Github/Famielenserver
source venv/bin/activate
python3 server.py
```

### 2. Frontend starten (in neuem Terminal)
```bash
cd familienserver
npm run dev
```

### 3. Screenshots erstellen

#### **Windows:**
- Drücke `Windows + Shift + S` → Wähle Bereich aus
- Oder verwende Snipping Tool

#### **macOS:**
- Drücke `CMD + Shift + 4` → Wähle Bereich aus
- Oder `CMD + Shift + 3` für ganzen Bildschirm

#### **Linux:**
- Verwende `Flameshot` oder `gnome-screenshot`
- Oder `Shift + PrtScn` für Auswahl

### 4. Screenshots benennen und speichern

| Funktion | Dateiname | Beschreibung |
|----------|-----------|--------------|
| Hauptansicht | `screenshot-main.png` | Übersicht aller Funktionen |
| Dateiliste | `screenshot-files.png` | Dateien und Ordner |
| Upload | `screenshot-upload.png` | Datei-Upload |
| Ordner erstellen | `screenshot-mkdir.png` | Neuer Ordner Dialog |
| Verschieben | `screenshot-move.png` | Verschieben Dialog |
| Systeminfo | `screenshot-system.png` | Systemmonitoring |
| Chatbot | `screenshot-chat.png` | Chatbot |
| Ordnernavigation | `screenshot-nav.png` | Breadcrumb-Navigation |

### 5. Bilder optimieren
- **Format:** PNG oder WebP
- **Größe:** Maximal 1200px Breite
- **Komprimierung:** Verwende Tools wie TinyPNG oder Squoosh

### 6. Bilder in README einbinden

Füge in der `README.md` ein:
```markdown
![Hauptansicht](docs/images/screenshot-main.png)
```

## 🎨 ASCII-Art Darstellungen

Falls keine echten Screenshots verfügbar sind, können diese ASCII-Darstellungen verwendet werden:

### Hauptansicht
```
┌─────────────────────────────────────────────────────────┐
│  🗂️ Familienserver                                    ✅ │
│                                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📤 Dateien/Ordner hochladen                     │ │
│  │ [📁 Dateien auswählen] [⬆️ Hochladen]          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  🏠 Root / Bilder / Urlaub                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📁 Bilder          ⬇️  🗑️                      │ │
│  │ 📁 Dokumente       ⬇️  🗑️                      │ │
│  │ 📄 Urlaub.pdf      ⬇️  🗑️  2.4MB             │ │
│  │ 🖼️ foto1.jpg      ⬇️  🗑️  1.8MB             │ │
│  └───────────────────────────────────────────────────┘ │
│  [📁 Neuer Ordner] [🔄 Aktualisieren]               │
│                                                           │
│  📊 Systemauslastung                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│  │  CPU    │ │  RAM    │ │ Speicher│                 │
│  │  45.2%  │ │  65.4%  │ │  32.1%  │                 │
│  └─────────┘ └─────────┘ └─────────┘                 │
│                                                           │
│  🤖 Chatbot                                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Suche nach Dateien...                          │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📝 Lizenz

Alle Screenshots unterliegen der gleichen Lizenz wie das Hauptprojekt.
