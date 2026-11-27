"""REST-API unter /api. Pfade kommen als Query-Parameter oder im JSON-Body,
nie als URL-Pfad – so gibt es keine Probleme mit Sonderzeichen oder Normalisierung."""

from __future__ import annotations

import mimetypes
import shutil
from urllib.parse import quote

from flask import Blueprint, Response, current_app, jsonify, request, send_file

from . import auth, search as search_module, system, thumbnails
from .storage import Storage, StorageError, normalize
from .zipstream import stream_zip

bp = Blueprint("api", __name__, url_prefix="/api")

# Nur diese Typen dürfen im Browser angezeigt werden. Alles andere (HTML, SVG, …)
# wird immer als Download ausgeliefert, damit hochgeladene Dateien keinen Code im
# Kontext des Familienservers ausführen können.
INLINE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp",
    "video/mp4", "video/webm", "video/quicktime", "video/ogg",
    "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/flac", "audio/aac",
    "application/pdf", "text/plain",
}
TEXT_EXTENSIONS = {"txt", "md", "csv", "log", "json", "xml", "yml", "yaml", "ini", "conf"}
DISK_RESERVE = 200 * 1024 * 1024  # so viel Platz bleibt immer frei
MAX_ZIP_ITEMS = 1000


def _ctx():
    return current_app.extensions["familienserver"]


def _storage() -> Storage:
    return _ctx().storage


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise StorageError("JSON-Daten erwartet")
    return data


def _field(data: dict, key: str, *, required: bool = True) -> str:
    value = data.get(key, "")
    if value is None:
        value = ""
    if not isinstance(value, str) or (required and not value):
        raise StorageError(f"Feld „{key}“ fehlt oder ist ungültig")
    return value


def _error(status: int, message: str):
    return jsonify({"error": message}), status


def content_disposition(name: str, inline: bool = False) -> str:
    fallback = name.encode("ascii", "ignore").decode().replace('"', "").replace("\\", "") or "download"
    kind = "inline" if inline else "attachment"
    return f"{kind}; filename=\"{fallback}\"; filename*=UTF-8''{quote(name)}"


# ------------------------------------------------------------- Anmeldung


@bp.before_request
def _guard():
    if not auth.csrf_ok():
        return _error(403, "Anfrage blockiert: Sicherheits-Header fehlt")
    if auth.needs_login():
        return _error(401, "Bitte zuerst anmelden")
    return None


@bp.get("/health")
def health():
    return jsonify({"ok": True})


@bp.get("/session")
def session_info():
    return jsonify({
        "authenticated": auth.is_authenticated(),
        "thumbnails": thumbnails.AVAILABLE,
        "max_upload_bytes": current_app.config["MAX_CONTENT_LENGTH"],
        "trash_days": _ctx().settings.trash_days,
    })


@bp.post("/login")
def login():
    limiter = _ctx().limiter
    client = request.remote_addr or "unbekannt"
    if limiter.blocked(client):
        return _error(429, "Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.")
    password = _body().get("password")
    if not isinstance(password, str) or not auth.check_password(password):
        limiter.fail(client)
        current_app.logger.warning("Fehlgeschlagene Anmeldung von %s", client)
        return _error(401, "Falsches Passwort")
    limiter.reset(client)
    auth.log_in()
    return jsonify({"authenticated": True})


@bp.post("/logout")
def logout():
    auth.log_out()
    return jsonify({"authenticated": False})


# --------------------------------------------------------------- Dateien


@bp.get("/files")
def list_files():
    path = request.args.get("path", "")
    storage = _storage()
    directory = storage.resolve_dir(path)
    return jsonify({"path": storage.rel(directory) if directory != storage.root else "", "items": storage.list_dir(path)})


@bp.post("/upload")
def upload():
    """Eine Datei pro Anfrage, Inhalt als rohe Bytes im Body. Das spart auf dem Pi
    das Zwischenspeichern als Multipart-Formular. ``name`` darf Unterordner enthalten
    (Ordner-Upload), ``dir`` ist der Zielordner."""
    storage = _storage()
    if request.content_length is None:
        return _error(411, "Dateigröße fehlt (Content-Length)")
    free = shutil.disk_usage(storage.root).free
    if request.content_length > free - DISK_RESERVE:
        return _error(507, "Nicht genug Speicherplatz auf dem Server")
    target_dir = request.args.get("dir", "")
    name = request.args.get("name", "")
    rel, renamed = storage.save_upload(target_dir, name, request.stream)
    return jsonify({"path": rel, "name": rel.rsplit("/", 1)[-1], "renamed": renamed}), 201


