"""App: Auslieferung der Oberfläche, Systemdaten, interner Ordner, Protokolle."""

import logging
import shutil

from .helpers import H, upload


def test_frontend_is_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Content-Security-Policy" in r.headers
    assert client.get("/api/gibtsnicht").status_code == 404


def test_legacy_uploads_folder_in_export_is_not_served(app, client):
    frontend = app.extensions["familienserver"].settings.frontend_dir
    (frontend / "uploads").mkdir()
    (frontend / "uploads" / "privat.jpg").write_bytes(b"x")
    assert app.test_client().get("/uploads/privat.jpg").status_code == 404


def test_system_info(client):
    info = client.get("/api/system").json
    assert set(info) == {"cpu", "cpu_temp", "memory", "disk"}
    assert info["disk"]["total"] > 0


def test_internal_folder_is_recreated(app, client, data):
    shutil.rmtree(data / ".familienserver")
    assert upload(client, "nach-dem-loeschen.txt").status_code == 201
    assert client.get("/api/trash").status_code == 200


def test_log_file_is_written(app, client, tmp_path):
    client.post("/api/login", json={"password": "falsch"}, headers=H)
    for handler in logging.getLogger().handlers:
        handler.flush()
    log = (tmp_path / "logs" / "familienserver.log").read_text()
    assert "Fehlgeschlagene Anmeldung" in log
