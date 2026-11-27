"""Dateisystem-Zugriff für den Familienserver.

Alle Pfade, die von außen kommen, laufen durch ``Storage.resolve``. Dort wird
sichergestellt, dass sie innerhalb des Datenordners bleiben. Interne Daten
(Papierkorb, temporäre Uploads, Vorschaubilder) liegen im versteckten Ordner
``.familienserver`` im Datenordner. Namen mit führendem Punkt sind über die API
weder sichtbar noch erreichbar.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import threading
import time
import unicodedata
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterator

INTERNAL_DIR = ".familienserver"
MAX_NAME_BYTES = 255
_TRASH_ID = re.compile(r"^\d+-[0-9a-f]{8}$")


class StorageError(Exception):
    status = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(StorageError):
    status = 404


class ConflictError(StorageError):
    status = 409


def normalize(text: str) -> str:
    """macOS liefert Dateinamen zerlegt (NFD) – für Vergleiche vereinheitlichen."""
    return unicodedata.normalize("NFC", text)


def check_name(name: str) -> str:
    """Prüft einen einzelnen Datei- oder Ordnernamen und gibt ihn normalisiert zurück."""
    if not isinstance(name, str):
        raise StorageError("Ungültiger Name")
    name = normalize(name)
    if not name or not name.strip():
        raise StorageError("Der Name darf nicht leer sein")
    if name != name.strip():
        raise StorageError("Der Name darf nicht mit Leerzeichen beginnen oder enden")
    if name in (".", ".."):
        raise StorageError("Ungültiger Name")
    if name.startswith("."):
        raise StorageError("Namen dürfen nicht mit einem Punkt beginnen")
    if "/" in name or "\\" in name:
        raise StorageError("Der Name darf keine Schrägstriche enthalten")
    if any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise StorageError("Der Name enthält ungültige Zeichen")
    if len(name.encode("utf-8")) > MAX_NAME_BYTES:
        raise StorageError("Der Name ist zu lang")
    return name


def split_path(rel: str | None) -> list[str]:
    """Zerlegt einen relativen Pfad in geprüfte Bestandteile. ``..`` wird abgelehnt."""
    if rel is None:
        return []
    if not isinstance(rel, str):
        raise StorageError("Ungültiger Pfad")
    rel = normalize(rel).replace("\\", "/")
    return [check_name(part) for part in rel.split("/") if part not in ("", ".")]


def is_hidden(name: str) -> bool:
    return name.startswith(".")


@dataclass
class TrashEntry:
    id: str
    name: str
    original_path: str
    type: str
    size: int
    deleted_at: float

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "original_path": self.original_path,
            "type": self.type,
            "size": self.size,
            "deleted_at": self.deleted_at,
        }


class Storage:
    def __init__(self, root: Path, trash_days: int = 30):
        root.mkdir(parents=True, exist_ok=True)
        self.root = root.resolve()
        self.internal = self.root / INTERNAL_DIR
        self.trash_dir = self.internal / "trash"
        self.tmp_dir = self.internal / "tmp"
        self.thumb_dir = self.internal / "thumbs"
        self._ensure_internal()
        self.trash_days = trash_days
        # Ein Prozess, mehrere Threads: Namensvergabe und Umbenennen serialisieren,
        # damit zwei gleichzeitige Uploads nicht denselben Namen bekommen.
        self._lock = threading.Lock()
        self._clean_tmp()

    # ------------------------------------------------------------------ Pfade

    def resolve(self, rel: str | None, *, allow_root: bool = False, must_exist: bool = True) -> Path:
        parts = split_path(rel)
        if not parts and not allow_root:
            raise StorageError("Das Hauptverzeichnis kann nicht verändert werden")
        target = self.root.joinpath(*parts).resolve()
        # resolve() folgt Symlinks – danach muss das Ziel noch im Datenordner liegen.
        if target != self.root and not target.is_relative_to(self.root):
            raise StorageError("Pfad liegt außerhalb des Datenordners")
        if target == self.internal or target.is_relative_to(self.internal):
            raise StorageError("Dieser Pfad ist geschützt")
        if must_exist and not target.exists():
            raise NotFoundError(f"Nicht gefunden: {'/'.join(parts) or '/'}")
        return target

    def resolve_dir(self, rel: str | None) -> Path:
        path = self.resolve(rel, allow_root=True)
        if not path.is_dir():
            raise StorageError("Das Ziel ist kein Ordner")
        return path

    def rel(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    # ---------------------------------------------------------------- Listing

    def entry(self, path: Path) -> dict:
        st = path.stat()
        is_dir = path.is_dir()
        return {
            "name": normalize(path.name),
            "path": normalize(self.rel(path)),
            "type": "directory" if is_dir else "file",
            "size": 0 if is_dir else st.st_size,
            "modified": st.st_mtime,
            "extension": "" if is_dir else path.suffix.lower().lstrip("."),
        }

    def list_dir(self, rel: str | None) -> list[dict]:
        directory = self.resolve_dir(rel)
        items = []
        with os.scandir(directory) as it:
            for de in it:
                if is_hidden(de.name):
                    continue
                try:
                    items.append(self.entry(Path(de.path)))
                except OSError:
                    continue  # z. B. kaputter Symlink
        items.sort(key=lambda x: (x["type"] != "directory", x["name"].casefold()))
        return items

    def walk(self, directory: Path | None = None) -> Iterator[Path]:
        """Alle sichtbaren Dateien und Ordner unterhalb von ``directory``."""
        start = directory or self.root
        for dirpath, dirnames, filenames in os.walk(start):
            dirnames[:] = sorted(d for d in dirnames if not is_hidden(d))
            base = Path(dirpath)
            for d in dirnames:
                yield base / d
            for f in sorted(filenames):
                if not is_hidden(f):
                    yield base / f

    # ------------------------------------------------------------ Änderungen

    @staticmethod
    def unique_path(directory: Path, name: str) -> Path:
        candidate = directory / name
        if not candidate.exists():
            return candidate
        stem, suffix = Path(name).stem, Path(name).suffix
        if not stem:  # z. B. Name ohne Endung
            stem, suffix = name, ""
        counter = 1
        while True:
            candidate = directory / f"{stem} ({counter}){suffix}"
            if not candidate.exists():
                return candidate
            counter += 1

    def _ensure_dirs(self, base: Path, parts: list[str]) -> Path:
        """Legt Unterordner an (für Ordner-Uploads) und prüft jeden Schritt."""
        current = base
        for part in parts:
            current = current / part
            if current.exists() and not current.is_dir():
                raise ConflictError(f"Es gibt bereits eine Datei namens „{part}“")
            current.mkdir(exist_ok=True)
            real = current.resolve()
            if not real.is_relative_to(self.root):
                raise StorageError("Pfad liegt außerhalb des Datenordners")
        return current

    def save_upload(self, target_dir: str | None, relative_name: str, stream: BinaryIO) -> tuple[str, bool]:
        """Speichert eine hochgeladene Datei. Bestehende Dateien werden nie überschrieben:
        bei gleichem Namen wird automatisch „Name (1).ext“ vergeben.

        Gibt den relativen Pfad und ob umbenannt wurde zurück."""
        base = self.resolve_dir(target_dir)
        parts = split_path(relative_name)
        if not parts:
            raise StorageError("Ungültiger Dateiname")

        self._ensure_internal()
        tmp = self.tmp_dir / f"{uuid.uuid4().hex}.part"
        try:
            with open(tmp, "wb") as out:
                shutil.copyfileobj(stream, out, length=1024 * 1024)
            with self._lock:
                parent = self._ensure_dirs(base, parts[:-1])
                final = self.unique_path(parent, parts[-1])
                os.replace(tmp, final)
        finally:
            tmp.unlink(missing_ok=True)
        return normalize(self.rel(final)), final.name != parts[-1]

    def mkdir(self, parent: str | None, name: str) -> str:
        base = self.resolve_dir(parent)
        name = check_name(name)
        with self._lock:
            target = base / name
            if target.exists():
                raise ConflictError(f"„{name}“ existiert bereits")
            target.mkdir()
        return self.rel(target)

    def rename(self, rel: str, new_name: str) -> str:
        source = self.resolve(rel)
        new_name = check_name(new_name)
        target = source.parent / new_name
        with self._lock:
            if target.exists() and not _same_file(source, target):
                raise ConflictError(f"„{new_name}“ existiert bereits")
            os.rename(source, target)
        return self.rel(target)

    def move(self, rel: str, destination: str | None) -> str:
        source = self.resolve(rel)
        dest_dir = self.resolve_dir(destination)
        if source.is_dir() and (dest_dir == source or dest_dir.is_relative_to(source)):
            raise StorageError("Ein Ordner kann nicht in sich selbst verschoben werden")
        if source.parent == dest_dir:
            raise StorageError(f"„{source.name}“ liegt bereits in diesem Ordner")
        target = dest_dir / source.name
        with self._lock:
            if target.exists():
                raise ConflictError(f"Im Zielordner gibt es bereits „{source.name}“")
            shutil.move(str(source), str(target))
        return self.rel(target)

    # ------------------------------------------------------------ Papierkorb

    def trash(self, rel: str) -> TrashEntry:
        source = self.resolve(rel)
        entry = TrashEntry(
            id=f"{int(time.time())}-{uuid.uuid4().hex[:8]}",
            name=normalize(source.name),
            original_path=normalize(self.rel(source)),
            type="directory" if source.is_dir() else "file",
            size=_tree_size(source),
            deleted_at=time.time(),
        )
        self._ensure_internal()
        slot = self.trash_dir / entry.id
        (slot / "data").mkdir(parents=True)
        try:
            with self._lock:
                shutil.move(str(source), str(slot / "data" / source.name))
        except Exception:
            shutil.rmtree(slot, ignore_errors=True)
            raise
        (slot / "meta.json").write_text(json.dumps(entry.to_dict(), ensure_ascii=False), encoding="utf-8")
        return entry

    def _trash_slot(self, trash_id: str) -> Path:
        if not isinstance(trash_id, str) or not _TRASH_ID.match(trash_id):
            raise StorageError("Ungültige Papierkorb-ID")
        slot = self.trash_dir / trash_id
        if not slot.is_dir():
            raise NotFoundError("Eintrag nicht im Papierkorb gefunden")
        return slot

    def _read_entry(self, slot: Path) -> TrashEntry | None:
        try:
            meta = json.loads((slot / "meta.json").read_text(encoding="utf-8"))
            return TrashEntry(**meta)
        except (OSError, ValueError, TypeError):
            return None

    def list_trash(self) -> list[TrashEntry]:
        self._ensure_internal()
        self.purge_trash()
        entries = []
        for slot in self.trash_dir.iterdir():
            entry = self._read_entry(slot)
            if entry:
                entries.append(entry)
        entries.sort(key=lambda e: e.deleted_at, reverse=True)
        return entries

    def restore(self, trash_id: str) -> str:
        slot = self._trash_slot(trash_id)
        entry = self._read_entry(slot)
        if entry is None:
            raise StorageError("Eintrag ist beschädigt und kann nicht wiederhergestellt werden")
        items = list((slot / "data").iterdir()) if (slot / "data").is_dir() else []
        if len(items) != 1:
            raise StorageError("Eintrag ist beschädigt und kann nicht wiederhergestellt werden")
        item = items[0]
        parent_parts = split_path(entry.original_path)[:-1]
        with self._lock:
            parent = self._ensure_dirs(self.root, parent_parts)
            target = self.unique_path(parent, entry.name)
            shutil.move(str(item), str(target))
        shutil.rmtree(slot, ignore_errors=True)
        return self.rel(target)

    def delete_from_trash(self, trash_id: str) -> None:
        shutil.rmtree(self._trash_slot(trash_id))

    def empty_trash(self) -> int:
        self._ensure_internal()
        count = 0
        for slot in list(self.trash_dir.iterdir()):
            shutil.rmtree(slot, ignore_errors=True)
            count += 1
        return count

    def purge_trash(self) -> None:
        """Entfernt Einträge, die älter als ``trash_days`` Tage sind."""
        if self.trash_days <= 0:
            return
        cutoff = time.time() - self.trash_days * 86400
        for slot in list(self.trash_dir.iterdir()):
            entry = self._read_entry(slot)
            deleted_at = entry.deleted_at if entry else slot.stat().st_mtime
            if deleted_at < cutoff:
                shutil.rmtree(slot, ignore_errors=True)

    # --------------------------------------------------------------- Intern

    def _ensure_internal(self) -> None:
        """Interne Ordner bei Bedarf (wieder) anlegen – z. B. nachdem eine externe
        Festplatte neu eingehängt oder der versteckte Ordner gelöscht wurde."""
        for d in (self.trash_dir, self.tmp_dir, self.thumb_dir):
            d.mkdir(parents=True, exist_ok=True)

    def _clean_tmp(self) -> None:
        """Abgebrochene Uploads vom letzten Lauf entfernen."""
        for leftover in self.tmp_dir.glob("*.part"):
            leftover.unlink(missing_ok=True)


def _same_file(a: Path, b: Path) -> bool:
    try:
        return os.path.samefile(a, b)
    except OSError:
        return False


def _tree_size(path: Path) -> int:
    if path.is_file():
        return path.stat().st_size
    total = 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for f in filenames:
            try:
                total += (Path(dirpath) / f).stat().st_size
            except OSError:
                pass
    return total