@bp.get("/download")
def download():
    storage = _storage()
    path = storage.resolve(request.args.get("path", ""))
    if path.is_dir():
        raise StorageError("Ordner bitte als ZIP herunterladen")
    ext = path.suffix.lower().lstrip(".")
    mimetype = "text/plain; charset=utf-8" if ext in TEXT_EXTENSIONS else mimetypes.guess_type(path.name)[0]
    mimetype = mimetype or "application/octet-stream"
    inline = request.args.get("inline") == "1" and mimetype.split(";")[0] in INLINE_TYPES
    response = send_file(
        path,
        mimetype=mimetype,
        as_attachment=not inline,
        download_name=normalize(path.name),
        conditional=True,  # ermöglicht Vorspulen in Videos (Range-Anfragen)
        max_age=0,
    )
    if mimetype != "application/pdf":
        response.headers["Content-Security-Policy"] = "sandbox; default-src 'none'; img-src 'self'; media-src 'self'"
    response.headers["Cache-Control"] = "private, no-cache"
    return response


@bp.get("/zip")
def download_zip():
    storage = _storage()
    rels = request.args.getlist("path")
    if not rels:
        raise StorageError("Keine Elemente ausgewählt")
    if len(rels) > MAX_ZIP_ITEMS:
        raise StorageError("Zu viele Elemente ausgewählt")
    items = [storage.resolve(rel, allow_root=True) for rel in rels]

    def entries():
        for item in items:
            base = normalize(item.name) if item != storage.root else "Familienserver"
            if item.is_file():
                yield item, base
                continue
            yield item, base + "/"
            for child in storage.walk(item):
                yield child, f"{base}/{normalize(child.relative_to(item).as_posix())}"

    if len(items) == 1:
        item = items[0]
        if item == storage.root:
            filename = "Familienserver.zip"
        else:
            filename = normalize(item.name if item.is_dir() else (item.stem or item.name)) + ".zip"
    else:
        filename = "Auswahl.zip"
    return Response(
        stream_zip(entries()),
        mimetype="application/zip",
        headers={
            "Content-Disposition": content_disposition(filename),
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",  # nginx soll den Stream nicht puffern
        },
        direct_passthrough=True,
    )


@bp.get("/thumbnail")
def thumbnail():
    storage = _storage()
    source = storage.resolve(request.args.get("path", ""))
    thumb = thumbnails.thumbnail(source, storage.thumb_dir)
    response = send_file(thumb, mimetype="image/jpeg", conditional=True, max_age=7 * 86400)
    response.headers["Cache-Control"] = "private, max-age=604800"
    return response


@bp.post("/mkdir")
def mkdir():
    data = _body()
    rel = _storage().mkdir(_field(data, "parent", required=False), _field(data, "name"))
    return jsonify({"path": rel}), 201


@bp.post("/rename")
def rename():
    data = _body()
    rel = _storage().rename(_field(data, "path"), _field(data, "name"))
    return jsonify({"path": rel})


@bp.post("/move")
def move():
    data = _body()
    rel = _storage().move(_field(data, "path"), _field(data, "destination", required=False))
    return jsonify({"path": rel})


@bp.post("/delete")
def delete():
    """Löschen verschiebt in den Papierkorb."""
    entry = _storage().trash(_field(_body(), "path"))
    return jsonify(entry.to_dict())


# ------------------------------------------------------------ Papierkorb


@bp.get("/trash")
def trash_list():
    storage = _storage()
    return jsonify({"items": [e.to_dict() for e in storage.list_trash()], "retention_days": storage.trash_days})


@bp.post("/trash/restore")
def trash_restore():
    rel = _storage().restore(_field(_body(), "id"))
    return jsonify({"path": rel})


@bp.post("/trash/delete")
def trash_delete():
    _storage().delete_from_trash(_field(_body(), "id"))
    return jsonify({"ok": True})


@bp.post("/trash/empty")
def trash_empty():
    return jsonify({"deleted": _storage().empty_trash()})


# ---------------------------------------------------------- Suche & System


@bp.post("/search")
def search():
    query = _body().get("query", "")
    if not isinstance(query, str):
        raise StorageError("Suchanfrage ungültig")
    return jsonify(search_module.search(_storage(), query[:500]))


@bp.get("/system")
def system_info():
    return jsonify(system.system_info(_storage().root))
