# Docker Compose Detaylı Rehber

Docker Compose, çoklu container uygulamalarını tanımlamak ve çalıştırmak için kullanılan güçlü bir araçtır. Bu rehber, temel kullanımdan production-grade konfigürasyonlara kadar her şeyi kapsar.

> [!IMPORTANT]
> **Docker Compose V1 vs V2:**
>
> - **V1 (Eski):** `docker-compose` (Python, deprecated) ❌
> - **V2 (Yeni):** `docker compose` (Go, Docker CLI plugin) ✅
>
> Bu rehber **Compose V2** syntax'ını kullanır. V1 artık deprecated, V2 kullanın!

## 1. Docker Compose Nedir? 🤔

**Kısa Cevap:** Docker Compose, birden fazla container'ı tek bir YAML dosyasıyla yönetmenizi sağlar.

**Uzun Cevap:** Modern uygulamalar genellikle tek bir servisten oluşmaz:

- Web uygulaması (Frontend)
- API (Backend)
- Veritabanı (PostgreSQL, MySQL)
- Cache (Redis)
- Reverse Proxy (Nginx)
- Monitoring (Prometheus, Grafana)

Tüm bunları elle (`docker run ...`) yönetmek kabus olur. Compose, tüm bu servisleri **tek bir dosyada** tanımlamanızı ve **tek bir komutla** yönetmenizi sağlar.

---

## 2. Temel Yapı ve Syntax 📝

### 2.1. Minimal Örnek

```yaml
# Modern syntax (Compose V2+)
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
```

> [!WARNING]
> **`version:` Artık Obsolete!**
> Docker Compose V2'de `version:` key'i **tamamen görmezden geliniyor**. Belirtmenize gerek yok, hatta Docker resmi olarak kaldırmanızı öneriyor.

Bu kadar! `docker compose up -d` dediğinizde Nginx ayağa kalkar.

### 2.2. Gerçek Dünya Örneği (Full-Stack App)

```yaml
# Modern syntax (version key yok)

services:
  # Frontend (React/Next.js)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000
    depends_on:
      - backend
    restart: unless-stopped

  # Backend (Node.js/Python/.NET)
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    volumes:
      - ./backend/uploads:/app/uploads
    restart: unless-stopped

  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Servis Tanımlama (Services) 🔧

### 3.1. Image vs Build

**Hazır Image Kullanma:**

```yaml
services:
  db:
    image: postgres:16-alpine # Docker Hub'dan indir
```

**Kendi Image'ınızı Build Etme:**

```yaml
services:
  api:
    build:
      context: ./backend # Dockerfile'ın bulunduğu klasör
      dockerfile: Dockerfile # Dockerfile adı (varsayılan: Dockerfile)
      args: # Build-time değişkenler
        NODE_ENV: production
      target: production # Multi-stage build'de hangi stage
```

**İleri Seviye Build:**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
      cache_from:
        - myapp:latest
      labels:
        - "com.example.version=1.0"
      shm_size: "2gb"
```

### 3.2. Ports (Port Mapping)

```yaml
services:
  web:
    ports:
      - "8080:80" # Host:Container
      - "443:443"
      - "127.0.0.1:5432:5432" # Sadece localhost'tan erişilebilir
```

> [!WARNING]
> **Güvenlik Uyarısı:** `ports:` kullanmak container'ı **tüm dünyaya** açar (UFW bypass eder).
> Sadece localhost'tan erişim istiyorsanız: `127.0.0.1:8080:80`

