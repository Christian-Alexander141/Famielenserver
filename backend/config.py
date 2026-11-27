"""Einstellungen aus Umgebungsvariablen bzw. der Datei ``.env`` im Projektordner."""

from __future__ import annotations

import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = REPO_ROOT / "data"
# Bis Version 1 lagen die Uploads im damaligen Frontend-Ordner „familienserver/“
LEGACY_UPLOAD_DIR = REPO_ROOT / "familienserver" / "public" / "uploads"
DEFAULT_FRONTEND_DIR = REPO_ROOT / "frontend" / "out"
DEFAULT_LOG_DIR = REPO_ROOT / "logs"

log = logging.getLogger("familienserver")


def _int(name: str, default: int) -> int:
    value = os.environ.get(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        raise SystemExit(f"Ungültiger Wert für {name}: {value!r} (Zahl erwartet)")


def _bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name, "").strip().lower()
    if not value:
        return default
    return value in ("1", "true", "yes", "ja", "on")


@dataclass
class Settings:
    data_dir: Path = DEFAULT_DATA_DIR
    password: str = ""
    secret_key: str = ""
    max_upload_mb: int = 4096
    trash_days: int = 30
    frontend_dir: Path = DEFAULT_FRONTEND_DIR
    secure_cookies: bool = False
    trust_proxy: int = 0
    log_dir: Path | None = DEFAULT_LOG_DIR  # None = nur Konsole

    @classmethod
    def from_env(cls, overrides: dict | None = None) -> "Settings":
        settings = cls(
            data_dir=Path(os.environ.get("FAMILIENSERVER_DATA_DIR") or DEFAULT_DATA_DIR).expanduser(),
            password=os.environ.get("FAMILIENSERVER_PASSWORD", ""),
            secret_key=os.environ.get("FAMILIENSERVER_SECRET_KEY", ""),
            max_upload_mb=_int("FAMILIENSERVER_MAX_UPLOAD_MB", 4096),
            trash_days=_int("FAMILIENSERVER_TRASH_DAYS", 30),
            frontend_dir=Path(os.environ.get("FAMILIENSERVER_FRONTEND_DIR") or DEFAULT_FRONTEND_DIR).expanduser(),
            secure_cookies=_bool("FAMILIENSERVER_SECURE_COOKIES"),
            trust_proxy=_int("FAMILIENSERVER_TRUST_PROXY", 0),
            log_dir=Path(os.environ.get("FAMILIENSERVER_LOG_DIR") or DEFAULT_LOG_DIR).expanduser(),
        )
        for key, value in (overrides or {}).items():
            setattr(settings, key, value)
        return settings


def migrate_legacy_uploads(data_dir: Path) -> None:
    """Frühere Versionen speicherten Dateien in ``familienserver/public/uploads`` – also
    im Frontend-Ordner und damit im Git-Repository. Beim ersten Start werden sie in den
    Datenordner verschoben (nur wenn dieser noch leer ist)."""
    if not LEGACY_UPLOAD_DIR.is_dir() or data_dir.resolve() != DEFAULT_DATA_DIR.resolve():
        return
    legacy_items = [p for p in LEGACY_UPLOAD_DIR.iterdir() if not p.name.startswith(".")]
    if not legacy_items:
        return
    if data_dir.exists() and any(not p.name.startswith(".") for p in data_dir.iterdir()):
        log.warning(
            "Im alten Upload-Ordner %s liegen noch Dateien, der neue Datenordner %s ist aber nicht leer. "
            "Bitte die Dateien von Hand verschieben.",
            LEGACY_UPLOAD_DIR,
            data_dir,
        )
        return
    data_dir.mkdir(parents=True, exist_ok=True)
    for item in legacy_items:
        shutil.move(str(item), str(data_dir / item.name))
    shutil.rmtree(LEGACY_UPLOAD_DIR, ignore_errors=True)  # nur noch versteckte Reste wie .DS_Store
    log.warning("%d Elemente aus %s nach %s verschoben.", len(legacy_items), LEGACY_UPLOAD_DIR, data_dir)
