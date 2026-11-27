# 🗂️ Familienserver

Ein Server für das Heimnetzwerk, auf dem die ganze Familie Dateien hochlädt, sortiert und wiederfindet. Er läuft auf einem Raspberry Pi (ab 3B), einem alten Laptop oder per Docker. Er ist passwortgeschützt, funktioniert auf PC, Handy und Tablet und kommt ohne Cloud aus.

---

## 🚀 Funktionen

**Dateien und Ordner**
- Hochladen von einzelnen Dateien oder ganzen Ordnern, per Knopf oder per Drag & Drop vom Desktop
- Uploads landen im gerade geöffneten Ordner. Gleichnamige Dateien werden nie überschrieben, sondern als „foto (1).jpg“ gespeichert
- Ordner anlegen, umbenennen, verschieben (Zielordner per Klick oder per Drag & Drop auf Ordner und Pfadleiste)
- Mehrfachauswahl: mehrere Dateien gleichzeitig verschieben, löschen oder als ZIP herunterladen
- Liste oder Kacheln mit Vorschaubildern, sortierbar nach Name, Datum oder Größe, mit Filter
- Vorschau direkt im Browser: Fotos (Galerie mit ← →), Videos, Musik, PDFs, Textdateien
- Ordner als ZIP herunterladen. Das Archiv wird beim Herunterladen erzeugt, deshalb gehen auch große Ordner auf dem Pi
- Papierkorb: Gelöschtes kann 30 Tage lang wiederhergestellt werden (einstellbar)
- Die Adresse zeigt den Ordner an (`…/#/Bilder/Urlaub`), dadurch funktionieren Zurück-Taste und Lesezeichen

**Suche („Chatbot“)**
- Sucht in allen Ordnern, regelbasiert und komplett lokal
- Versteht Füllwörter und Dateiarten: „Zeige mir alle PDFs von 2024“, „Bilder vom Urlaub“, „Suche nach Rechnung“

**System**
- Anzeige von CPU, Arbeitsspeicher, freiem Speicherplatz und CPU-Temperatur (Raspberry Pi)

**Sicherheit**
- Gemeinsames Familien-Passwort, die Anmeldung bleibt 30 Tage gespeichert
- Schutz vor Pfad-Tricks (`../`), vor fremden Webseiten (CSRF) und vor Passwort-Raten
- Hochgeladene HTML- und SVG-Dateien werden nie im Browser ausgeführt
- Die Daten liegen außerhalb des Programmordners und gelangen nie ins Git-Repository

---

## ⚡ Schnellstart

Voraussetzungen: **Python 3.9+** und **Node.js 20+**. Node wird nur zum einmaligen Bauen des Frontends gebraucht, siehe [RASPBERRY_PI.md](RASPBERRY_PI.md).

```bash
git clone https://github.com/Christian-Alexander141/Famielenserver.git
cd Famielenserver
./start.sh
```

Beim ersten Start fragt das Skript nach dem Familien-Passwort. Danach richtet es die Python-Umgebung ein, baut das Frontend und startet den Server. Anschließend ist er erreichbar unter:

- auf dem Server selbst: <http://localhost:5000>
- im Heimnetz: `http://<IP-des-Servers>:5000` (das Skript zeigt die Adresse an)

Weitere Befehle:

