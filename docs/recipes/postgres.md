# PostgreSQL Production-Ready Kurulum 🐘

Bu rehber, sunucunuzda **tek bir merkezi** PostgreSQL sunucusu kurarak, kaynakları verimli kullanan, güvenli ve performansı optimize edilmiş bir yapı oluşturmanızı sağlar.

## 1. Klasör Yapısı

Tüm veritabanı dosyaları tek bir merkezde toplanır.

```text
/mnt/block/postgres/
├── docker-compose.yml
├── secrets/
│   └── db_password.txt
├── config/
│   └── postgresql.conf
├── data/                    (otomatik oluşacak - PERSISTENT DATA)
└── logs/                    (otomatik oluşacak)
```

## 2. Kurulum Adımları

SSH ile sunucuya bağlanın ve aşağıdaki adımları sırasıyla uygulayın.

### Adım 1: Klasörleri Oluştur

```bash
cd /mnt/block
sudo mkdir -p postgres/{secrets,config,data,logs}
# İzinleri ayarla (Docker içinde sorun çıkmaması için)
sudo chown -R $USER:$USER postgres
cd postgres
```

### Adım 2: Secret (Şifre) Dosyası

Environment variable yerine dosya tabanlı secret kullanmak en güvenli yöntemdir.

```bash
# Güçlü şifre oluştur
openssl rand -base64 32 > secrets/db_password.txt

# Sadece owner okuyabilsin (Güvenlik)
chmod 600 secrets/db_password.txt

# Şifreyi gör ve BİR YERE KAYDET! (Bir daha göremeyebilirsiniz)
cat secrets/db_password.txt
```

### Adım 3: PostgreSQL Config (Tuning)

Varsayılan ayarlar production için zayıftır. Aşağıdaki konfigürasyon **24GB RAM**'li bir sunucu (örn: Oracle ARM) için optimize edilmiştir.

> [!NOTE]
> Daha düşük RAM için `shared_buffers` ve `work_mem` değerlerini düşürün. (Genelde `shared_buffers` RAM'in %25'i olmalıdır).

```bash
cat << 'EOF' > config/postgresql.conf
# ===========================================
# PostgreSQL Production Config
# ===========================================

# Bağlantılar
listen_addresses = '*'
max_connections = 100

# Hafıza (Örn: 24GB RAM için)
shared_buffers = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB
effective_cache_size = 18GB

# Write Ahead Log (WAL) - Veri güvenliği
wal_level = replica
max_wal_size = 2GB
min_wal_size = 512MB
checkpoint_completion_target = 0.9

# Loglama (Saldırı ve Hata tespiti için)
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_statement = 'ddl'    # Sadece tablo yapı değişikliklerini logla
log_connections = on
log_disconnections = on
log_lock_waits = on

# Locale
lc_messages = 'en_US.UTF-8'
EOF
```

### Adım 4: Docker Compose

Bu dosya servisi ayağa kaldırır ve güvenlik kısıtlamalarını uygular.

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres-global
    restart: unless-stopped

    # Şifre dosyadan okunuyor (security best-practice)
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: defaultdb
      PGDATA: /var/lib/postgresql/data/pgdata

    secrets:
      - db_password

    volumes:
      - ./data:/var/lib/postgresql/data
      - ./config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./logs:/var/lib/postgresql/data/log

    # Custom config dosyasını kullan
    command: postgres -c config_file=/etc/postgresql/postgresql.conf

    # --- Hardening (Sıkılaştırma) ---
    read_only: true # Dosya sistemi salt-okunur
    tmpfs: # Geçici dosyalar RAM'de
      - /tmp
      - /var/run/postgresql
    shm_size: 512mb # Performans için kritik

    # Resource limits (Komşuları rahatsız etme)
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 8G
        reservations:
          memory: 2G

    # SADECE internal network - Dışarıya port YOK!
    # Geliştirme için port açacaksanız UFW ile koruyun!
    # Port Stratejisi: 5432 yerine 54321 kullanıyoruz (Obscurity)
    ports:
      - "54321:5432"
    networks:
      - shared-network

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d defaultdb"]
      interval: 10s
      timeout: 5s
      retries: 5

secrets:
  db_password:
    file: ./secrets/db_password.txt

networks:
  shared-network:
    name: shared-network
    driver: bridge
```

### Adım 5: Başlat ve Test Et

```bash
# 1. Ortak ağı oluştur (Diğer projeler de buna bağlanacak)
docker network create shared-network 2>/dev/null || true

