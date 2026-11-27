import io
import time
import zipfile
from pathlib import Path

import pytest

from backend import create_app

PASSWORD = "test-passwort-123"
H = {"X-Familienserver": "1"}


@pytest.fixture()
def app(tmp_path):
    frontend = tmp_path / "out"
    frontend.mkdir()
    (frontend / "index.html").write_text("<!doctype html><title>Familienserver</title>")
    return create_app({
        "data_dir": tmp_path / "data",
        "password": PASSWORD,
        "secret_key": "test-secret",
        "frontend_dir": frontend,
    })


@pytest.fixture()
def data(app) -> Path:
    return app.extensions["familienserver"].storage.root


@pytest.fixture()
def client(app):
    c = app.test_client()
    assert c.post("/api/login", json={"password": PASSWORD}, headers=H).status_code == 200
    return c


def upload(client, name, content=b"inhalt", directory=""):
    return client.post(
        "/api/upload",
        query_string={"dir": directory, "name": name},
        data=content,
        headers={**H, "Content-Type": "application/octet-stream"},
    )


# ------------------------------------------------------------ Sicherheit


def test_requires_login(app):
    c = app.test_client()
    assert c.get("/api/files").status_code == 401
    assert c.get("/api/health").status_code == 200


def test_wrong_password_and_rate_limit(app):
    c = app.test_client()
    for _ in range(10):
        assert c.post("/api/login", json={"password": "falsch"}, headers=H).status_code == 401
    # Danach ist die Anmeldung gesperrt – auch mit richtigem Passwort
    assert c.post("/api/login", json={"password": PASSWORD}, headers=H).status_code == 429


def test_mutations_need_csrf_header(client):
    r = client.post("/api/mkdir", json={"name": "x"})
    assert r.status_code == 403


def test_upload_path_traversal_is_blocked(client, data, tmp_path):
    for evil in ["../../../evil.txt", "../evil.txt", "a/../../evil.txt", "/etc/evil.txt"]:
        r = upload(client, evil)
        if r.status_code == 201:
            # Ein führender Schrägstrich wird zu einem relativen Pfad – Datei bleibt im Datenordner
            assert (data / r.json["path"]).resolve().is_relative_to(data)
        else:
            assert r.status_code == 400
    assert not (tmp_path / "evil.txt").exists()
    assert not (data.parent / "evil.txt").exists()


def test_delete_root_via_dotdot_is_blocked(client, data):
    (data / "Bilder").mkdir()
    (data / "Bilder" / "foto.jpg").write_bytes(b"x")
    for path in ["Bilder/..", "..", ".", "", "/", "Bilder/../.."]:
        r = client.post("/api/delete", json={"path": path}, headers=H)
        assert r.status_code == 400, path
    assert (data / "Bilder" / "foto.jpg").exists()


def test_sibling_prefix_is_blocked(client, data):
    sibling = data.parent / (data.name + "_x")
    sibling.mkdir()
    (sibling / "geheim.txt").write_text("geheim")
    r = client.get("/api/download", query_string={"path": f"../{sibling.name}/geheim.txt"})
    assert r.status_code == 400


def test_symlink_outside_is_blocked(client, data, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "geheim.txt").write_text("geheim")
    (data / "link").symlink_to(outside)
    r = client.get("/api/download", query_string={"path": "link/geheim.txt"})
    assert r.status_code == 400


def test_internal_folder_is_not_reachable(client, data):
    assert client.get("/api/files", query_string={"path": ".familienserver"}).status_code == 400
    names = [i["name"] for i in client.get("/api/files").json["items"]]
    assert ".familienserver" not in names


def test_html_is_never_served_inline(client):
    upload(client, "seite.html", b"<script>alert(1)</script>")
    r = client.get("/api/download", query_string={"path": "seite.html", "inline": "1"})
    assert r.headers["Content-Disposition"].startswith("attachment")
    assert "sandbox" in r.headers["Content-Security-Policy"]


# ------------------------------------------------------------- Funktionen


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


def test_listing_and_download(client, data):
    upload(client, "b.txt")
    client.post("/api/mkdir", json={"name": "Zeta"}, headers=H)
    items = client.get("/api/files").json["items"]
    assert [i["name"] for i in items] == ["Zeta", "b.txt"]
    assert items[1]["extension"] == "txt"
    r = client.get("/api/download", query_string={"path": "b.txt"})
    assert r.data == b"inhalt"


def test_legacy_uploads_folder_in_export_is_not_served(app, client):
    frontend = app.extensions["familienserver"].settings.frontend_dir
    (frontend / "uploads").mkdir()
    (frontend / "uploads" / "privat.jpg").write_bytes(b"x")
    assert app.test_client().get("/uploads/privat.jpg").status_code == 404


def test_frontend_is_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Content-Security-Policy" in r.headers
    assert client.get("/api/gibtsnicht").status_code == 404


def test_system_info(client):
    info = client.get("/api/system").json
    assert set(info) == {"cpu", "cpu_temp", "memory", "disk"}
    assert info["disk"]["total"] > 0


def test_thumbnail(client, data):
    pil = pytest.importorskip("PIL.Image")
    pil.new("RGB", (1200, 800), (200, 30, 30)).save(data / "gross.jpg")
    r = client.get("/api/thumbnail", query_string={"path": "gross.jpg"})
    assert r.status_code == 200 and r.mimetype == "image/jpeg"
    assert max(pil.open(io.BytesIO(r.data)).size) == 320
    assert client.get("/api/thumbnail", query_string={"path": "gross.jpg"}).status_code == 200  # aus dem Cache
    upload(client, "text.txt")
    assert client.get("/api/thumbnail", query_string={"path": "text.txt"}).status_code == 404


def test_internal_folder_is_recreated(app, client, data):
    import shutil
    shutil.rmtree(data / ".familienserver")
    assert upload(client, "nach-dem-loeschen.txt").status_code == 201
    assert client.get("/api/trash").status_code == 200
