"""Regelbasierte Dateisuche für den Chatbot – komplett lokal, ohne KI-Dienst.

Die Anfrage wird in Wörter zerlegt. Füllwörter („suche“, „zeige“, „alle“ …)
werden ignoriert, Typ-Wörter („Bilder“, „PDFs“, „Videos“ …) filtern nach
Dateiendung, alle übrigen Wörter müssen im Pfad vorkommen.
"""

from __future__ import annotations

import re
from collections import Counter

from .storage import Storage, normalize

CATEGORIES: dict[str, set[str]] = {
    "pdf": {"pdf"},
    "bilder": {"jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "heif", "tif", "tiff"},
    "dokumente": {"pdf", "doc", "docx", "txt", "odt", "rtf", "md"},
    "tabellen": {"xls", "xlsx", "csv", "ods"},
    "präsentationen": {"ppt", "pptx", "odp", "key"},
    "archive": {"zip", "rar", "7z", "tar", "gz"},
    "videos": {"mp4", "mov", "avi", "mkv", "webm", "m4v"},
    "musik": {"mp3", "wav", "ogg", "m4a", "flac", "aac"},
}

KEYWORDS: dict[str, str] = {
    **{w: "pdf" for w in ("pdf", "pdfs")},
    **{w: "bilder" for w in ("bild", "bilder", "foto", "fotos", "photo", "photos", "image", "images")},
    **{w: "dokumente" for w in ("dokument", "dokumente", "dokumenten", "text", "texte", "schreiben", "brief", "briefe")},
    **{w: "tabellen" for w in ("tabelle", "tabellen", "excel")},
    **{w: "präsentationen" for w in ("präsentation", "präsentationen", "praesentation", "folien", "powerpoint")},
    **{w: "archive" for w in ("archiv", "archive", "zips")},
    **{w: "videos" for w in ("video", "videos", "film", "filme", "clip", "clips")},
    **{w: "musik" for w in ("musik", "lied", "lieder", "song", "songs", "audio")},
}

ALL_EXTENSIONS = set().union(*CATEGORIES.values())

STOPWORDS = {
    "suche", "such", "suchen", "finde", "finden", "zeige", "zeig", "zeigen", "gib", "liste", "list",
    "mir", "mich", "mal", "bitte", "alle", "alles", "die", "der", "das", "den", "dem", "des",
    "ein", "eine", "einen", "einer", "meine", "meinen", "meiner", "unsere", "unseren",
    "nach", "von", "vom", "zum", "zur", "mit", "aus", "im", "in", "an", "am", "auf", "für", "fuer",
    "und", "oder", "dateien", "datei", "ordner", "gibt", "es", "ich", "wo", "ist", "sind", "habe",
    "haben", "welche", "was", "wie", "show", "find", "search", "all", "the", "me",
}

MAX_RESULTS = 200


def tokenize(query: str) -> list[str]:
    return re.findall(r"[\w\-]+", normalize(query).casefold())


def search(storage: Storage, query: str) -> dict:
    tokens = tokenize(query or "")
    extensions: set[str] = set()
    terms: list[str] = []
    for token in tokens:
        if token in KEYWORDS:
            extensions |= CATEGORIES[KEYWORDS[token]]
        elif token in ALL_EXTENSIONS:
            extensions.add(token)
        elif token not in STOPWORDS:
            terms.append(token)

    if not terms and not extensions:
        return {
            "query": query,
            "results": [],
            "count": 0,
            "truncated": False,
            "hint": "Versuche z. B. „Urlaub“, „PDFs von 2024“ oder „Bilder vom Geburtstag“.",
        }

    scored = []
    ext_counter: Counter[str] = Counter()
    for path in storage.walk():
        is_dir = path.is_dir()
        ext = "" if is_dir else path.suffix.lower().lstrip(".")
        if ext:
            ext_counter[ext] += 1
        if extensions and (is_dir or ext not in extensions):
            continue
        rel = normalize(storage.rel(path)).casefold()
        if not all(t in rel for t in terms):
            continue
        name = normalize(path.name).casefold()
        # Treffer im Namen zählen mehr als Treffer nur im Ordnerpfad
        score = sum(2 if t in name else 1 for t in terms)
        scored.append((score, is_dir, path))

    scored.sort(key=lambda s: (-s[0], not s[1], s[2].name.casefold()))
    results = []
    for _score, _is_dir, path in scored[:MAX_RESULTS]:
        try:
            results.append(storage.entry(path))
        except OSError:
            continue

    hint = ""
    if not results:
        if ext_counter:
            top = ", ".join(f"{n}× .{e}" for e, n in ext_counter.most_common(3))
            hint = f"Keine Treffer. Vorhanden sind z. B.: {top}"
        else:
            hint = "Es sind noch keine Dateien hochgeladen."

    return {
        "query": query,
        "results": results,
        "count": len(scored),
        "truncated": len(scored) > MAX_RESULTS,
        "hint": hint,
    }