# 2. Servisi başlat
docker compose up -d

# 3. Logları kontrol et
docker logs -f postgres-global

# 4. Bağlantı testi (Admin olarak)
docker exec -it postgres-global psql -U admin -d defaultdb -c "SELECT version();"
```

## 3. Projeler Nasıl Bağlanır?

Yeni bir proje (örneğin bir Node.js API) oluşturduğunuzda, `docker-compose.yml` içinde ayrıca bir veritabanı servisi tanımlamayın. Bunun yerine bu global servise bağlanın.

### A. Veritabanı Oluşturma

Projeyi deploy etmeden önce database'i oluşturun:

```bash
docker exec -it postgres-global psql -U admin -d defaultdb << 'EOF'
CREATE DATABASE proje1_db;
CREATE USER proje1_user WITH ENCRYPTED PASSWORD 'projeye_ozel_sifre';
GRANT ALL PRIVILEGES ON DATABASE proje1_db TO proje1_user;
EOF
```

### B. Proje Docker Compose Ayarı

```yaml
# /mnt/block/projeler/proje1/docker-compose.yml
services:
  api:
    image: my-company/api:latest
    environment:
      # Host adı container_name ile aynıdır: postgres-global
      DATABASE_URL: postgres://proje1_user:projeye_ozel_sifre@postgres-global:5432/proje1_db
    networks:
      - shared-network

networks:
  shared-network:
    external: true # Mevcut global ağı kullan
```

## 4. Uzaktan Erişim (Geliştirme İçin)

Veritabanına local bilgisayarınızdan bağlanıp geliştirmek yapmak için iki yöntem vardır.

### Yöntem 1: SSH Tünel (Önerilen - En Güvenli)

Port açmanıza (`ports:`) gerek yoktur. SSH üzerinden güvenli bir tünel açarak bağlanırsınız.

```bash
# Local bilgisayarınızda:
# Remote'daki 5432 portunu (Internal), Local'deki 5433 portuna bağla
ssh -L 5433:localhost:5432 root@sunucu-ip
```

Bağlantı aracınızda (DBeaver, DataGrip):

- **Host:** localhost
- **Port:** 5433
- **User:** admin

### Yöntem 2: Public Port (IP Kısıtlamalı)

`docker-compose.yml` dosyasında `ports: - "54321:5432"` satırını açın.
Ancak portu tüm dünyaya açmak yerine UFW ile **sadece kendi IP'nize** izin verin.

```bash
# 1. Varsayılan kural: Herkesi engelle
sudo ufw deny 54321

# 2. Sadece kendi IP'ne izin ver (STANDART DISI PORT)
# (Kendi IP adresini 'curl ifconfig.me' ile öğren)
sudo ufw allow from 88.241.x.x to any port 54321 proto tcp

# 3. Kontrol et
sudo ufw status
```

> [!WARNING]
> Şifreniz güçlü olsa bile portu tüm dünyaya (`allow 54321`) açmayın. Fail2Ban arka planda çalışsa da, 0-day açıklarına karşı risk alırsınız.

## 4. Faydalı Komutlar

| İşlem                  | Komut                                                                                                  |
| :--------------------- | :----------------------------------------------------------------------------------------------------- |
| **Bağlan (SQL Shell)** | `docker exec -it postgres-global psql -U admin -d defaultdb`                                           |
| **Logları Gör**        | `docker logs -f postgres-global`                                                                       |
| **Aktif Bağlantılar**  | `docker exec postgres-global psql -U admin -c "SELECT * FROM pg_stat_activity;"`                       |
| **Disk Boyutu**        | `docker exec postgres-global psql -U admin -c "SELECT pg_size_pretty(pg_database_size('defaultdb'));"` |
| **Hızlı Backup**       | `docker exec postgres-global pg_dumpall -U admin > backup-$(date +%F).sql`                             |

## 5. Güvenlik ve Performans Özeti

- ✅ **Şifre:** Dosya tabanlı (Secrets) yönetiliyor, environment variable'da görünmüyor.
- ✅ **Network:** Dışarıya kapalı veya UFW ile IP kısıtlamalı.
- ✅ **Dosya Sistemi:** `read_only` modunda, saldırganların dosya yazmasını engeller.
- ✅ **Performans:** `postgresql.conf` ile donanıma uygun tuning yapıldı.
- ✅ **Monitoring:** Healthcheck ve detaylı loglama aktif.
