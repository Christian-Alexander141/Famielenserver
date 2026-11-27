"""Dateien: hochladen, umbenennen, verschieben, herunterladen, Vorschaubilder, Suche."""

import io
import zipfile

import pytest

from .helpers import H, upload


def test_upload_into_subfolder_and_folder_upload(client, data):
    client.post("/api/mkdir", json={"parent": "", "name": "Urlaub"}, headers=H)
    assert upload(client, "strand.jpg", directory="Urlaub").status_code == 201
    assert upload(client, "Ordner/Unter/datei.txt", directory="Urlaub").status_code == 201
    assert (data / "Urlaub" / "strand.jpg").exists()
    assert (data / "Urlaub" / "Ordner" / "Unter" / "datei.txt").exists()


def test_upload_never_overwrites(client, data):
    upload(client, "foto.jpg", b"eins")
    r = upload(client, "foto.jpg", b"zwei")
    assert r.json == {"path": "foto (1).jpg", "name": "foto (1).jpg", "renamed": True}
    assert (data / "foto.jpg").read_bytes() == b"eins"


def test_umlauts_are_kept(client, data):
    r = upload(client, "Größe März.pdf")
    assert r.json["path"] == "Größe März.pdf"


def test_rename_move_and_conflicts(client, data):
    (data / "A").mkdir()
    (data / "B").mkdir()
    (data / "a.txt").write_text("x")
    assert client.post("/api/rename", json={"path": "a.txt", "name": "b.txt"}, headers=H).status_code == 200
    assert client.post("/api/move", json={"path": "b.txt", "destination": "A"}, headers=H).json["path"] == "A/b.txt"
    # zurück ins Hauptverzeichnis
    assert client.post("/api/move", json={"path": "A/b.txt", "destination": ""}, headers=H).status_code == 200
    # Ordner nicht in sich selbst
    assert client.post("/api/move", json={"path": "A", "destination": "A"}, headers=H).status_code == 400
    (data / "A" / "Sub").mkdir()
    assert client.post("/api/move", json={"path": "A", "destination": "A/Sub"}, headers=H).status_code == 400
    # Konflikt
    (data / "B" / "b.txt").write_text("y")
    assert client.post("/api/move", json={"path": "b.txt", "destination": "B"}, headers=H).status_code == 409


def test_listing_and_download(client, data):
    upload(client, "b.txt")
    client.post("/api/mkdir", json={"name": "Zeta"}, headers=H)
    items = client.get("/api/files").json["items"]
    assert [i["name"] for i in items] == ["Zeta", "b.txt"]
    assert items[1]["extension"] == "txt"
    r = client.get("/api/download", query_string={"path": "b.txt"})
    assert r.data == b"inhalt"


def test_zip_download_streams_folder(client, data):
    (data / "Urlaub" / "Tag 1").mkdir(parents=True)
    (data / "Urlaub" / "Tag 1" / "a.jpg").write_bytes(b"a" * 1000)
    (data / "Urlaub" / "notiz.txt").write_text("hallo")
    (data / "Urlaub" / ".versteckt").write_text("nein")
    r = client.get("/api/zip", query_string={"path": "Urlaub"})
    assert r.status_code == 200
    assert "Urlaub.zip" in r.headers["Content-Disposition"]
    with zipfile.ZipFile(io.BytesIO(r.data)) as zf:
        names = set(zf.namelist())
        assert {"Urlaub/", "Urlaub/Tag 1/", "Urlaub/Tag 1/a.jpg", "Urlaub/notiz.txt"} <= names
        assert "Urlaub/.versteckt" not in names
        assert zf.read("Urlaub/notiz.txt") == b"hallo"


def test_thumbnail(client, data):
    pil = pytest.importorskip("PIL.Image")
    pil.new("RGB", (1200, 800), (200, 30, 30)).save(data / "gross.jpg")
    r = client.get("/api/thumbnail", query_string={"path": "gross.jpg"})
    assert r.status_code == 200 and r.mimetype == "image/jpeg"
    assert max(pil.open(io.BytesIO(r.data)).size) == 320
    assert client.get("/api/thumbnail", query_string={"path": "gross.jpg"}).status_code == 200  # aus dem Cache
    upload(client, "text.txt")
    assert client.get("/api/thumbnail", query_string={"path": "text.txt"}).status_code == 404


def test_search(client, data):
    (data / "Urlaub 2024").mkdir()
    (data / "Urlaub 2024" / "strand.jpg").write_bytes(b"x")
    (data / "Urlaub 2024" / "hotel.pdf").write_bytes(b"x")
    (data / "rechnung-märz.pdf").write_bytes(b"x")

    def names(q):
        return {r["name"] for r in client.post("/api/search", json={"query": q}, headers=H).json["results"]}

    assert names("Suche nach Urlaub") == {"Urlaub 2024", "strand.jpg", "hotel.pdf"}
    assert names("Zeige mir alle PDFs") == {"hotel.pdf", "rechnung-märz.pdf"}
    assert names("Bilder vom Urlaub") == {"strand.jpg"}
    assert names("März") == {"rechnung-märz.pdf"}