| Befehl | Wirkung |
|---|---|
| `./start.sh start` | Server starten (ohne Menü) |
| `./start.sh service` | Als Systemdienst einrichten, startet dann automatisch beim Booten |
| `./start.sh password` | Familien-Passwort ändern (alle Geräte müssen sich neu anmelden) |
| `./start.sh build` | Frontend neu bauen |
| `./start.sh dev` | Entwicklungsmodus mit automatischem Neuladen (<http://localhost:3000>) |
| `./backup.sh <Ziel>` | Datensicherung, siehe unten |

Alternativ mit Docker: [DOCKER.md](DOCKER.md).

---

## 🔧 Einstellungen

Alle Einstellungen stehen in der Datei `.env` im Projektordner (Vorlage: [.env.example](.env.example)).

| Variable | Standard | Bedeutung |
|---|---|---|
| `FAMILIENSERVER_PASSWORD` | – (Pflicht) | Gemeinsames Passwort, mindestens 8 Zeichen |
| `FAMILIENSERVER_DATA_DIR` | `./data` | Wo die Dateien liegen, z. B. auf einer USB-Festplatte |
| `FAMILIENSERVER_TRASH_DAYS` | `30` | Tage im Papierkorb (`0` = bis zum manuellen Leeren) |
| `FAMILIENSERVER_MAX_UPLOAD_MB` | `4096` | Maximale Größe pro Datei |
| `FAMILIENSERVER_SECURE_COOKIES` | `0` | `1`, wenn der Server per HTTPS erreichbar ist |
| `FAMILIENSERVER_TRUST_PROXY` | `0` | Anzahl vorgeschalteter Reverse Proxys (nginx, Caddy) |
| `PORT` (nur `start.sh`) | `5000` | Port des Servers |

Nach einer Änderung den Server neu starten (`sudo systemctl restart familienserver` beim Systemdienst).

---

## 💾 Daten und Datensicherung

Alle Familiendateien liegen im Datenordner (Standard `./data`). Der versteckte Unterordner `.familienserver/` enthält Papierkorb, Vorschaubilder und den Sitzungsschlüssel.

Der Papierkorb ist **keine** Datensicherung. Für eine echte Sicherung gibt es `backup.sh`. Es legt datierte Kopien auf einem anderen Datenträger an, und unveränderte Dateien belegen dank Hardlinks keinen zusätzlichen Platz:

```bash
./backup.sh /media/usb/familienserver-backup        # behält die letzten 14 Sicherungen
crontab -e                                           # täglich um 3 Uhr:
# 0 3 * * * /home/pi/Famielenserver/backup.sh /media/usb/familienserver-backup
```

---

## 🔄 Umstieg von Version 1

- **Ein Port statt zwei:** Frontend und API laufen jetzt gemeinsam auf **Port 5000**. Port 3000 wird nur noch im Entwicklungsmodus genutzt. Lesezeichen und Firewall-Regeln bitte anpassen.
- **Passwort:** neu und Pflicht. `./start.sh` fragt beim ersten Start danach.
- **Datenordner:** Dateien aus `familienserver/public/uploads` werden beim ersten Start automatisch nach `data/` verschoben.
- **`NEXT_PUBLIC_API_BASE_URL`** wird nicht mehr gebraucht. Das Frontend spricht die API immer unter derselben Adresse an.
- **Löschen** verschiebt in den Papierkorb, statt sofort endgültig zu löschen.
- **Systemdienste:** Die beiden alten Dienste (Backend und Frontend) durch einen ersetzen, siehe [RASPBERRY_PI.md](RASPBERRY_PI.md#autostart).

---

## 📦 Projektstruktur

```
Famielenserver/
├── backend/                 Flask-Backend
│   ├── __init__.py          App, Fehlerbehandlung, Auslieferung des Frontends
│   ├── api.py               REST-API unter /api
│   ├── auth.py              Anmeldung, CSRF-Schutz, Sperre bei Fehlversuchen
│   ├── storage.py           Dateizugriff, Pfadprüfung, Papierkorb
│   ├── search.py            Dateisuche für den Chatbot
│   ├── system.py            CPU/RAM/Speicher/Temperatur
│   ├── thumbnails.py        Vorschaubilder (Pillow)
│   └── zipstream.py         ZIP-Download ohne Zwischenspeicher
├── familienserver/          Next.js-Frontend (wird statisch nach out/ gebaut)
│   └── app/
│       ├── page.tsx         Hauptseite
│       ├── components/      Dateibrowser, Upload, Suche, Papierkorb, …
│       └── lib/             API-Zugriff, Dateitypen, Upload-Logik
├── tests/                   Backend-Tests (pytest)
├── server.py                Startpunkt für Entwicklung
├── start.sh                 Einrichten und Starten
├── backup.sh                Datensicherung
├── Dockerfile, docker-compose.yml
└── data/                    Familiendateien (nicht im Git-Repository)
```

---

## 🧑‍💻 Entwicklung

```bash
./start.sh dev                              # Backend + Next.js-Dev-Server mit Hot-Reload
venv/bin/pip install -r requirements-dev.txt
venv/bin/python -m pytest                   # Backend-Tests
cd familienserver && npm run lint           # Frontend prüfen
```

Im Entwicklungsmodus leitet Next.js `/api/*` an das Backend auf `127.0.0.1:5000` weiter. Im Betrieb liefert Flask die gebauten Dateien aus `familienserver/out` direkt aus. Das bedeutet einen Prozess und einen Port, und auf dem Pi läuft kein Node.js mit.

### API-Überblick

Alle Endpunkte außer `/api/health`, `/api/session` und `/api/login` erfordern eine Anmeldung. Ändernde Anfragen (POST) brauchen den Header `X-Familienserver: 1`.

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/files?path=` | Ordnerinhalt |
| POST | `/api/upload?dir=&name=` | Datei hochladen (Inhalt als Body, `name` darf Unterordner enthalten) |
| GET | `/api/download?path=[&inline=1]` | Datei herunterladen bzw. anzeigen |
| GET | `/api/zip?path=&path=…` | Ordner oder Auswahl als ZIP |
| GET | `/api/thumbnail?path=` | Vorschaubild |
| POST | `/api/mkdir` `{parent, name}` | Ordner anlegen |
| POST | `/api/rename` `{path, name}` | Umbenennen |
| POST | `/api/move` `{path, destination}` | Verschieben (`destination` = Zielordner) |
| POST | `/api/delete` `{path}` | In den Papierkorb |
| GET/POST | `/api/trash`, `/api/trash/restore`, `/api/trash/delete`, `/api/trash/empty` | Papierkorb |
| POST | `/api/search` `{query}` | Suche |
| GET | `/api/system` | Systemauslastung |

---

## 🤝 Mitwirken

Fehler und Ideen gerne als Issue, Verbesserungen als Pull Request.

## 📜 Lizenz

Dieses Projekt ist für den **persönlichen Gebrauch** gedacht.
