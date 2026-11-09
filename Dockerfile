# Familienserver Dockerfile
# Mehrstufiger Build für Frontend (Next.js) und Backend (Flask)

# Stage 1: Frontend bauen
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Kopiere package.json und package-lock.json
COPY familienserver/package*.json ./

# Installiere Abhängigkeiten
RUN npm install

# Kopiere Frontend-Quellcode
COPY familienserver/ ./

# Baue Next.js Anwendung
RUN npm run build

# Stage 2: Backend vorbereiten
FROM python:3.11-slim AS backend

WORKDIR /app

# System-Abhängigkeiten installieren
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopiere requirements.txt und installiere Python-Abhängigkeiten
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere Backend-Quellcode
COPY server.py ./

# Erstelle Upload-Ordner
RUN mkdir -p familienserver/public/uploads

# Stage 3: Finales Image
FROM python:3.11-slim

WORKDIR /app

# System-Abhängigkeiten
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopiere Python-Abhängigkeiten
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /app/server.py ./
COPY --from=backend /app/requirements.txt ./

# Kopiere gebildetes Frontend
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules

# Installiere Node.js für Next.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Port freigeben
EXPOSE 5000

# Umgebungsvariablen
ENV NODE_ENV=production
ENV PORT=5000
ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

# Startskript
COPY start-docker.sh ./
RUN chmod +x start-docker.sh

CMD ["./start-docker.sh"]
