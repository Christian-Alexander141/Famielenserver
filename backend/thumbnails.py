"""Vorschaubilder für die Kachelansicht und Galerie.

Pillow ist optional: Ist es nicht installiert, zeigt das Frontend Symbole statt
Vorschaubildern. Erzeugte Bilder werden im versteckten Cache-Ordner abgelegt.
"""

from __future__ import annotations

import hashlib
import threading
from pathlib import Path

try:
    from PIL import Image, ImageOps

    Image.MAX_IMAGE_PIXELS = 80_000_000  # Schutz vor „Dekompressionsbomben“
    AVAILABLE = True
except ImportError:  # pragma: no cover - abhängig von der Installation
    AVAILABLE = False

THUMB_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}
THUMB_SIZE = 320
# Der Pi 3B hat 4 Kerne und 1 GB RAM: höchstens zwei Bilder gleichzeitig verkleinern.
_semaphore = threading.BoundedSemaphore(2)


class ThumbnailError(Exception):
    pass


def supports(path: Path) -> bool:
    return AVAILABLE and path.suffix.lower().lstrip(".") in THUMB_EXTENSIONS


def thumbnail(source: Path, cache_dir: Path) -> Path:
    if not supports(source):
        raise ThumbnailError("Für diese Datei gibt es kein Vorschaubild")
    st = source.stat()
    key = hashlib.sha1(f"{source}|{st.st_mtime_ns}|{st.st_size}".encode()).hexdigest()
    target = cache_dir / key[:2] / f"{key}.jpg"
    if target.exists():
        return target

    with _semaphore:
        if target.exists():
            return target
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".tmp")
        try:
            with Image.open(source) as img:
                img.draft("RGB", (THUMB_SIZE * 2, THUMB_SIZE * 2))  # beschleunigt JPEGs stark
                img = ImageOps.exif_transpose(img)
                img.thumbnail((THUMB_SIZE, THUMB_SIZE))
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGBA")
                    background = Image.new("RGB", img.size, (44, 44, 46))
                    background.paste(img, mask=img.split()[-1])
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(tmp, "JPEG", quality=75, optimize=True)
            tmp.replace(target)
        except (OSError, ValueError, Image.DecompressionBombError) as exc:
            tmp.unlink(missing_ok=True)
            raise ThumbnailError("Vorschaubild konnte nicht erzeugt werden") from exc
    return target
