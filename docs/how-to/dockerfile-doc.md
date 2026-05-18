# Dockerfile Yazma Rehberi

Dockerfile, Docker image'larınızı oluşturmak için kullandığınız "tarif" dosyasıdır. Bu rehber, temel syntax'tan production-grade optimizasyonlara kadar her şeyi kapsar.

## 1. Dockerfile Nedir? 🤔

**Analoji:** Dockerfile, bir yemeğin tarifine benzer:

- **Malzemeler:** Base image, paketler, bağımlılıklar
- **Adımlar:** RUN, COPY, ADD komutları
- **Sunum:** CMD, ENTRYPOINT ile nasıl çalışacağı

**Sonuç:** Bir Docker **Image** (kalıp) elde edersiniz. Bu image'dan istediğiniz kadar **Container** (çalışan örnek) oluşturabilirsiniz.

---

## 2. Temel Syntax ve Komutlar 📝

### 2.1. FROM - Base Image Seçimi

Her Dockerfile bir base image ile başlar:

```dockerfile
# Resmi Node.js image'ı
FROM node:20-alpine

# Resmi Python image'ı
FROM python:3.12-slim

# Ubuntu base
FROM ubuntu:22.04

# Scratch (boş image - sadece binary için)
FROM scratch
```

**Alpine vs Slim vs Full:**

- `alpine`: En küçük (~5MB), minimal paketler
- `slim`: Orta boyut (~50MB), temel araçlar var
- `latest` (full): En büyük (~200MB+), tüm araçlar

> [!TIP]
> Production için **alpine** veya **slim** tercih edin. Daha küçük image = daha hızlı deploy.

### 2.2. WORKDIR - Çalışma Dizini

```dockerfile
FROM node:20-alpine

# Bundan sonraki tüm komutlar /app içinde çalışır
WORKDIR /app

# Artık /app içindeyiz
COPY package.json .
RUN npm install
```

**Neden WORKDIR?**

- `cd /app` yerine kullanılır
- Her RUN'da tekrar `cd` yapmaya gerek kalmaz
- Daha temiz ve okunabilir

### 2.3. COPY vs ADD

**COPY (Önerilen):**

```dockerfile
# Host'taki dosyayı container'a kopyala
COPY package.json /app/
COPY src/ /app/src/

# Tüm dosyaları kopyala
COPY . .
```

**ADD (Özel Durumlar):**

```dockerfile
# URL'den dosya indir
ADD https://example.com/file.tar.gz /tmp/

# .tar.gz dosyasını otomatik extract et
ADD archive.tar.gz /app/
```

> [!WARNING]
> Genelde **COPY** kullanın. ADD sadece URL veya auto-extract gerektiğinde.

### 2.4. RUN - Komut Çalıştırma

```dockerfile
# Shell form (sh -c ile çalışır)
RUN apt-get update && apt-get install -y curl

# Exec form (doğrudan çalışır, önerilen)
RUN ["apt-get", "update"]
RUN ["apt-get", "install", "-y", "curl"]
```

**Best Practice: Komutları Birleştir**

```dockerfile
# ❌ Kötü (3 layer oluşturur)
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ İyi (1 layer oluşturur)
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 2.5. ENV - Environment Variables

```dockerfile
# Build ve runtime'da kullanılır
ENV NODE_ENV=production
ENV PORT=3000
ENV APP_HOME=/app

# Kullanımı
WORKDIR $APP_HOME
```

### 2.6. ARG - Build-Time Variables

```dockerfile
# Sadece build sırasında kullanılır
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
ARG GIT_COMMIT
LABEL build_date=$BUILD_DATE
LABEL git_commit=$GIT_COMMIT
```

**Build sırasında değer geçirme:**

```bash
docker build --build-arg NODE_VERSION=18 --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") .
```

**ARG vs ENV:**

- **ARG**: Sadece build sırasında, image'a gömülmez
- **ENV**: Build + runtime, image'a gömülür

### 2.7. EXPOSE - Port Bildirimi

```dockerfile
# Bu port'un kullanılacağını bildir (dokümantasyon amaçlı)
EXPOSE 3000
EXPOSE 8080
```

> [!NOTE]
> `EXPOSE` port'u **açmaz**, sadece bildirir. Gerçek port mapping `docker run -p` ile yapılır.

### 2.8. CMD vs ENTRYPOINT

**CMD (Varsayılan Komut):**

```dockerfile
# Shell form
CMD npm start

