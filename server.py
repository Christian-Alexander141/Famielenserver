"""Familienserver – Startpunkt für Entwicklung und einfache Installationen.

Im Dauerbetrieb (Raspberry Pi, Docker) bitte gunicorn verwenden:

    gunicorn --workers 1 --threads 8 --bind 0.0.0.0:5000 "backend:create_app()"

Siehe README.md.
"""

import argparse
import logging

from backend import create_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Familienserver (Flask)")
    parser.add_argument("--host", default="0.0.0.0", help="Adresse (Standard: 0.0.0.0 = im ganzen Heimnetz erreichbar)")
    parser.add_argument("--port", type=int, default=5000, help="Port (Standard: 5000)")
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Entwicklungsmodus mit automatischem Neuladen. Nur lokal erreichbar (127.0.0.1).",
    )
    args = parser.parse_args()

    app = create_app()
    host = args.host
    if args.debug and host != "127.0.0.1":
        # Der Werkzeug-Debugger erlaubt das Ausführen von Code – niemals im Netz anbieten.
        logging.getLogger("familienserver").warning("Debug-Modus: Server ist nur unter 127.0.0.1 erreichbar.")
        host = "127.0.0.1"
    print(f"Familienserver läuft auf http://{host}:{args.port}")
    app.run(host=host, port=args.port, debug=args.debug, threaded=True)


if __name__ == "__main__":
    main()
