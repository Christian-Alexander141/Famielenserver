#!/bin/bash

# Familienserver Start Skript
# Dies Skript startet sowohl das Backend (Flask) als auch das Frontend (Next.js)

# Speichere das aktuelle Arbeitsverzeichnis
START_DIR=$(pwd)

# Ermittle das Verzeichnis, in dem dieses Skript liegt
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🗂️  Familienserver Start Skript"
echo "=========================================="
echo "Skript-Verzeichnis: $SCRIPT_DIR"
echo "Aktuelles Verzeichnis: $START_DIR"
echo ""

# Überprüfe ob Python installiert ist
if ! command -v python3 &> /dev/null; then
    echo "❌ Fehler: Python 3 ist nicht installiert"
    echo "   Bitte installieren Sie Python 3.8 oder neuer"
    exit 1
fi

# Überprüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "❌ Fehler: Node.js ist nicht installiert"
    echo "   Bitte installieren Sie Node.js 18 oder neuer"
    exit 1
fi

# Überprüfe ob npm installiert ist
if ! command -v npm &> /dev/null; then
    echo "❌ Fehler: npm ist nicht installiert"
    echo "   Bitte installieren Sie npm (kommt normalerweise mit Node.js)"
    exit 1
fi

echo "✅ Voraussetzungen geprüft"
echo ""

# Optionen anzeigen
echo "Wählen Sie eine Option:"
echo "1) Nur Backend starten (Flask Server)"
echo "2) Nur Frontend starten (Next.js Dev Server)"
echo "3) Beide starten (Backend + Frontend)"
echo "4) Beenden"
echo ""

read -p "Option (1-4): " option

echo ""

case $option in
    1)
        echo "🚀 Starte Backend Server (Port 5000)..."
        echo "   Drücken Sie STRG+C zum Beenden"
        echo ""
        cd "$SCRIPT_DIR"
        python3 server.py
        ;;
    2)
        echo "🚀 Starte Frontend Server (Port 3000)..."
        echo "   Drücken Sie STRG+C zum Beenden"
        echo ""
        cd "$SCRIPT_DIR/familienserver"
        npm run dev
        ;;
    3)
        echo "🚀 Starte Backend und Frontend..."
        echo ""
        echo "Backend läuft auf: http://localhost:5000"
        echo "Frontend läuft auf: http://localhost:3000"
        echo ""
        echo "Drücken Sie STRG+C zum Beenden beider Server"
        echo ""
        
        # Backend in Hintergrund starten
        cd "$SCRIPT_DIR"
        python3 server.py > backend.log 2>&1 &
        BACKEND_PID=$!
        echo "Backend gestartet (PID: $BACKEND_PID)"
        
        # Warten bis Backend gestartet ist
        sleep 3
        
        # Frontend starten
        cd "$SCRIPT_DIR/familienserver"
        npm run dev > frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo "Frontend gestartet (PID: $FRONTEND_PID)"
        
        # Auf beide Prozesse warten
        wait $BACKEND_PID $FRONTEND_PID
        
        # Prozesse beenden wenn Skript beendet wird
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        ;;
    4)
        echo "👋 Auf Wiedersehen!"
        exit 0
        ;;
    *)
        echo "❌ Ungültige Option"
        exit 1
        ;;
esac
