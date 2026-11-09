# 🍓 Raspberry Pi 3B Anleitung für Familienserver

> **⚠️ WICHTIG:** Docker wird **Nicht empfohlen** für den Raspberry Pi 3B, da dieser nicht genug Ressourcen hat. Diese Anleitung zeigt die **direkte Installation ohne Docker**.

---

## 📋 **Systemanforderungen**

| Komponent | Anforderung | Empfehlung |
|-----------|-------------|------------|
| **Raspberry Pi** | 3B, 3B+, 4 oder neuer | Raspberry Pi 4 (4GB RAM) |
| **Betriebssystem** | Raspberry Pi OS (32-bit oder 64-bit) | Raspberry Pi OS Lite |
| **Speicherkarte** | Mindestens 8GB | 16GB oder mehr |
| **Speicherplatz** | Mindestens 2GB frei | 4GB+ für Uploads |
| **Netzwerk** | LAN oder WiFi | LAN für bessere Performance |

---

## 🚀 **Schnellstart (empfohlen)**

### 1. Raspberry Pi OS installieren

1. **Raspberry Pi OS Lite** herunterladen:
   ```bash
   # Auf deinem Computer (nicht auf dem Pi)
   wget https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-2024-03-15/2024-03-15-raspios-bookworm-armhf-lite.img.xz
   ```

2. **SD-Karte schreiben** (mit Raspberry Pi Imager oder `dd`):
   ```bash
   # Auf deinem Computer
   sudo dd if=2024-03-15-raspios-bookworm-armhf-lite.img.xz of=/dev/sdX bs=4M status=progress
   ```

3. **SD-Karte einlegen und Pi starten**

---

### 2. System aktualisieren

```bash
# Nach dem ersten Start auf dem Raspberry Pi
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

---

### 3. Abhängigkeiten installieren

```bash
# Node.js 18+ installieren (für Next.js)
# Die offizielle Node.js Version für Raspberry Pi
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.8+ installieren (für Flask)
# Auf Raspberry Pi OS ist Python 3 bereits installiert
# Falls nötig, aktualisieren:
sudo apt install -y python3 python3-pip python3-venv

# Git installieren (für Updates)
sudo apt install -y git

# System-Tools für Monitoring
sudo apt install -y htop psmisc procps
```

---

### 4. Familienserver installieren

#### **Option A: Klonen aus GitHub**

```bash
# In dein Home-Verzeichnis
git clone https://github.com/<DEIN_BENUTZERNAME>/Famielenserver.git
cd Famielenserver
```

#### **Option B: Manuell kopieren**

1. Kopiere alle Projektdateien auf den Raspberry Pi:
   ```bash
   # Auf deinem Computer
   scp -r /home/alex/Dokumente/Github/Famielenserver pi@<PI_IP>:/home/pi/
   ```

2. Auf dem Raspberry Pi:
   ```bash
   cd /home/pi/Famielenserver
   ```

---

### 5. Backend (Flask) einrichten

```bash
# Virtuelle Python-Umgebung erstellen
python3 -m venv venv

# Umgebung aktivieren
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt
```

---

### 6. Frontend (Next.js) einrichten

```bash
# In das Frontend-Verzeichnis wechseln
cd familienserver

# Abhängigkeiten installieren
npm install

# Zurück zum Hauptverzeichnis
cd ..
```

---

### 7. Familienserver starten

#### **Option A: Mit start.sh Skript**

```bash
# Skript ausführbar machen
chmod +x start.sh

# Skript ausführen
./start.sh
```

**Wähle dann Option 3:** "Beide starten (Backend + Frontend)"

#### **Option B: Manuell starten**

**Terminal 1 (Backend):**
```bash
# In einem Terminal
source venv/bin/activate
python3 server.py --host 0.0.0.0 --port 5000
```

**Terminal 2 (Frontend):**
```bash
# In einem zweiten Terminal
cd familienserver
npm run start
```

---

## 🌐 **Zugriff auf den Server**

| Dienst | Port | URL |
|--------|------|-----|
| Frontend | 3000 | `http://<PI_IP>:3000` |
| Backend API | 5000 | `http://<PI_IP>:5000` |

### **IP-Adresse des Raspberry Pi finden**

