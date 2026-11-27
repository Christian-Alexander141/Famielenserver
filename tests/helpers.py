"""Gemeinsame Werte und Hilfsfunktionen für die Tests."""

PASSWORD = "test-passwort-123"
# Ohne diesen Header lehnt das Backend ändernde Anfragen ab (CSRF-Schutz)
H = {"X-Familienserver": "1"}


def upload(client, name, content=b"inhalt", directory=""):
    return client.post(
        "/api/upload",
        query_string={"dir": directory, "name": name},
        data=content,
        headers={**H, "Content-Type": "application/octet-stream"},
    )
