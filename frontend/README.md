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

```
app/
├── page.tsx                 Anmeldung und Seitenaufbau
├── layout.tsx, globals.css  Grundgerüst; Farben (hell/dunkel) und Bausteine wie .btn, .card, .input
├── components/
│   ├── ui/                  Allgemeine Bausteine: Icon, Dialog, ConfirmDialog, ActionMenu, Panel, Toast, feedback
│   ├── files/               Dateibrowser: Liste/Kacheln, Pfadleiste, Upload, Vorschau, Dialoge, FileIcon
│   ├── AppHeader.tsx        Kopfleiste
│   ├── FileSearch.tsx       Dateisuche
│   ├── Trash.tsx            Papierkorb
│   ├── SystemMonitor.tsx    Systemauslastung
│   └── Login.tsx            Anmeldung
└── lib/
    ├── api.ts               Zugriff auf die API (inkl. CSRF-Header), Upload mit Fortschritt
    ├── files.ts             Dateitypen, Formatierung, Pfad-Hilfen
    ├── location.ts          Geöffneter Ordner in der Adresse (#/…)
    └── useUploader.ts       Upload-Warteschlange, Ordner per Drag & Drop
```

Für neue Teile der Oberfläche: Symbole aus `components/ui/Icon.tsx` statt Emojis verwenden und die Farben aus `globals.css` (`bg-surface`, `text-muted`, `border-line`, `bg-accent` …), damit Hell- und Dunkelmodus stimmen.