**Expose (Sadece Container'lar Arası):**

```yaml
services:
  api:
    expose:
      - "5000" # Sadece diğer container'lar erişebilir, dışarıya açık DEĞİL
```

### 3.3. Environment Variables

**Yöntem 1: Doğrudan Tanımlama**

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
      - DEBUG=false
```

**Yöntem 2: .env Dosyasından Okuma**

```yaml
services:
  app:
    env_file:
      - .env
      - .env.production
```

**Yöntem 3: Host'tan Değişken Geçirme**

```yaml
services:
  app:
    environment:
      - API_KEY=${API_KEY} # Host'taki $API_KEY değişkenini kullan
```

### 3.4. Volumes (Veri Saklama)

**Named Volumes (Önerilen - Production):**

```yaml
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data: # Docker tarafından yönetilir
```

**Bind Mounts (Development):**

```yaml
services:
  app:
    volumes:
      - ./src:/app/src # Host'taki ./src -> Container'daki /app/src
      - ./config.yml:/app/config.yml:ro # Read-only
```

**tmpfs (Geçici Veri):**

```yaml
services:
  app:
    tmpfs:
      - /tmp
      - /run
```

### 3.5. Networks (Ağ Yönetimi)

**Varsayılan Davranış:**
Compose otomatik olarak tüm servisleri aynı network'e koyar.

**Özel Network Tanımlama:**

```yaml
services:
  frontend:
    networks:
      - frontend_net

  backend:
    networks:
      - frontend_net
      - backend_net

  db:
    networks:
      - backend_net # Sadece backend erişebilir

networks:
  frontend_net:
  backend_net:
```

**İleri Seviye Network:**

```yaml
networks:
  frontend_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

  backend_net:
    driver: bridge
    internal: true # Dış dünyaya kapalı
```

### 3.6. Depends On (Başlatma Sırası)

**Basit Bağımlılık:**

```yaml
services:
  web:
    depends_on:
      - db
      - cache
```

**Health Check ile Bağımlılık (Önerilen):**

```yaml
services:
  web:
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 3.7. Restart Policies

```yaml
services:
  app:
    restart: unless-stopped # Önerilen (production)
    # Diğer seçenekler:
    # restart: no              # Hiçbir zaman yeniden başlatma
    # restart: always          # Her zaman yeniden başlat
    # restart: on-failure      # Sadece hata durumunda
```

### 3.8. Resource Limits (Kaynak Kısıtlama)

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: "0.5" # Maksimum 0.5 CPU
          memory: 512M # Maksimum 512MB RAM
        reservations:
          cpus: "0.25" # Minimum 0.25 CPU
          memory: 256M # Minimum 256MB RAM
```

### 3.9. Health Checks

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Örnekler:**

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]

# MySQL
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]

# HTTP Endpoint
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
```

---

## 4. Production Best Practices 🏭

### 4.1. Güvenlik

**1. Secrets Kullanımı:**

```yaml
services:
  db:
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

**2. Read-Only Root Filesystem:**

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

**3. Non-Root User:**

```yaml
services:
  app:
    user: "1000:1000" # UID:GID
```

**4. Security Options:**

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### 4.2. Logging

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "production"
```

**Alternatif Drivers:**

```yaml
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://192.168.0.42:123"
```

### 4.3. Override Pattern (Environment-Specific)

**Base: `docker-compose.yml`**

```yaml
services:
  app:
    build: .
    environment:
      - NODE_ENV=development
```

**Production: `docker-compose.prod.yml`**

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
```

**Kullanım:**

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 5. Temel Komutlar 🎮

### 5.1. Başlatma ve Durdurma

```bash
# Tüm servisleri başlat (detached mode)
docker compose up -d

# Belirli servisleri başlat
docker compose up -d web db

# Rebuild ederek başlat
docker compose up -d --build

# Servisleri durdur (container'ları silmeden)
docker compose stop

# Servisleri durdur ve container'ları sil
docker compose down

# Servisleri durdur, container + volume'leri sil
docker compose down -v

# Servisleri durdur, container + image'leri sil
docker compose down --rmi all
```

### 5.2. Log ve Monitoring

```bash
# Tüm servislerin loglarını izle
docker compose logs -f

# Belirli servisin loglarını izle
docker compose logs -f web

# Son 100 satırı göster
docker compose logs --tail=100

# Kaynak kullanımını izle (sadece compose container'ları)
docker stats $(docker compose ps -q)

# Process listesi
docker compose top
```

### 5.3. Servis Yönetimi

```bash
# Çalışan servisleri listele
docker compose ps

# Servis detaylarını göster
docker compose ps --services

# Belirli servisi yeniden başlat
docker compose restart web

# Servisi durdur
docker compose stop web

# Servisi başlat
docker compose start web

# Servisi scale et (çoğalt)
docker compose up -d --scale web=3
```

### 5.4. Exec ve Shell

```bash
# Container içinde komut çalıştır
docker compose exec web sh

# Root olarak gir
docker compose exec -u root web sh

# Tek seferlik komut
docker compose exec db psql -U postgres

# Yeni container başlatıp komut çalıştır
docker compose run --rm web npm install
```

### 5.5. Temizlik

```bash
# Kullanılmayan container'ları temizle
docker compose down --remove-orphans

# Tüm sistemi temizle
docker system prune -a --volumes
```

---

## 6. Gerçek Dünya Örnekleri 🌍

> [!TIP]
> **Detaylı Production-Ready Örnekler:**
> Aşağıdaki senaryolar için tam konfigürasyon dosyaları **[Şablonlar (Templates)](../file-templates/postgres.md)** bölümünde bulunabilir:
>
> - [PostgreSQL (Production)](../file-templates/postgres.md)
> - [MariaDB (Production)](../file-templates/mariadb.md)
> - [Redis (Production)](../file-templates/redis.md)
> - [Monitoring Stack (Prometheus + Grafana)](../file-templates/monitoring-stack.md)
> - [Nginx Proxy Manager](../file-templates/nginx-proxy-manager.md)
> - [.NET Backend](../file-templates/dotnet-backend.md)

### 6.1. Basit Web App (Konsept)

```yaml
services:
  # Backend
  api:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  # Database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

volumes:
  db_data:
```

**Önemli Noktalar:**

- ✅ `depends_on` ile service_healthy kullanımı
- ✅ Named volumes (production için)
- ✅ Environment variables
- ✅ Health checks
- ✅ Restart policy

### 6.2. Microservices (Konsept)

```yaml
services:
  gateway:
    build: ./gateway
    ports:
      - "80:80"
    networks:
      - frontend
      - backend

  service-a:
    build: ./services/a
    expose:
      - "5001"
    networks:
      - backend # Sadece backend network'ünde

  db:
    image: postgres:16-alpine
    networks:
      - backend # Dış dünyadan izole

networks:
  frontend:
  backend:
    internal: true # İnternet erişimi yok
```

**Önemli Noktalar:**

- ✅ Network izolasyonu (frontend vs backend)
- ✅ `internal: true` ile güvenlik
- ✅ `expose` vs `ports` farkı
- ✅ Gateway pattern

### 6.3. Development vs Production

**docker-compose.yml (Base):**

```yaml
services:
  app:
    build: .
    volumes:
      - ./src:/app/src
```

**docker-compose.prod.yml (Override):**

```yaml
services:
  app:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
```

**Kullanım:**

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

> [!NOTE]
> **Tam Stack Örnekleri İçin:**
>
> - MERN Stack → [Monitoring Stack Template](../file-templates/monitoring-stack.md)
> - Microservices → [Nginx Proxy Manager Template](../file-templates/nginx-proxy-manager.md)
> - .NET + PostgreSQL → [.NET Backend Template](../file-templates/dotnet-backend.md)

---

## 7. Troubleshooting 🔍

### 7.1. Yaygın Sorunlar

**Problem: Container ayağa kalkmıyor**

```bash
# Logları kontrol et
docker compose logs web

# Container durumunu kontrol et
docker compose ps

# Health check durumunu kontrol et
docker inspect <container_id> | grep -A 10 Health
```

**Problem: Network bağlantısı yok**

```bash
# Network'leri listele
docker network ls

# Network detaylarını incele
docker network inspect <network_name>

# Container'ın network'ünü kontrol et
docker inspect <container_id> | grep -A 20 Networks
```

**Problem: Volume verisi kayboldu**

```bash
# Volume'leri listele
docker volume ls

# Volume detaylarını göster
docker volume inspect <volume_name>

# Volume'ü backup al
docker run --rm -v <volume_name>:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```

### 7.2. Debug Teknikleri

**1. Container içine gir:**

```bash
docker compose exec web sh
```

**2. Yeni container başlat:**

```bash
docker compose run --rm web sh
```

**3. Network connectivity test:**

```bash
docker compose exec web ping db
docker compose exec web nc -zv db 5432
```

**4. Environment variables kontrol:**

```bash
docker compose exec web env
```

---

## 8. İleri Seviye Konular 🚀

### 8.1. Multi-Stage Builds ile Entegrasyon

**Dockerfile:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**

```yaml
services:
  app:
    build:
      context: .
      target: production
```

### 8.2. Profiles (Conditional Services)

```yaml
services:
  app:
    image: myapp

  db:
    image: postgres:16-alpine

  # Sadece debug modunda çalışsın
  debug-tools:
    image: nicolaka/netshoot
    profiles:
      - debug
    command: sleep infinity
```

**Kullanım:**

```bash
# Normal mod (debug-tools çalışmaz)
docker compose up -d

# Debug mod (debug-tools da çalışır)
docker compose --profile debug up -d
```

### 8.3. Extension Fields (DRY Principle)

```yaml
x-common-variables: &common-env
  NODE_ENV: production
  LOG_LEVEL: info

x-restart-policy: &restart-policy
  restart: unless-stopped

services:
  web:
    <<: *restart-policy
    environment:
      <<: *common-env
      SERVICE_NAME: web

  api:
    <<: *restart-policy
    environment:
      <<: *common-env
      SERVICE_NAME: api
```

---

## 9. Checklist: Production-Ready Compose 📋

- [ ] **Secrets yönetimi** - Şifreler `.env` veya secrets ile
- [ ] **Health checks** - Tüm kritik servislerde
- [ ] **Resource limits** - CPU/Memory limitleri tanımlı
- [ ] **Restart policy** - `unless-stopped` veya `always`
- [ ] **Logging** - Log rotation konfigüre edilmiş
- [ ] **Named volumes** - Bind mount yerine named volume
- [ ] **Network isolation** - Gereksiz servislere erişim kapalı
- [ ] **Read-only filesystem** - Mümkünse `read_only: true`
- [ ] **Non-root user** - Container'lar root olarak çalışmıyor
- [ ] **Security options** - `no-new-privileges`, cap_drop
- [ ] **Backup stratejisi** - Volume backup planı var
- [ ] **Monitoring** - Health check ve log monitoring aktif

---

## 10. Kaynaklar 📚

- [Docker Compose Resmi Dokümantasyon](https://docs.docker.com/compose/)
- [Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

> **💡 Pro Tip:** Compose dosyanızı her zaman version control'e (Git) ekleyin, ancak `.env` dosyasını **asla** commit etmeyin!