# Exec form (önerilen)
CMD ["npm", "start"]

# Parametreler
CMD ["node", "server.js"]
```

**ENTRYPOINT (Sabit Komut):**

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]

# docker run myimage           -> node server.js
# docker run myimage app.js    -> node app.js
```

**Fark:**

- **CMD**: `docker run` ile override edilebilir
- **ENTRYPOINT**: Sabit kalır, CMD parametreleri değişir

**Best Practice:**

```dockerfile
# ENTRYPOINT: Ana komut
ENTRYPOINT ["python"]

# CMD: Varsayılan parametreler
CMD ["app.py"]
```

### 2.9. USER - Non-Root User

**Alpine Linux (node:20-alpine):**

```dockerfile
# Güvenlik için non-root user oluştur (Alpine syntax)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Bu kullanıcıya geç
USER nodejs

# Bundan sonraki komutlar nodejs kullanıcısı ile çalışır
CMD ["node", "server.js"]
```

**Debian/Ubuntu (node:20, ubuntu:22.04):**

```dockerfile
# Debian/Ubuntu için farklı syntax gerekir
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

USER nodejs
CMD ["node", "server.js"]
```

> [!WARNING]
> **Kritik:** `addgroup`/`adduser` komutları **sadece Alpine**'da çalışır. Debian/Ubuntu base image kullanıyorsanız `groupadd`/`useradd` kullanmalısınız, aksi halde build fail olur!

### 2.10. VOLUME - Veri Saklama

```dockerfile
# Volume mount point tanımla
VOLUME ["/data"]
VOLUME ["/var/log"]
```

> [!NOTE]
> `WORKDIR` komutu dizin yoksa **otomatik oluşturur**. `RUN mkdir -p /app` yapmaya gerek yok!

### 2.11. LABEL - Metadata Ekleme

```dockerfile
# OCI standart labels (önerilen)
LABEL org.opencontainers.image.title="My App" \
      org.opencontainers.image.description="Production application" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="My Company" \
      org.opencontainers.image.source="https://github.com/user/repo" \
      org.opencontainers.image.created="2024-01-15T10:00:00Z"

# Özel labels
LABEL maintainer="devops@company.com" \
      environment="production"
```

### 2.12. SHELL - Default Shell Değiştirme

```dockerfile
# Default shell'i bash yap
SHELL ["/bin/bash", "-c"]

# Artık RUN komutları bash ile çalışır
RUN echo "Hello from bash"

# PowerShell için (Windows containers)
SHELL ["powershell", "-Command"]
```

### 2.13. STOPSIGNAL - Graceful Shutdown

```dockerfile
# Container durdurulurken gönderilecek sinyal
STOPSIGNAL SIGTERM  # Default

# Bazı uygulamalar farklı sinyal bekler
STOPSIGNAL SIGQUIT  # Nginx için
```

### 2.14. HEALTHCHECK - Sağlık Kontrolü

**Node.js (Alpine):**

```dockerfile
# ✅ Built-in Node.js ile (harici bağımlılık yok)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# ✅ wget ile (Alpine'da varsayılan)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

**Python:**

```dockerfile
# ✅ Built-in urllib ile (requests gerektirmez)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
```

> [!WARNING]
> **Alpine'da curl yok!** `curl` kullanmak istiyorsanız: `RUN apk add --no-cache curl`
>
> **Python'da requests yok!** `import requests` için `requirements.txt`'de olmalı. Built-in `urllib.request` tercih edin

````

---

## 3. Multi-Stage Builds 🏗️

Multi-stage builds, image boyutunu küçültmek için **en önemli** tekniktir.

### 3.1. Temel Örnek (Node.js)

```dockerfile
# ===== STAGE 1: Builder =====
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies'i kopyala ve yükle
COPY package*.json ./
RUN npm ci --omit=dev  # npm 7+ için (--only=production deprecated)

# Kaynak kodları kopyala ve build et
COPY . .
RUN npm run build

# ===== STAGE 2: Production =====
FROM node:20-alpine AS production

