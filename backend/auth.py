"""Anmeldung mit einem gemeinsamen Familien-Passwort und Schutz vor fremden Webseiten.

* Sitzungen laufen über ein signiertes, HttpOnly-Cookie (SameSite=Lax).
* Jede ändernde Anfrage braucht den Header ``X-Familienserver: 1``. Fremde Webseiten
  können diesen Header ohne CORS-Freigabe nicht setzen – damit ist CSRF ausgeschlossen.
* Zu viele Fehlversuche von einer Adresse sperren die Anmeldung vorübergehend.
"""

from __future__ import annotations

import hashlib
import hmac
import threading
import time
from collections import defaultdict, deque

from flask import current_app, request, session

CSRF_HEADER = "X-Familienserver"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
PUBLIC_ENDPOINTS = {"api.health", "api.session_info", "api.login", "api.logout"}

MAX_FAILURES = 10
FAILURE_WINDOW = 15 * 60


class LoginLimiter:
    def __init__(self) -> None:
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._failures[key]
        while attempts and now - attempts[0] > FAILURE_WINDOW:
            attempts.popleft()
        return attempts

    def blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._prune(key, time.time())) >= MAX_FAILURES

    def fail(self, key: str) -> None:
        with self._lock:
            now = time.time()
            self._prune(key, now).append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


def _fingerprint() -> str:
    """Ändert sich das Passwort, werden alle bestehenden Sitzungen ungültig."""
    key = current_app.config["SECRET_KEY"].encode()
    password = current_app.extensions["familienserver"].settings.password.encode()
    return hmac.new(key, password, hashlib.sha256).hexdigest()


def is_authenticated() -> bool:
    token = session.get("auth")
    return isinstance(token, str) and hmac.compare_digest(token, _fingerprint())


def check_password(candidate: str) -> bool:
    expected = current_app.extensions["familienserver"].settings.password
    return hmac.compare_digest(candidate.encode(), expected.encode())


def log_in() -> None:
    session.clear()
    session.permanent = True
    session["auth"] = _fingerprint()


def log_out() -> None:
    session.clear()


def csrf_ok() -> bool:
    return request.method in SAFE_METHODS or request.headers.get(CSRF_HEADER) == "1"


def needs_login() -> bool:
    return request.endpoint not in PUBLIC_ENDPOINTS and not is_authenticated()
