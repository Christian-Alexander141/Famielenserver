# 🍓 Familienserver auf Raspberry Pi 3B+ installieren

Diese Anleitung erklärt, wie du den Familienserver auf einem **Raspberry Pi 3B/3B+** installierst und betreibst. 
Docker wird **nicht verwendet**, da es zu ressourcenintensiv für den Pi ist.

---

## 📋 Voraussetzungen

### Hardware
- Raspberry Pi 3B oder 3B+ (empfohlen)
- MicroSD-Karte (mindestens **16GB**, besser 32GB)
- Stromversorgung (5V/2.5A)
- Netzwerkverbindung (LAN oder WLAN)

### Software
- **Raspberry Pi OS** (32-bit) Lite oder Desktop
- **Python 3.7+** (vorinstalliert auf Raspberry Pi OS)
- **Node.js 18+** (muss manuell installiert werden)

---

## 🚀 Schritt-für-Schritt Installation

### Schritt 1: Raspberry Pi OS installieren

1. **SD-Karte vorbereiten:**
   - Lade [Raspberry Pi Imager](https://www.raspberrypi.com/software/) herunter
   - Wähle **Raspberry Pi OS Lite (32-bit)** oder **Raspberry Pi OS Desktop (32-bit)**
   - Schreibe das Image auf die SD-Karte

2. **Erstes Booten:**
   - Setze die SD-Karte in den Pi ein
   - Verbinde Monitor, Tastatur, Maus und Netzwerk
   - Boote den Pi

3. **Grundkonfiguration:**
   ```bash
   sudo raspi-config
   ```
   - Passwort ändern
   - Hostname setzen (z.B. `familienserver`)
   - WLAN konfigurieren (falls nötig)
   - Locale und Zeitzone einstellen
   - **Memory Split:** GPU-Speicher auf **16MB** reduzieren (mehr RAM für Anwendungen)
   - **Neustart**

---

### Schritt 2: System aktualisieren

```bash
# Paketlisten aktualisieren
sudo apt update && sudo apt upgrade -y

# Notwendige Pakete installieren
sudo apt install -y git curl build-essential python3-dev python3-venv
```

---

### Schritt 3: Node.js installieren

**Wichtig:** Node.js 18+ ist erforderlich für Next.js. Die Standard-Paketquellen von Raspberry Pi haben oft veraltete Versionen.

#### Methode 1: NodeSource (empfohlen)

```bash
# NodeSource Repository hinzufügen
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js installieren
sudo apt install -y nodejs

# Überprüfen
node --version  # Sollte >= 18 sein
npm --version   # Sollte >= 9 sein
```

#### Methode 2: Manuell (falls NodeSource nicht funktioniert)

```bash
# ARMv7 Build herunterladen
wget https://nodejs.org/dist/v20.12.2/node-v20.12.2-linux-armv7l.tar.xz

# Entpacken
sudo mkdir -p /usr/local/lib/nodejs
sudo tar -xJvf node-v20.12.2-linux-armv7l.tar.xz -C /usr/local/lib/nodejs

# Symlinks erstellen
sudo ln -s /usr/local/lib/nodejs/node-v20.12.2-linux-armv7l/bin/node /usr/local/bin/node
sudo ln -s /usr/local/lib/nodejs/node-v20.12.2-linux-armv7l/bin/npm /usr/local/bin/npm

# Überprüfen
node --version
npm --version
```

---

### Schritt 4: Projekt klonen

```bash
cd ~
git clone https://github.com/dein-benutzername/Famielenserver.git
cd Famielenserver
```

---

### Schritt 5: Backend (Flask) einrichten

```bash
# Virtuelle Python-Umgebung erstellen
python3 -m venv venv

# Virtuelle Umgebung aktivieren
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Testen, ob Backend startet
python3 server.py &

# Backend testen (in neuem Terminal)
curl http://localhost:5000/api/systeminfo

# Backend stoppen (STRG + C oder)
pkill -f "python3 server.py"
```

---

### Schritt 6: Frontend (Next.js) einrichten

```bash
cd familienserver

# Abhängigkeiten installieren
npm install

# Test-Build
npm run build

# Development Modus testen
npm run dev
```

**Hinweis:** Der Build-Prozess kann auf dem Pi 3B **10-15 Minuten** dauern. Sei geduldig!

---

### Schritt 7: Production Setup

Für den Dauerbetrieb empfehle ich den **Production Modus**:

```bash
# Backend im Hintergrund starten
cd ~
source venv/bin/activate
nohup python3 server.py --host 0.0.0.0 --port 5000 > backend.log 2>&1 &

# Frontend im Hintergrund starten
cd familienserver
nohup npm run start -- --port 3000 > frontend.log 2>&1 &
```

---

## 🔧 Systemauslastung für Raspberry Pi

Der Familienserver ist bereits für Raspberry Pi optimiert:

### CPU-Auslastung
- Liest `/proc/stat` (funktioniert auf allen Linux-Systemen)
- Berechnet die Auslastung über zwei Messungen im Abstand von 100ms
- Optimiert für ARM-Prozessoren

### RAM-Auslastung
- Liest `/proc/meminfo`
- Berücksichtigt **Buffers** und **Cached** Memory
- Zeigt den tatsächlichen Speicherverbrauch an

### Festplatten-Auslastung
- Nutzt `shutil.disk_usage('/')`
- Funktioniert mit allen Dateisystemen

---

## 🌐 Netzwerk-Konfiguration

### Statische IP-Adresse setzen (empfohlen)

```bash
sudo nano /etc/dhcpcd.conf
```

Füge am Ende hinzu (passe die Werte an dein Netzwerk an):
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Dann:
```bash
sudo service dhcpcd restart
```

### Firewall öffnen (falls aktiviert)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw enable
```

---

## 📂 Upload-Ordner einrichten

```bash
# Upload-Ordner erstellen (falls nicht existiert)
mkdir -p ~/Famielenserver/familienserver/public/uploads

# Berechtigungen setzen
chmod -R 777 ~/Famielenserver/familienserver/public/uploads
```

### Externen Speicher nutzen (USB-Stick/Festplatte)

1. USB-Laufwerk anschließen
2. Mount-Punkt erstellen:
   ```bash
   sudo mkdir -p /mnt/familienserver
   ```
3. Laufwerk mounten (automatisch oder manuell):
   ```bash
   sudo mount /dev/sda1 /mnt/familienserver
   ```
4. In `server.py` den Upload-Pfad anpassen:
   ```python
   UPLOAD_FOLDER = Path('/mnt/familienserver')
   ```
5. Berechtigungen setzen:
   ```bash
   sudo chmod -R 777 /mnt/familienserver
   ```

---

## 🤖 Chatbot (regelbasiert)

Der Chatbot funktioniert **regelbasiert** ohne externe KI-Modelle:

- **Funktionsweise:** Durchsucht Dateinamen nach Suchbegriffen
- **Keine Abhängigkeiten:** Läuft komplett lokal
- **Schnell:** Keine API-Aufrufe an externe Dienste
- **Datenschutz:** Alle Daten bleiben auf deinem Pi

### Beispiel-Suchen:
- "Suche nach Urlaub" → Finde alle Dateien mit "urlaub" im Namen
- "Zeige PDFs" → Finde alle PDF-Dateien
- "Finde Rechnungen" → Finde alle Dateien mit "rechnung" im Namen

---

## 📊 Performance-Optimierungen für Raspberry Pi 3B

### 1. Swap-Speicher erhöhen

```bash
sudo nano /etc/dphys-swapfile
```

Ändere zu:
```
CONF_SWAPSIZE=2048
```

Dann:
```bash
sudo /etc/init.d/dphys-swapfile restart
```

### 2. ZRAM aktivieren (optional)

```bash
sudo apt install -y zram-config
sudo systemctl restart zram-config
```

### 3. Unnötige Dienste deaktivieren

```bash
# Bluetooth deaktivieren (falls nicht benötigt)
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth

# HDMI deaktivieren (falls headless betrieben)
sudo /opt/vc/bin/tvservice -o
```

### 4. GPU-Speicher reduzieren

```bash
sudo raspi-config
```
- **Advanced Options** → **Memory Split** → **16MB**

---

## ⚡ Autostart-Konfiguration

Damit der Server nach einem Neustart automatisch startet:

### Methode 1: systemd-Service (empfohlen)

Erstelle eine Service-Datei:
```bash
sudo nano /etc/systemd/system/familienserver.service
```

Füge folgenden Inhalt ein:
```ini
[Unit]
Description=Familienserver
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/Famielenserver
Environment="PATH=/home/pi/Famielenserver/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/pi/Famielenserver/start_pi.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Erstelle das Startskript:
```bash
nano ~/Famielenserver/start_pi.sh
```

Inhalt:
```bash
#!/bin/bash

cd /home/pi/Famielenserver

# Backend starten
source venv/bin/activate
python3 server.py --host 0.0.0.0 --port 5000 &
BACKEND_PID=$!

# Warten bis Backend gestartet ist
sleep 5

# Frontend starten
cd familienserver
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000 npm run start -- --port 3000 &

# Warten und PID speichern
sleep 3
wait
```

Skript ausführbar machen:
```bash
chmod +x ~/Famielenserver/start_pi.sh
```

Service aktivieren:
```bash
sudo systemctl daemon-reload
sudo systemctl enable familienserver.service
sudo systemctl start familienserver.service
```

### Methode 2: rc.local (einfacher)

```bash
sudo nano /etc/rc.local
```

Füge vor `exit 0` ein:
```bash
cd /home/pi/Famielenserver
source venv/bin/activate
python3 server.py --host 0.0.0.0 --port 5000 &
sleep 5
cd familienserver
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000 nohup npm run start -- --port 3000 > /dev/null 2>&1 &
```

---

## 🔄 Updates durchführen

### Projekt aktualisieren
```bash
cd ~/Famielenserver
git pull

# Backend-Aktualisierung
source venv/bin/activate
pip install -r requirements.txt

# Frontend-Aktualisierung
cd familienserver
npm install
npm run build
```

---

## 🛠️ Fehlerbehebung

### Problem: Node.js-Build scheitert (Out of Memory)

**Lösung:**
1. Swap-Speicher erhöhen (siehe oben)
2. Build in Schritten durchführen:
   ```bash
   npm install --max-old-space-size=512
   npm run build --max-old-space-size=512
   ```
3. Oder auf einem leistungsfähigeren Rechner bauen und dann kopieren

### Problem: Python-Abhängigkeiten installieren scheitert

**Lösung:**
```bash
# Single-Thread-Installation
pip install --no-cache-dir -r requirements.txt

# Oder Pakete einzeln installieren
pip install flask
pip install psutil
```

### Problem: Port bereits belegt

**Lösung:**
```bash
# Prozess finden
sudo lsof -i :5000
sudo lsof -i :3000

# Prozess beenden
sudo kill -9 PROCESS_ID
```

### Problem: Frontend kann Backend nicht erreichen

**Lösung:**
1. Prüfe, ob Backend läuft:
   ```bash
   curl http://localhost:5000/api/files
   ```
2. Prüfe die API_BASE_URL im Frontend:
   ```bash
   # In familienserver/.env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
   ```
3. Falls im Netzwerk: Verwende die IP-Adresse des Pi

---

## 📈 Systemüberwachung

### CPU-Temperatur prüfen
```bash
vcgencmd measure_temp
```

### Speichernutzung prüfen
```bash
free -h
```

### Festplattennutzung prüfen
```bash
df -h
```

### Laufende Prozesse anzeigen
```bash
top
# oder
htop
```

---

## 💡 Tipps für bessere Performance

1. **Nutze eine schnelle MicroSD-Karte** (UHS-I oder UHS-II)
2. **Führe regelmäßige Reboots durch** (z.B. einmal pro Woche)
3. **Begrenze die Upload-Größe** in `server.py`:
   ```python
   app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
   ```
4. **Nutze eine externe Festplatte** für Uploads
5. **Deaktiviere unnötige Dienste** (Bluetooth, HDMI, etc.)

---

## 📝 Raspberry Pi 3B Spezifikationen

| Komponent | Spezifikation |
|-----------|---------------|
| Prozessor | Broadcom BCM2837B0, Cortex-A53 (ARMv8) 64-bit @ 1.4GHz |
| RAM | 1GB LPDDR2 |
| GPU | Broadcom VideoCore IV |
| Netzwerk | 10/100 Ethernet, 802.11n WLAN |
| USB | 4x USB 2.0 |
| GPIO | 40 Pins |

**Hinweis:** Der Pi 3B hat einen 64-bit-Prozessor, läuft aber standardmäßig mit 32-bit-OS.

---

## 🎯 Fazit

Der Familienserver läuft **perfekt auf dem Raspberry Pi 3B** ohne Docker:

- ✅ **Flask-Backend** - Leichtgewichtig, Python-basiert
- ✅ **Next.js-Frontend** - React, optimiert für ARM
- ✅ **Systemauslastung** - Korrekte Werte für Raspberry Pi
- ✅ **Chatbot** - Regelbasiert, ohne externe Abhängigkeiten
- ✅ **Datei-Upload** - Funktioniert mit allen Dateitypen
- ✅ **Autostart** - Startet automatisch nach Neustart

**Empfohlene Konfiguration:**
- Raspberry Pi 3B+ (besser als 3B)
- 32GB MicroSD-Karte (oder externe Festplatte)
- Statische IP-Adresse
- Autostart über systemd

---

**Viel Erfolg mit deinem Familienserver auf dem Raspberry Pi!** 🍓🎉