WORKDIR /app

# Sadece gerekli dosyaları önceki stage'den al
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
````

**Sonuç:**

- Builder stage: 500MB (dev dependencies, source code)
- Production stage: 150MB (sadece gerekli dosyalar)

### 3.2. İleri Seviye Örnek (Go)

```dockerfile
# ===== STAGE 1: Builder =====
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Go modules
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# ===== STAGE 2: Production =====
FROM scratch

# CA certificates (HTTPS için gerekli)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Binary'yi kopyala
COPY --from=builder /app/main /main

EXPOSE 8080

ENTRYPOINT ["/main"]
```

**Sonuç:**

- Builder stage: 400MB
- Production stage: **5MB** (sadece binary!)

### 3.3. Python Örneği

```dockerfile
# ===== STAGE 1: Builder =====
FROM python:3.12-slim AS builder

WORKDIR /app

# Virtual environment oluştur
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ===== STAGE 2: Production =====
FROM python:3.12-slim AS production

WORKDIR /app

# Virtual environment'ı kopyala
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Uygulama kodları
COPY . .

# Non-root user
RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE 8000

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

### 3.4. .NET Örneği

```dockerfile
# ===== STAGE 1: Build =====
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Restore dependencies
COPY ["MyApp.csproj", "./"]
RUN dotnet restore

# Build
COPY . .
RUN dotnet build -c Release -o /app/build

# ===== STAGE 2: Publish =====
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

# ===== STAGE 3: Runtime =====
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S dotnet && \
    adduser -S dotnet -u 1001
USER dotnet

COPY --from=publish /app/publish .

EXPOSE 5000

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

---

## 4. .dockerignore - Gereksiz Dosyaları Hariç Tutma 🚫

`.dockerignore` dosyası, `.gitignore` gibi çalışır. Build context'e dahil edilmeyecek dosyaları belirtir.

```dockerignore
# Node.js
node_modules/
npm-debug.log
.npm
coverage/
.nyc_output/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
venv/
.venv/
.pytest_cache/
htmlcov/

# Git
.git/
.gitignore
.gitattributes

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# OS
.DS_Store
Thumbs.db

# Build artifacts
dist/
build/
*.log

# Environment files (ama .env.example hariç!)
*.env*
!.env.example

# Documentation
README.md
docs/
*.md
LICENSE
CHANGELOG.md

# Tests
tests/
__tests__/
*.test.js
*.spec.js
*.test.py
*.spec.py

# CI/CD
.github/
.gitlab-ci.yml
Dockerfile
docker-compose.yml
.dockerignore
Makefile
```

**Neden Önemli?**

