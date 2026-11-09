#!/bin/bash

# Docker Startskript für Familienserver
# Startet sowohl Next.js Frontend als auch Flask Backend

cd /app

# Backend im Hintergrund starten
python3 server.py > /dev/null 2>&1 &
BACKEND_PID=$!

# Warten bis Backend gestartet ist
echo "Warte auf Backend-Start..."
sleep 5

# Frontend starten
npm run start

# Wenn Frontend beendet wird, auch Backend beenden
kill $BACKEND_PID
