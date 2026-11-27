"""Fixtures: eine App mit eigenem Datenordner pro Test und ein angemeldeter Client."""

from pathlib import Path

import pytest

from backend import create_app

from .helpers import H, PASSWORD


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
        "log_dir": tmp_path / "logs",
    })


@pytest.fixture()
def data(app) -> Path:
    return app.extensions["familienserver"].storage.root


@pytest.fixture()
def client(app):
    c = app.test_client()
    assert c.post("/api/login", json={"password": PASSWORD}, headers=H).status_code == 200
    return c
