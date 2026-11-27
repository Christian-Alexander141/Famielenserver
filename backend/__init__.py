"""Familienserver-Backend.

Start im Betrieb:   gunicorn "backend:create_app()"
Start zum Testen:   python3 server.py
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import secrets
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import safe_join

from .auth import LoginLimiter
from .config import REPO_ROOT, Settings, migrate_legacy_uploads
from .storage import Storage, StorageError
from .thumbnails import ThumbnailError

log = logging.getLogger("familienserver")

PAGE_CSP = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; "
    "frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
)

FRONTEND_MISSING = (
    "Das Frontend ist noch nicht gebaut.\n\n"
    "Bitte einmal ausführen:\n"
    "    cd frontend && npm ci && npm run build\n\n"
    "oder ./start.sh verwenden.\n"
)


@dataclass
class AppContext:
    settings: Settings
    storage: Storage
    limiter: LoginLimiter


def _secret_key(settings: Settings, storage: Storage) -> str:
    """Schlüssel für Sitzungs-Cookies. Wird einmal erzeugt und gespeichert, damit
    Anmeldungen einen Neustart überleben."""
    if settings.secret_key:
        return settings.secret_key
    key_file = storage.internal / "secret_key"
    if key_file.exists():
        return key_file.read_text(encoding="ascii").strip()
    key = secrets.token_hex(32)
    key_file.write_text(key, encoding="ascii")
    os.chmod(key_file, 0o600)
    return key


LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def _setup_logging(log_dir: Path | None) -> None:
    """Konsole plus rotierende Datei logs/familienserver.log (max. 5 × 1 MB –
    schont die SD-Karte des Raspberry Pi)."""
    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
    root = logging.getLogger()
    for handler in list(root.handlers):
        if getattr(handler, "_familienserver", False):  # bei erneutem create_app nicht doppelt
            root.removeHandler(handler)
            handler.close()
    if log_dir is None:
        return
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        handler = logging.handlers.RotatingFileHandler(
            log_dir / "familienserver.log", maxBytes=1024 * 1024, backupCount=5, encoding="utf-8"
        )
    except OSError as exc:
        log.warning("Log-Ordner %s nicht beschreibbar (%s) – protokolliere nur auf der Konsole.", log_dir, exc)
        return
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    handler._familienserver = True  # type: ignore[attr-defined]
    root.addHandler(handler)


def create_app(overrides: dict | None = None) -> Flask:
    load_dotenv(REPO_ROOT / ".env")  # vorhandene Umgebungsvariablen haben Vorrang

    settings = Settings.from_env(overrides)
    _setup_logging(settings.log_dir)
    if not settings.password:
        raise SystemExit(
            "Kein Passwort gesetzt.\n"
            "Bitte FAMILIENSERVER_PASSWORD in der Datei .env im Projektordner eintragen,\n"
            "z. B.:  echo 'FAMILIENSERVER_PASSWORD=MeinFamilienPasswort' > .env\n"
            "(./start.sh fragt beim ersten Start automatisch danach.)"
        )
    if len(settings.password) < 8:
        log.warning("Das Passwort ist kürzer als 8 Zeichen – bitte ein längeres wählen.")

    migrate_legacy_uploads(settings.data_dir)
    storage = Storage(settings.data_dir, trash_days=settings.trash_days)

    app = Flask(__name__, static_folder=None)
    app.config.update(
        SECRET_KEY=_secret_key(settings, storage),
        MAX_CONTENT_LENGTH=settings.max_upload_mb * 1024 * 1024,
        SESSION_COOKIE_NAME="familienserver_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=settings.secure_cookies,
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    )
    app.json.ensure_ascii = False  # type: ignore[attr-defined]
    app.extensions["familienserver"] = AppContext(settings, storage, LoginLimiter())

    if settings.trust_proxy:
        n = settings.trust_proxy
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=n, x_proto=n, x_host=n)  # type: ignore[method-assign]

    from .api import bp

    app.register_blueprint(bp)
    _register_errors(app)
    _register_frontend(app, settings.frontend_dir)
    _register_headers(app)

    log.info("Datenordner: %s", storage.root)
    return app


def _is_api() -> bool:
    return request.path.startswith("/api/") or request.path == "/api"


def _register_errors(app: Flask) -> None:
    @app.errorhandler(StorageError)
    def storage_error(exc: StorageError):
        return jsonify({"error": exc.message}), exc.status

    @app.errorhandler(ThumbnailError)
    def thumbnail_error(exc: ThumbnailError):
        return jsonify({"error": str(exc)}), 404

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_exc):
        limit_mb = app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
        return jsonify({"error": f"Datei ist zu groß (maximal {limit_mb} MB)"}), 413

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException):
        if not _is_api():
            return exc
        return jsonify({"error": exc.description or exc.name}), exc.code or 500

    @app.errorhandler(Exception)
    def unexpected(exc: Exception):
        log.exception("Unerwarteter Fehler bei %s %s", request.method, request.path)
        return jsonify({"error": "Interner Serverfehler – Details stehen im Server-Log"}), 500


def _register_frontend(app: Flask, frontend_dir: Path) -> None:
    """Liefert das statisch exportierte Next.js-Frontend aus (frontend/out)."""

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            return jsonify({"error": "Unbekannter API-Endpunkt"}), 404
        if path.split("/", 1)[0] == "uploads":
            # Alte Versionen legten Dateien in public/uploads ab; Next.js kopiert diesen
            # Ordner in den Export. Dateien gibt es nur über die API (mit Anmeldung).
            return Response("Nicht gefunden", 404, mimetype="text/plain; charset=utf-8")
        if not (frontend_dir / "index.html").is_file():
            return Response(FRONTEND_MISSING, 503, mimetype="text/plain; charset=utf-8")
        candidates = [path, f"{path}.html", f"{path}/index.html"] if path else ["index.html"]
        for candidate in candidates:
            full = safe_join(str(frontend_dir), candidate)
            if full and os.path.isfile(full):
                response = send_from_directory(frontend_dir, candidate)
                if candidate.startswith("_next/static/"):
                    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
                else:
                    response.headers["Cache-Control"] = "no-cache"
                return response
        if (frontend_dir / "404.html").is_file():
            return send_from_directory(frontend_dir, "404.html"), 404
        return Response("Nicht gefunden", 404, mimetype="text/plain; charset=utf-8")


def _register_headers(app: Flask) -> None:
    @app.after_request
    def security_headers(response: Response) -> Response:
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        if response.mimetype == "text/html":
            response.headers.setdefault("Content-Security-Policy", PAGE_CSP)
        return response
