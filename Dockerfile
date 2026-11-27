# Familienserver – ein Container für Frontend und Backend.
#
# Stufe 1 baut das Next.js-Frontend zu statischen Dateien,
# Stufe 2 enthält nur Python + gunicorn und liefert diese Dateien und die API aus.

FROM node:20-alpine AS frontend
WORKDIR /build
COPY familienserver/package.json familienserver/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY familienserver/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FAMILIENSERVER_DATA_DIR=/data \
    FAMILIENSERVER_FRONTEND_DIR=/app/familienserver/out \
    FAMILIENSERVER_LOG_DIR=/app/logs
WORKDIR /app

# Editierbar installiert, damit das Backend aus /app geladen wird
COPY pyproject.toml README.md ./
COPY backend/ ./backend/
RUN pip install --no-cache-dir -e .
COPY server.py ./
COPY --from=frontend /build/out ./familienserver/out

# Nicht als root laufen. UID 1000 entspricht dem ersten Benutzer auf den meisten
# Linux-Systemen (auch „pi“ auf dem Raspberry Pi) – so passen die Dateirechte in ./data.
RUN useradd --uid 1000 --create-home familie && mkdir -p /data /app/logs && chown familie:familie /data /app/logs
USER familie

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=3)" || exit 1

CMD ["gunicorn", "--workers", "1", "--threads", "8", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "backend:create_app()"]
