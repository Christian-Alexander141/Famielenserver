"""Systemauslastung aus /proc – ohne zusätzliche Abhängigkeiten, ideal für den Raspberry Pi.

Auf Systemen ohne /proc (z. B. macOS) liefern die Funktionen ``None``.
"""

from __future__ import annotations

import shutil
import threading
import time
from pathlib import Path

_cpu_lock = threading.Lock()
_last_cpu_sample: tuple[float, float, float] | None = None  # (idle, total, zeitpunkt)


def _read_cpu() -> tuple[float, float]:
    with open("/proc/stat", encoding="ascii") as f:
        fields = [float(x) for x in f.readline().split()[1:]]
    idle = fields[3] + (fields[4] if len(fields) > 4 else 0.0)  # idle + iowait
    return idle, sum(fields)


def cpu_percent() -> float | None:
    """CPU-Auslastung seit der letzten Abfrage (bzw. über 0,2 s beim ersten Aufruf)."""
    global _last_cpu_sample
    try:
        with _cpu_lock:
            idle, total = _read_cpu()
            now = time.monotonic()
            last = _last_cpu_sample
            if last is None or now - last[2] > 60:
                time.sleep(0.2)
                last = (idle, total, now)
                idle, total = _read_cpu()
                now = time.monotonic()
            _last_cpu_sample = (idle, total, now)
        d_total = total - last[1]
        if d_total <= 0:
            return 0.0
        return round(max(0.0, min(100.0, 100.0 * (1.0 - (idle - last[0]) / d_total))), 1)
    except (OSError, ValueError, IndexError):
        return None


def memory() -> dict | None:
    try:
        info = {}
        with open("/proc/meminfo", encoding="ascii") as f:
            for line in f:
                key, _, rest = line.partition(":")
                info[key] = int(rest.split()[0]) * 1024
        total = info["MemTotal"]
        available = info.get("MemAvailable", info.get("MemFree", 0) + info.get("Cached", 0))
        used = total - available
        return {"total": total, "used": used, "percent": round(100.0 * used / total, 1)}
    except (OSError, ValueError, KeyError, ZeroDivisionError):
        return None


def disk(path: Path) -> dict | None:
    try:
        usage = shutil.disk_usage(path)
        return {
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
            "percent": round(100.0 * usage.used / usage.total, 1),
        }
    except (OSError, ZeroDivisionError):
        return None


def cpu_temperature() -> float | None:
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", encoding="ascii") as f:
            return round(int(f.read().strip()) / 1000.0, 1)
    except (OSError, ValueError):
        return None


def system_info(data_dir: Path) -> dict:
    return {
        "cpu": cpu_percent(),
        "cpu_temp": cpu_temperature(),
        "memory": memory(),
        "disk": disk(data_dir),
    }
