# Familienserver – Frontend

Next.js-Oberfläche des Familienservers. Sie wird mit `npm run build` als statische Seite nach `out/` exportiert und im Betrieb vom Flask-Backend ausgeliefert. Es läuft also kein eigener Node-Server.

```bash
npm ci
npm run dev     # http://localhost:3000 – leitet /api an das Backend auf 127.0.0.1:5000 weiter
npm run build   # erzeugt out/
npm run lint
```

Das Backend für die Entwicklung startet `../start.sh dev` gleich mit. Gesamtüberblick: [../README.md](../README.md).

## Aufbau

- `app/page.tsx` – Anmeldung, aktueller Ordner (in der URL nach `#`), Abschnitte
- `app/components/` – Dateibrowser, Upload, Vorschau, Dialoge, Suche, Papierkorb, Systemanzeige
- `app/lib/api.ts` – Zugriff auf die API (inkl. CSRF-Header), Upload mit Fortschritt
- `app/lib/files.ts` – Dateitypen, Formatierung, Pfad-Hilfen
- `app/lib/useUploader.ts` – Upload-Warteschlange, Ordner per Drag & Drop
