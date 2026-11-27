# 🍓 Familienserver auf dem Raspberry Pi

Der Familienserver läuft ab einem **Raspberry Pi 3B** (1 GB RAM). Im Betrieb ist es ein einziger Python-Prozess. Node.js wird nur einmal zum Bauen des Frontends gebraucht, und das kann auch ein anderer Rechner übernehmen.

## 📋 Voraussetzungen

| | Minimum | Empfehlung |
|---|---|---|
| Raspberry Pi | 3B | 4 oder 5 |
| System | Raspberry Pi OS Bookworm (Lite reicht) | 64-bit |
| Speicher | SD-Karte 16 GB | Daten auf USB-SSD/-Festplatte |
| Netzwerk | WLAN | LAN-Kabel |

## 1. System vorbereiten

Raspberry Pi OS mit dem [Raspberry Pi Imager](https://www.raspberrypi.com/software/) auf die SD-Karte schreiben. Unter „Einstellungen“ gleich Benutzer, WLAN und SSH einrichten. Danach auf dem Pi:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git python3 python3-venv rsync
```

## 2. Node.js (nur zum Bauen des Frontends)

Next.js braucht **Node.js 20 oder neuer**. Es gibt zwei Wege.

**A) Auf dem Pi bauen** (64-bit-System, ab Pi 4 empfohlen):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Auf dem Pi 3B mit 1 GB RAM dauert der Build mehrere Minuten. Wenn er abbricht, hilft mehr Swap (siehe unten).

**B) Am PC bauen und kopieren** (ideal für den Pi 3B und 32-bit-Systeme, dann braucht der Pi gar kein Node.js):

```bash
# auf dem PC, im Projektordner
cd frontend && npm ci && npm run build
scp -r out pi@<IP-des-Pi>:~/Famielenserver/frontend/
```

`./start.sh` erkennt dann, dass kein npm installiert ist, und nutzt den kopierten Ordner `frontend/out`. Nach jedem Update mit Änderungen am Frontend diesen Schritt wiederholen.

## 3. Installieren und starten

```bash
cd ~
git clone https://github.com/Christian-Alexander141/Famielenserver.git
cd Famielenserver
./start.sh start
```

Beim ersten Start fragt das Skript nach dem Familien-Passwort. Es legt die Python-Umgebung in `venv/` an und baut das Frontend, falls Node.js vorhanden ist. Danach ist der Server unter `http://<IP-des-Pi>:5000` im Heimnetz erreichbar.

Die IP-Adresse zeigt `hostname -I`. Oft funktioniert auch `http://<hostname>.local:5000`, also z. B. `http://raspberrypi.local:5000`.

## <a id="autostart"></a>4. Autostart

```bash
./start.sh service
```

Das richtet den Systemdienst `familienserver` ein, der beim Booten startet und nach Abstürzen neu startet:

```bash
sudo systemctl status familienserver     # läuft er?
tail -f logs/familienserver.log          # Protokoll live ansehen (alle Logs liegen in logs/)
journalctl -u familienserver -f          # Meldungen von systemd selbst
sudo systemctl restart familienserver    # nach Änderungen an .env oder Updates
```

**Umstieg von Version 1:** Falls die alten Dienste noch existieren, diese entfernen:

```bash
sudo systemctl disable --now familienserver-backend familienserver-frontend
sudo rm /etc/systemd/system/familienserver-backend.service /etc/systemd/system/familienserver-frontend.service
sudo systemctl daemon-reload
```

## 5. Feste IP-Adresse

Am einfachsten im **Router** eine feste IP für den Pi vergeben („DHCP-Reservierung“, bei der FRITZ!Box: *Heimnetz → Netzwerk → Gerät bearbeiten → Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen*).

Alternativ auf dem Pi. Bookworm nutzt den NetworkManager, die alte `dhcpcd.conf` gilt dort nicht mehr:

```bash
nmcli connection show                     # Namen der Verbindung herausfinden, z. B. "Wired connection 1"
sudo nmcli connection modify "Wired connection 1" ipv4.method manual \
  ipv4.addresses 192.168.178.50/24 ipv4.gateway 192.168.178.1 ipv4.dns 192.168.178.1
sudo nmcli connection up "Wired connection 1"
```

## 6. Daten auf einer USB-Festplatte

Die SD-Karte ist klein und nutzt sich ab, deshalb gehören die Familiendateien besser auf eine USB-SSD oder -Festplatte.

```bash
lsblk -f                                   # Platte finden, z. B. /dev/sda1
sudo mkfs.ext4 -L familie /dev/sda1        # ⚠️ NUR bei einer leeren/neuen Platte – löscht alles!
sudo mkdir -p /mnt/familie
echo 'LABEL=familie /mnt/familie ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a
sudo mkdir -p /mnt/familie/familienserver && sudo chown "$USER": /mnt/familie/familienserver
```

In der Datei `.env` eintragen:

```ini
FAMILIENSERVER_DATA_DIR=/mnt/familie/familienserver
```

Bestehende Dateien vorher umziehen: Server stoppen, dann `rsync -a data/ /mnt/familie/familienserver/` ausführen.

Damit der Dienst erst startet, wenn die Platte da ist, in `/etc/systemd/system/familienserver.service` unter `[Unit]` die Zeile `RequiresMountsFor=/mnt/familie` ergänzen. Danach `sudo systemctl daemon-reload && sudo systemctl restart familienserver`.

> ext4 wird empfohlen. Mit exFAT/FAT32 (typisch für vorformatierte Platten) funktioniert der Server auch, aber Dateirechte und große Dateien (FAT32: max. 4 GB) sind eingeschränkt.

## 7. Datensicherung

Der Papierkorb schützt vor versehentlichem Löschen, aber nicht vor einer defekten Platte. Deshalb regelmäßig auf einen **zweiten** Datenträger sichern:

```bash
./backup.sh /media/backup/familienserver
crontab -e
# täglich um 3 Uhr:
0 3 * * * /home/pi/Famielenserver/backup.sh /media/backup/familienserver
# Protokoll: ~/Famielenserver/logs/backup.log
```

## 8. Firewall (optional)

```bash
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow from 192.168.0.0/16 to any port 5000 proto tcp   # nur aus dem Heimnetz
sudo ufw enable
```

**Den Server nicht per Portfreigabe ins Internet stellen.** Für den Zugriff von unterwegs ist ein VPN wie WireGuard (in vielen Routern eingebaut) oder Tailscale die sichere Lösung.

## 9. Updates

```bash
cd ~/Famielenserver
git pull
./start.sh build                 # nur nötig, wenn sich das Frontend geändert hat (bzw. am PC bauen)
sudo systemctl restart familienserver
```

Neue Python-Pakete installiert `start.sh` beim nächsten Start automatisch.

## ⚡ Tipps für den Pi 3B

- **Swap vergrößern**, falls der Frontend-Build abbricht: in `/etc/dphys-swapfile` `CONF_SWAPSIZE=1024` setzen, dann `sudo systemctl restart dphys-swapfile`.
- **LAN statt WLAN**: Uploads und Downloads werden deutlich schneller.
- **Kühlkörper verwenden.** Temperatur und Drosselung prüfen mit `vcgencmd measure_temp` und `vcgencmd get_throttled` (`0x0` = alles in Ordnung). Die Temperatur steht auch im Familienserver unter „Systemauslastung“.
- **Netzteil:** Unterspannung (`get_throttled` ≠ `0x0`) führt zu Abstürzen. Das offizielle Netzteil verwenden.

## 🐛 Häufige Probleme

| Problem | Lösung |
|---|---|
| `venv konnte nicht angelegt werden` | `sudo apt install python3-venv` |
| `Kein Passwort gesetzt` | `./start.sh password` |
| Frontend-Build bricht ab („JavaScript heap out of memory“) | Swap vergrößern oder Variante B (am PC bauen) |
| Seite zeigt „Das Frontend ist noch nicht gebaut“ | `./start.sh build` oder `frontend/out` vom PC kopieren (Abschnitt 2 B) |
| Von anderen Geräten nicht erreichbar | Läuft der Dienst? Gleiche IP/Port 5000? Firewall-Regel? |
| `Address already in use` | Alter Dienst läuft noch: `sudo systemctl stop familienserver` bzw. alte v1-Dienste entfernen |
| Platte nach Neustart nicht da | `nofail` in fstab und `RequiresMountsFor` im Dienst setzen (siehe Abschnitt 6) |