```bash
# Auf dem Raspberry Pi
hostname -I

# Oder
ip a
```

### **Firewall konfigurieren**

Falls die Firewall aktiviert ist:

```bash
# Port 3000 und 5000 freigeben
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw enable
```

---

## 🔧 **Autostart konfigurieren**

Damit der Server nach einem Neustart automatisch startet:

### **Option A: Mit systemd (empfohlen)**

1. **Backend-Service erstellen:**

```bash
# /etc/systemd/system/familienserver-backend.service
sudo nano /etc/systemd/system/familienserver-backend.service
```

```ini
[Unit]
Description=Familienserver Backend (Flask)
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/Famielenserver
Environment="PATH=/home/pi/Famielenserver/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/pi/Famielenserver/venv/bin/python /home/pi/Famielenserver/server.py --host 0.0.0.0 --port 5000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

2. **Frontend-Service erstellen:**

```bash
sudo nano /etc/systemd/system/familienserver-frontend.service
```

```ini
[Unit]
Description=Familienserver Frontend (Next.js)
After=network.target familienserver-backend.service

[Service]
User=pi
WorkingDirectory=/home/pi/Famielenserver/familienserver
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/usr/bin/npx serve -s /home/pi/Famielenserver/familienserver/.next -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> **Hinweis:** Für das Frontend wird `serve` benötigt. Falls nicht installiert:
> ```bash
> sudo npm install -g serve
> ```

3. **Next.js Build vor dem Start erstellen:**

```bash
cd /home/pi/Famielenserver/familienserver
npm run build
cd ..
```

4. **Services aktivieren und starten:**

```bash
# Services laden
sudo systemctl daemon-reload

# Services aktivieren (Autostart)
sudo systemctl enable familienserver-backend.service
sudo systemctl enable familienserver-frontend.service

# Services starten
sudo systemctl start familienserver-backend.service
sudo systemctl start familienserver-frontend.service

# Status prüfen
sudo systemctl status familienserver-backend.service
sudo systemctl status familienserver-frontend.service
```

---

### **Option B: Mit rc.local (einfacher)**

```bash
# rc.local bearbeiten
sudo nano /etc/rc.local
```

Füge **vor** `exit 0` ein:

```bash
# Familienserver Backend starten
su pi -c "cd /home/pi/Famielenserver && source venv/bin/activate && python server.py --host 0.0.0.0 --port 5000 &"

# Warten bis Backend gestartet ist
sleep 5

# Familienserver Frontend starten
su pi -c "cd /home/pi/Famielenserver/familienserver && /usr/bin/npx serve -s .next -p 3000 &"

# Datei ausführbar machen
chmod +x /etc/rc.local
```

---

## ⚡ **Performance-Optimierungen für Raspberry Pi 3B**

### 1. **Maximale Dateigröße reduzieren**

In `server.py`:

```python
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB statt 1GB
```

### 2. **Swappiness erhöhen**

```bash
# Swappiness auf 60 setzen (standardmäßig 60, kann auf 10 reduziert werden)
sudo sysctl vm.swappiness=10

# Permanent machen
sudo nano /etc/sysctl.conf
# vm.swappiness=10 hinzufügen
```

### 3. **Swap-Datei erweitern**

```bash
# Aktuelle Swap-Datei deaktivieren
sudo dphys-swapfile swapoff

# Swap-Datei konfigurieren (auf 2GB erhöhen)
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048 setzen

# Swap-Datei neu aktivieren
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 4. **Node.js Memory-Limit anpassen**

```bash
# In familienserver/package.json
# "scripts" ändern:
# "start": "NODE_OPTIONS=--max-old-space-size=512 next start"
```

### 5. **Flask Threads begrenzen**

In `server.py`:

```python
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
```

---

## 📊 **System-Monitoring auf dem Raspberry Pi**

### **CPU-Temperatur prüfen**

```bash
# Aktuelle Temperatur
vcgencmd measure_temp

# Oder
cat /sys/class/thermal/thermal_zone0/temp
```

### **Systemauslastung prüfen**

```bash
# Echtzeit-Ansicht (Strg+C zum Beenden)
htop

