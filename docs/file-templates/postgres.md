# PostgreSQL (Production Ready) 🐘

Bu şablon, veritabanınızı **Docker Secrets** kullanarak ve **Capability Dropping** yaparak en güvenli şekilde ayağa kaldırmanızı sağlar. Ayrıca başlangıç senaryolarını (seed data) destekler.

---

## 🏗️ Klasör Yapısı

Sunucuda `/opt/postgres` veya benzeri bir dizinde şu yapıyı kurmalısınız:

```text
postgres/
├── docker-compose.yml
├── .env                  # Sadece versiyon vb. değişkenler (ŞİFRE YOK!)
├── secrets/              # Şifrelerin tutulduğu klasör
│   └── db_password.txt
├── configs/              # Özel konfigürasyonlar
│   └── postgresql.conf
├── init-scripts/         # [YENİ] Başlangıçta çalışacak SQL'ler
│   └── 01-init.sql
└── data/                 # Verilerin tutulacağı yer
```

---

## 🔐 1. Secrets (Şifreler)

Şifreleri environment variable yerine dosyadan okutmak, `docker inspect` yapıldığında şifrelerin görünmesini engeller.

1.  Klasörü oluşturun: `mkdir secrets`
2.  Dosyaları oluşturun (Satır sonu boşluğu olmasın):

```bash
echo "CokGizliSifre123" > secrets/db_password.txt
chmod 600 secrets/* # Dosyaları sadece root okuyabilsin
```

> [!TIP]
> PostgreSQL tarafında ek bir "root" parolası kullanmıyorsanız gereksiz secret dosyası üretmeyin. Kullanılmayan secret dosyası operasyonel gürültü ve yanlış güven hissi üretir.

---

## 📜 2. Başlangıç Scriptleri (Init Scripts)

Veritabanı **ilk kez** oluşturulurken (veri klasörü boşken) çalışmasını istediğiniz SQL veya Shell scriptlerini `init-scripts/` klasörüne koyabilirsiniz. İsim sırasına göre çalışırlar (`01-...`, `02-...`).

**Örnek `init-scripts/01-init.sql`:**

```sql
-- Ekstra veritabanı oluştur
CREATE DATABASE analytics;

-- Bir tablo oluştur
\connect analytics;
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🐳 3. Docker Compose Dosyası

`docker-compose.yml` içeriği:

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: production_db
    restart: always
    init: true
    stop_grace_period: 30s
    # Özel config dosyasını kullanması için komut:
    command: postgres -c "config_file=/etc/postgresql/postgresql.conf"
    ports:
      - "127.0.0.1:5432:5432" # SADECE localhost'a aç
    environment:
      POSTGRES_DB: app_production
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      # Veri Kalıcılığı
      - /mnt/blockvolume/postgres-data:/var/lib/postgresql/data
      # Özel Config
      - ./configs/postgresql.conf:/etc/postgresql/postgresql.conf
      # [YENİ] Başlangıç Scriptleri
      - ./init-scripts:/docker-entrypoint-initdb.d
    secrets:
      - db_password

    # --- GÜVENLİK (HARDENING) ---
    # Container'ın gereksiz tüm Linux yetkilerini alıyoruz
    cap_drop:
      - ALL
    # Sadece Postgres'in çalışması için gerekenleri geri veriyoruz
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
      # Bazı durumlarda DAC_OVERRIDE gerekebilir ama önce bunlar denenmeli
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
    pids_limit: 256

    # --- KAYNAKLAR ---
    mem_limit: 4g
    cpus: 2.0
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user -d app_production"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - db_net

secrets:
  db_password:
    file: ./secrets/db_password.txt

networks:
  db_net:
    driver: bridge
    internal: true
```

## Hardening Notları

- `ports:` satırı bilinçli olarak `127.0.0.1` ile sınırlandı; public erişim gerekiyorsa önce reverse proxy veya SSH tunnel düşünün.
- `security_opt: no-new-privileges:true` privilege escalation riskini daraltır.
- `pids_limit` ve log rotation, runaway query veya kötü niyetli süreçlerde host'u korur.
- `init-scripts/` sadece ilk init sırasında çalışır; mevcut data volume ile tekrar beklemeyin.
- Config ve secret dosyaları repo dışı host dizininde, dar izinlerle tutulmalı.

---

## ⚙️ 4. Konfigürasyon (`postgresql.conf`)

`configs/postgresql.conf` dosyası:

```ini
# --- BAĞLANTI ---
listen_addresses = '*'
max_connections = 100

# --- BELLEK (4GB RAM için Tuning) ---
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB

# --- LOGLAMA ---
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'ddl'
```

---

## 🚀 5. Başlatma

```bash
docker compose up -d
```

## Deployment Verification

```bash
docker compose ps
docker inspect production_db --format '{{json .HostConfig.PortBindings}}'
docker inspect production_db --format '{{json .HostConfig.CapDrop}} {{json .HostConfig.SecurityOpt}} {{.HostConfig.PidsLimit}}'
docker exec production_db pg_isready -U app_user -d app_production
docker exec production_db psql -U app_user -d app_production -c 'SHOW config_file;'
ss -ltnp | grep 5432
```

Beklenen sonuç:

- Container `healthy` görünmeli.
- Port binding sadece `127.0.0.1:5432` olmalı.
- `CapDrop` içinde `ALL`, `SecurityOpt` içinde `no-new-privileges` görünmeli.
- `pg_isready` başarılı dönmeli.
- `SHOW config_file;` çıktısı bind ettiğiniz özel config dosyasını göstermeli.