- Build hızını artırır
- Image boyutunu küçültür
- Güvenlik (secrets build context'e girmez)

---

## 5. Layer Caching ve Optimizasyon 🚀

Docker, her komutu bir **layer** olarak saklar. Layer'lar cache'lenir, değişmeyen layer'lar tekrar build edilmez.

### 5.1. Cache-Friendly Sıralama

**❌ Kötü (Her kod değişikliğinde npm install çalışır):**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**✅ İyi (package.json değişmedikçe npm install cache'den gelir):**

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Önce dependencies (az değişir)
COPY package*.json ./
RUN npm ci

# Sonra kod (sık değişir)
COPY . .

CMD ["npm", "start"]
```

### 5.2. Komutları Birleştir

**❌ Kötü (3 layer):**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean
```

**✅ İyi (1 layer):**

```dockerfile
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 5.3. BuildKit Cache Mounts

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# npm cache'i mount et (her build'de indirilmez)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

CMD ["npm", "start"]
```

> [!IMPORTANT]
> **BuildKit Syntax Directive Zorunlu:**
> `--mount=type=cache` ve `--mount=type=secret` kullanmak için Dockerfile'ın **ilk satırında** mutlaka `# syntax=docker/dockerfile:1` olmalıdır. Bu satır yoksa build hata verir!

**Build:**

```bash
# BuildKit otomatik aktif (Docker 23.0+)
docker build -t myapp .

# Eski versiyonlarda manuel aktif etme
DOCKER_BUILDKIT=1 docker build -t myapp .
```

---

## 6. Güvenlik Best Practices 🔒

### 6.1. Non-Root User (Kritik!)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci

# Kod
COPY . .

# Non-root user oluştur
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Dosya sahipliğini değiştir
RUN chown -R nodejs:nodejs /app

# User'a geç
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
```

### 6.2. Minimal Base Image

```dockerfile
# ✅ Alpine (5MB)
FROM node:20-alpine

# ✅ Distroless (Google)
FROM gcr.io/distroless/nodejs20-debian12

# ✅ Scratch (sadece binary)
FROM scratch
```

### 6.3. Secrets Yönetimi

**❌ Asla Böyle Yapmayın:**

```dockerfile
ENV DATABASE_PASSWORD=supersecret123
```

**✅ Build-time Secrets:**

```dockerfile
# syntax=docker/dockerfile:1

FROM alpine

# Secret mount et (image'a gömülmez)
RUN --mount=type=secret,id=db_password \
    cat /run/secrets/db_password > /tmp/password
```

**Build:**

```bash
docker build --secret id=db_password,src=./secrets/db_password.txt .
```

**✅ Runtime Secrets (Docker Compose):**

```yaml
services:
  app:
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 6.4. Read-Only Root Filesystem

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

USER node

# Sadece /tmp yazılabilir
VOLUME ["/tmp"]

CMD ["node", "server.js"]
```

**docker-compose.yml:**

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
```

### 6.5. Security Scanning

```bash
# Trivy ile scan
trivy image myapp:latest

# Docker Scout
docker scout cves myapp:latest

# Snyk
snyk container test myapp:latest
```

---

## 7. Gerçek Dünya Örnekleri 🌍

### 7.1. Production-Grade Node.js

```dockerfile
# syntax=docker/dockerfile:1

# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps

WORKDIR /app

# Package files
COPY package.json package-lock.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ===== STAGE 2: Builder =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

# Build
RUN npm run build

# ===== STAGE 3: Production =====
FROM node:20-alpine AS production

WORKDIR /app

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

# Switch to non-root user
USER nodejs

# Health check (built-in Node.js, harici bağımlılık yok)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Graceful shutdown
STOPSIGNAL SIGTERM

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 7.2. Production-Grade Python (FastAPI)

```dockerfile
# syntax=docker/dockerfile:1

# ===== STAGE 1: Builder =====
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# ===== STAGE 2: Production =====
FROM python:3.12-slim AS production

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application
COPY . .

# Non-root user
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check (harici bağımlılık gerektirmez)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; import sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode() == 200 else 1)"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> [!WARNING]
> **Healthcheck Bağımlılık Riski:**
> `import requests` kullanmak için `requests` kütüphanesinin `requirements.txt`'de olması gerekir. Yukarıdaki örnekte Python'un built-in `urllib.request` modülü kullanılarak harici bağımlılık önlenmiştir.

### 7.3. Production-Grade Go

```dockerfile
# syntax=docker/dockerfile:1

# ===== STAGE 1: Builder =====
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# nobody user için passwd entry oluştur (scratch için)
RUN echo "nobody:x:65534:65534:Nobody:/:" > /etc/passwd.nobody

# Go modules
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Build
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o main .

# ===== STAGE 2: Production =====
FROM scratch

# CA certificates (HTTPS için)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user için passwd entry oluştur
COPY --from=builder /etc/passwd.nobody /etc/passwd

# Binary
COPY --from=builder /app/main /main

# Non-root user
USER nobody

EXPOSE 8080

ENTRYPOINT ["/main"]
```

---

## 8. Debugging ve Troubleshooting 🔍

### 8.1. Build Sırasında Debug

```dockerfile
# Intermediate stage'i debug et
FROM node:20-alpine AS debug

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Debug için shell aç
RUN echo "Debug point" && ls -la

COPY . .
```

**Build ve debug:**

```bash
# Belirli stage'e kadar build et
docker build --target debug -t myapp:debug .

# Container'ı çalıştır ve içine gir
docker run -it myapp:debug sh
```

### 8.2. Layer'ları İnceleme

```bash
# Image history
docker history myapp:latest

# Detaylı bilgi
docker inspect myapp:latest

# Dive ile layer analizi
dive myapp:latest
```

### 8.3. Build Cache'i Temizle

```bash
# Tüm cache'i temizle
docker builder prune -a

# BuildKit cache'i temizle
docker buildx prune -a
```

---

## 9. İleri Seviye Özellikler 🚀

### 9.1. Multi-Platform Builds (ARM64 + AMD64)

```dockerfile
# syntax=docker/dockerfile:1

# Platform-specific base image
FROM --platform=$TARGETPLATFORM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["node", "server.js"]
```

**Build:**

```bash
# Tek platform
docker buildx build --platform linux/amd64 -t myapp:amd64 .

# Multi-platform (ARM64 + AMD64)
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .
```

### 9.2. Heredoc Syntax (BuildKit 1.4+)

```dockerfile
# syntax=docker/dockerfile:1

FROM ubuntu:22.04

# Çok satırlı script için heredoc
RUN <<EOF
apt-get update
apt-get install -y curl wget git
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

# Dosya oluşturmak için
COPY <<EOF /etc/app/config.json
{
  "port": 3000,
  "debug": false,
  "database": {
    "host": "localhost",
    "port": 5432
  }
}
EOF

# Python script oluştur
COPY <<EOF /app/healthcheck.py
import http.client
conn = http.client.HTTPConnection("localhost", 8000)
conn.request("GET", "/health")
response = conn.getresponse()
exit(0 if response.status == 200 else 1)
EOF
```

### 9.3. COPY --chmod (BuildKit)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

# Dosyayı kopyalarken permission ayarla
COPY --chmod=755 scripts/entrypoint.sh /entrypoint.sh
COPY --chmod=644 config/app.conf /etc/app/

# Artık RUN chmod yapmaya gerek yok!
ENTRYPOINT ["/entrypoint.sh"]
```

### 9.4. ARG'dan ENV'e Değer Aktarma

```dockerfile
# Build-time değişken
ARG NODE_ENV=production
ARG APP_VERSION=1.0.0

# Runtime'da da kullanılabilsin
ENV NODE_ENV=$NODE_ENV \
    APP_VERSION=$APP_VERSION

# Build sırasında
# docker build --build-arg NODE_ENV=development .
```

### 9.5. Gelişmiş Cache Mount Örnekleri

```dockerfile
# syntax=docker/dockerfile:1

# Python pip cache
FROM python:3.12-slim
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Go module cache
FROM golang:1.21-alpine
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o main .

# apt cache (Debian/Ubuntu)
FROM ubuntu:22.04
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y curl

# npm cache (farklı sharing modes)
FROM node:20-alpine
RUN --mount=type=cache,target=/root/.npm,sharing=private \
    npm ci
```

**Cache Sharing Modes:**

- `shared`: Birden fazla build aynı cache'i kullanabilir (default)
- `private`: Her build kendi cache'ini kullanır
- `locked`: Aynı anda sadece bir build kullanabilir

---

## 10. Checklist: Production-Ready Dockerfile 📋

- [ ] **Multi-stage build** kullanılıyor
- [ ] **Alpine** veya **slim** base image
- [ ] **Non-root user** ile çalışıyor
- [ ] **.dockerignore** dosyası var
- [ ] **Layer caching** optimize edilmiş (dependencies önce)
- [ ] **Secrets** image'a gömülmemiş
- [ ] **Health check** tanımlı (built-in tools kullanılmış)
- [ ] **Minimal dependencies** (sadece production)
- [ ] **Security scan** yapılmış (Trivy, Scout)
- [ ] **Image size** optimize edilmiş (<200MB ideal)
- [ ] **Labels** eklenmiş (OCI standart)
- [ ] **EXPOSE** doğru port'ları gösteriyor
- [ ] **STOPSIGNAL** tanımlı (graceful shutdown)
- [ ] **Platform** belirtilmiş (multi-arch için)
- [ ] **Pinned versions** (node:20.10.0-alpine, node:20-alpine değil)
- [ ] **Build time** optimize (<2 dakika ideal)
- [ ] **No latest tag** (versiyon numarası kullanılıyor)

---

## 11. Kaynaklar 📚

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [BuildKit](https://docs.docker.com/build/buildkit/)
- [Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)

---

> **💡 Pro Tip:** Her Dockerfile değişikliğinden sonra `docker scout cves` ile güvenlik taraması yapın!
