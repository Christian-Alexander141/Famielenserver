"""Sicherheit: Anmeldung, CSRF-Schutz und Pfadprüfung."""

from .helpers import H, PASSWORD, upload


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