# Oder
watch -n 1 "vcgencmd get_throttled; vcgencmd measure_temp; free -h; df -h"
```

### **Log-Dateien prüfen**

```bash
# Backend-Logs
journalctl -u familienserver-backend.service -f

# Frontend-Logs
journalctl -u familienserver-frontend.service -f
```

---

## 🔌 **Netzwerk-Konfiguration**

### **Statische IP-Adresse setzen (empfohlen)**

```bash
# dhcpcd.conf bearbeiten
sudo nano /etc/dhcpcd.conf
```

Füge am Ende hinzu:

```ini
# Statische IP für Ethernet
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Oder für WiFi
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

### **DNS-Konfiguration**

```bash
# Resolv.conf bearbeiten
sudo nano /etc/resolv.conf
```

Füge hinzu:

```
nameserver 8.8.8.8
nameserver 8.8.4.4
```

---

## 🛡️ **Sicherheit**

### **1. Standard-Passwort ändern**

```bash
passwd pi
```

### **2. SSH sichern**

```bash
# SSH-Konfiguration bearbeiten
sudo nano /etc/ssh/sshd_config
```

Ändere oder füge hinzu:

```ini
Port 2222                   # Standard-Port ändern
PermitRootLogin no          # Root-Login verbieten
PasswordAuthentication no   # Nur Key-basierte Authentifizierung
```

### **3. Fail2Ban installieren**

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **4. Firewall (ufw) aktivieren**

```bash
# Nur notwendige Ports freigeben
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp       # SSH
sudo ufw allow 3000/tcp       # Frontend
sudo ufw allow 5000/tcp       # Backend
sudo ufw enable
```

### **5. Upload-Ordner sichern**

```bash
# Upload-Ordner erstellen (falls noch nicht vorhanden)
mkdir -p /home/pi/Famielenserver/familienserver/public/uploads

# Berechtigungen setzen
chown -R pi:pi /home/pi/Famielenserver
chmod -R 750 /home/pi/Famielenserver
```

---

## 🗃️ **Speicherverwaltung**

### **1. Externe Festplatte mounten**

```bash
# USB-Festplatte anschließen
lsblk

# Partition formatieren (falls nötig)
sudo mkfs.ext4 /dev/sda1

# Mount-Punkt erstellen
sudo mkdir /mnt/uploads

# Festplatte mounten
sudo mount /dev/sda1 /mnt/uploads

# Automatisch mounten bei Start
sudo nano /etc/fstab
```

Füge hinzu:

```
/dev/sda1 /mnt/uploads ext4 defaults,auto,users,rw,nofail 0 0
```

### **2. Upload-Ordner auf externe Festplatte umleiten**

In `server.py`:

```python
UPLOAD_FOLDER = Path('/mnt/uploads')
```

---

## 🔄 **Updates und Wartung**

### **System Updates**

```bash
# Regelmäßig ausführen
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

### **Projekt Updates**

```bash
# In das Projektverzeichnis wechseln
cd /home/pi/Famielenserver

# Updates von GitHub holen
git pull origin main

# Frontend-Updates
cd familienserver
npm install
npm run build
cd ..

# Backend-Updates
source venv/bin/activate
pip install -r requirements.txt

# Services neu starten
sudo systemctl restart familienserver-backend.service
sudo systemctl restart familienserver-frontend.service
```

### **Logs bereinigen**

```bash
# System-Logs bereinigen
sudo journalctl --vacuum-size=100M

# NPM-Logs bereinigen
npm cache clean --force
```

---

## 📝 **Häufige Probleme und Lösungen**

### **Problem: Node.js zu langsam**

**Lösung:** Node.js Version prüfen und ggf. neu installieren:

```bash
node -v  # Sollte 18+ sein
npm -v   # Sollte 8+ sein

# Falls nötig, Node.js neu installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

---

### **Problem: Python Abhängigkeiten fehlen**

**Lösung:** Virtuelle Umgebung neu erstellen:

```bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### **Problem: Nicht genug Speicher**

**Lösung:**

1. **Swap-Datei erweitern** (siehe Performance-Optimierungen)
2. **Maximale Dateigröße reduzieren**
3. **Unnötige Dateien löschen:**

```bash
# Node.js Cache bereinigen
npm cache clean --force

# Unnötige Python-Pakete bereinigen
pip cache purge

