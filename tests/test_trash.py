"""Papierkorb: löschen, wiederherstellen, automatisch aufräumen."""

import time

from .helpers import H


def test_trash_and_restore(client, data):
    (data / "Docs").mkdir()
    (data / "Docs" / "rechnung.pdf").write_bytes(b"pdf")
    entry = client.post("/api/delete", json={"path": "Docs/rechnung.pdf"}, headers=H).json
    assert not (data / "Docs" / "rechnung.pdf").exists()
    items = client.get("/api/trash").json["items"]
    assert [i["original_path"] for i in items] == ["Docs/rechnung.pdf"]
    # Ursprünglicher Ordner gelöscht -> wird beim Wiederherstellen neu angelegt
    client.post("/api/delete", json={"path": "Docs"}, headers=H)
    r = client.post("/api/trash/restore", json={"id": entry["id"]}, headers=H)
    assert r.json["path"] == "Docs/rechnung.pdf"
    assert (data / "Docs" / "rechnung.pdf").read_bytes() == b"pdf"


def test_trash_file_named_meta_json(client, data):
    (data / "meta.json").write_text("{}")
    entry = client.post("/api/delete", json={"path": "meta.json"}, headers=H).json
    assert client.post("/api/trash/restore", json={"id": entry["id"]}, headers=H).status_code == 200
    assert (data / "meta.json").read_text() == "{}"


def test_trash_expires(app, client, data):
    storage = app.extensions["familienserver"].storage
    (data / "alt.txt").write_text("x")
    entry = storage.trash("alt.txt")
    meta = storage.trash_dir / entry.id / "meta.json"
    meta.write_text(meta.read_text().replace(str(entry.deleted_at), str(time.time() - 40 * 86400)))
    assert client.get("/api/trash").json["items"] == []
