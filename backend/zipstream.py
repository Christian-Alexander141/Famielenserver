"""ZIP-Archive direkt beim Herunterladen erzeugen, ohne sie im Arbeitsspeicher aufzubauen.

Ein Raspberry Pi mit 1 GB RAM kann so auch Ordner mit mehreren GB ausliefern.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Iterable, Iterator

CHUNK = 1024 * 1024

# Diese Formate sind bereits komprimiert – erneutes Komprimieren kostet nur CPU.
STORED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "mp4", "mov", "m4v", "mkv", "webm", "avi",
    "mp3", "m4a", "aac", "ogg", "flac", "zip", "rar", "7z", "gz", "bz2", "xz", "docx", "xlsx", "pptx",
    "odt", "ods", "odp", "pdf",
}


class _Sink(io.RawIOBase):
    """Nicht-durchsuchbarer Puffer: zipfile schreibt hinein, wir geben die Bytes stückweise ab."""

    def __init__(self) -> None:
        self._buffer = bytearray()

    def writable(self) -> bool:
        return True

    def write(self, b) -> int:  # type: ignore[override]
        self._buffer += b
        return len(b)

    def take(self) -> bytes:
        data = bytes(self._buffer)
        self._buffer.clear()
        return data


def stream_zip(entries: Iterable[tuple[Path, str]]) -> Iterator[bytes]:
    """``entries``: (Pfad auf der Platte, Name im Archiv). Ordner erzeugen eigene Einträge."""
    sink = _Sink()
    with zipfile.ZipFile(sink, mode="w", allowZip64=True) as zf:
        for path, arcname in entries:
            if path.is_dir():
                info = zipfile.ZipInfo.from_file(path, arcname, strict_timestamps=False)
                zf.writestr(info, b"")
                continue
            info = zipfile.ZipInfo.from_file(path, arcname, strict_timestamps=False)
            if path.suffix.lower().lstrip(".") in STORED_EXTENSIONS:
                info.compress_type = zipfile.ZIP_STORED
            else:
                info.compress_type = zipfile.ZIP_DEFLATED  # zlib-Standardstufe 6
            with open(path, "rb") as src, zf.open(info, mode="w") as dst:
                while chunk := src.read(CHUNK):
                    dst.write(chunk)
                    data = sink.take()
                    if data:
                        yield data
            data = sink.take()
            if data:
                yield data
    yield sink.take()