# System temporäre Dateien bereinigen
sudo apt clean
sudo apt autoclean
```

---

### **Problem: Services starten nicht**

**Lösung:**

```bash
# Logs prüfen
sudo journalctl -u familienserver-backend.service -xe
sudo journalctl -u familienserver-frontend.service -xe

# Manuell testen
source venv/bin/activate
python3 server.py
```

---

### **Problem: Frontend baut nicht**

**Lösung:**

```bash
# In familienserver-Verzeichnis
cd /home/pi/Famielenserver/familienserver

# Node.js Cache bereinigen
rm -rf .next node_modules
npm cache clean --force

# Abhängigkeiten neu installieren
npm install

# Neu bauen
npm run build
```

---

### **Problem: Port bereits in Verwendung**

**Lösung:**

```bash
# Welche Prozesse nutzen Port 3000 oder 5000?
sudo lsof -i :3000
sudo lsof -i :5000

# Prozess beenden
kill -9 <PID>
```

---

## 📊 **Hardware-Empfehlungen**

| Komponent | Raspberry Pi 3B | Raspberry Pi 3B+ | Raspberry Pi 4 (2GB) | Raspberry Pi 4 (4GB) | Raspberry Pi 5 |
|-----------|----------------|------------------|----------------------|----------------------|----------------|
| **Performance** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Max. Benutzer** | 2-3 | 3-5 | 5-10 | 10-20 | 20+ |
| **Max. Dateigröße** | 100MB | 200MB | 500MB | 1GB | 2GB+ |
| **Empfohlen für** | Test | Kleine Familie | Familie | Große Familie | Produktion |

---

## 💡 **Tipps für bessere Performance**

1. **Verwende LAN statt WiFi** - Schnellere und stabilere Verbindung
2. **Aktiviere CPU-Übertaktung** (nur für erfahrene Benutzer)
3. **Verwende eine SSD** mit USB-Adapter für schnelleren Speicher
4. **Reduziere gleichzeitige Uploads** auf 1-2 Dateien
5. **Verwende Komprimierung** für große Dateien
6. **Deaktiviere nicht benötigte Dienste** auf dem Pi
7. **Nutze einen Kühlkörper** für bessere CPU-Leistung

---

## 🌡️ **CPU-Temperatur überwachen**

```bash
# Temperatur in Echtzeit anzeigen
watch -n 1 vcgencmd measure_temp

# Throttling prüfen (wichtig!)
vcgencmd get_throttled
```

**Erklärung der Throttling-Codes:**
- `0` = Kein Throttling (gut)
- `1` = Under-voltage
- `2` = Arm frequency capped
- `4` = Throttling wegen hoher Temperatur
- `8` = Soft temperature limit

**Lösung bei Throttling:**
- Kühlkörper anbringen
- Lüfter installieren
- Gehäuse öffnen oder bessere Belüftung
- CPU-Frequenz begrenzen

---

## 📚 **Dokumentation**

- [Haupt-Dokumentation (README.md)](README.md)
- [Docker-Anleitung (DOCKER.md)](DOCKER.md)
- [Anleitung ohne Docker (ohne_docker.md)](ohne_docker.md)
- [API-Dokumentation](API.md)

---

## 🤝 **Community & Support**

Bei Problemen oder Fragen:
1. **Logs prüfen** (siehe oben)
2. **Systemauslastung prüfen** (`htop`, `vcgencmd measure_temp`)
3. **Fehlerbeschreibung aufschreiben** (genaue Fehlermeldung)
4. **Raspberry Pi Modell und OS-Version angeben**

---

## 📜 **Lizenz**

Dieses Projekt ist für den persönlichen Gebrauch im Heimnetzwerk gedacht.

---

## 🎯 **Zusammenfassung**

✅ **Empfohlen für Raspberry Pi 3B:** Direkte Installation ohne Docker
✅ **Maximale Dateigröße:** 100-200MB
✅ **Gleichzeitige Benutzer:** 2-5
✅ **Performance:** Gut für kleine Familien
✅ **Speicher:** 8GB+ SD-Karte

🚀 **Für bessere Performance:** Raspberry Pi 4 (2GB+) verwenden

---

*Erstellt mit ❤️ für Familien und Raspberry Pi Enthusiasten*