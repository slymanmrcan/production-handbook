# MariaDB (Production Ready) 🐬

MariaDB, MySQL'in açık kaynak fork'u olup, Oracle kontrolünden bağımsız, topluluk odaklı bir veritabanıdır. Performans ve güvenlik açısından optimize edilmiştir.

---

## ⚖️ MariaDB vs MySQL vs PostgreSQL

| Özellik            | MariaDB                          | MySQL                 | PostgreSQL                    |
| :----------------- | :------------------------------- | :-------------------- | :---------------------------- |
| **Lisans**         | GPL (Özgür)                      | GPL (Oracle kontrolü) | PostgreSQL License            |
| **Performans**     | Hızlı (özellikle küçük işlemler) | Hızlı                 | Çok güçlü (karmaşık sorgular) |
| **Storage Engine** | Aria, InnoDB, ColumnStore        | InnoDB                | Native (MVCC)                 |
| **Kullanım**       | Web uygulamaları, WordPress      | Genel amaçlı          | Analitik, büyük veri          |

---

## 🏗️ Klasör Yapısı

```text
mariadb/
├── docker-compose.yml
├── .env
├── secrets/
│   └── db_root_password.txt
├── configs/
│   └── my.cnf
├── data/                    # Veritabanı dosyaları
└── init-scripts/            # İlk çalıştırmada çalışacak SQL'ler
    └── 01-create-users.sql
```

---

## 🐳 Docker Compose Dosyası

`docker-compose.yml`:

```yaml
version: "3.8"

services:
  mariadb:
    image: mariadb:11.2-jammy # LTS sürümü
    container_name: production_mariadb
    restart: always

    # Güvenlik - Docker Secrets kullanımı
    secrets:
      - db_root_password

    environment:
      MARIADB_ROOT_PASSWORD_FILE: /run/secrets/db_root_password
      MARIADB_DATABASE: app_db
      MARIADB_USER: app_user
      MARIADB_PASSWORD: AppUserPassword123!
      TZ: Europe/Istanbul

    ports:
      # Sadece localhost'a aç (dışarıya kapalı)
      - "127.0.0.1:13306:3306"

    volumes:
      - ./data:/var/lib/mysql
      - ./configs/my.cnf:/etc/mysql/conf.d/custom.cnf:ro
      - ./init-scripts:/docker-entrypoint-initdb.d:ro

    # --- GÜVENLİK (HARDENING) ---
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
      - DAC_OVERRIDE # Dosya izinleri için gerekli

    security_opt:
      - no-new-privileges:true

    # --- KAYNAK LİMİTLERİ ---
    mem_limit: 2g
    mem_reservation: 512m
    cpus: 2.0

    # --- SAĞLIK KONTROLÜ ---
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

    networks:
      - backend_net

secrets:
  db_root_password:
    file: ./secrets/db_root_password.txt

networks:
  backend_net:
    driver: bridge
```

---

## 🔐 Secrets Oluşturma

```bash
# Secrets klasörü
mkdir -p secrets

# Root şifresi (GÜVENLİ bir şifre belirleyin!)
echo "SuperSecureRootPassword123!" > secrets/db_root_password.txt
chmod 600 secrets/db_root_password.txt
```

---

## ⚙️ Performans Ayarları (`my.cnf`)

`configs/my.cnf`:

```ini
[mysqld]
# --- BAĞLANTI AYARLARI ---
max_connections = 200
connect_timeout = 10
wait_timeout = 600
max_allowed_packet = 64M

# --- BELLEK YÖNETİMİ ---
# Toplam RAM'in %50-70'i
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M

# Query cache (MariaDB 10.5+ için kaldırıldı, eski sürümlerde kullanılır)
# query_cache_size = 0
# query_cache_type = 0

# --- PERFORMANS ---
innodb_flush_log_at_trx_commit = 2  # 1=Güvenli ama yavaş, 2=Hızlı
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1

# --- KARAKTER SETİ ---
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# --- LOGLAMA ---
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# --- GÜVENLİK ---
# Uzaktan root girişini engelle
bind-address = 0.0.0.0  # Docker network içinde erişim için
skip-name-resolve = 1   # DNS lookup'ı atla (performans)

# --- ARIA STORAGE ENGINE (MariaDB'ye özgü) ---
aria_pagecache_buffer_size = 128M
```

---

## 📝 İlk Kurulum Script'i

`init-scripts/01-create-users.sql`:

```sql
-- Ek kullanıcılar oluştur
CREATE USER IF NOT EXISTS 'readonly_user'@'%' IDENTIFIED BY 'ReadOnlyPass123!';
GRANT SELECT ON app_db.* TO 'readonly_user'@'%';

-- Yedekleme kullanıcısı
CREATE USER IF NOT EXISTS 'backup_user'@'localhost' IDENTIFIED BY 'BackupPass123!';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON *.* TO 'backup_user'@'localhost';

FLUSH PRIVILEGES;
```

---

## 🚀 Başlatma

```bash
docker compose up -d
```

### Bağlantı Testi

```bash
# Container içinden
docker exec -it production_mariadb mariadb -u root -p

# Host'tan (port 13306)
mariadb -h 127.0.0.1 -P 13306 -u app_user -p
```

---

## 💾 Yedekleme

### Manuel Yedekleme

```bash
# Tüm veritabanlarını yedekle
docker exec production_mariadb mariadb-dump \
  -u root -p$(cat secrets/db_root_password.txt) \
  --all-databases \
  --single-transaction \
  --quick \
  --lock-tables=false \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Sadece app_db'yi yedekle
docker exec production_mariadb mariadb-dump \
  -u root -p$(cat secrets/db_root_password.txt) \
  --databases app_db \
  --single-transaction \
  > app_db_backup.sql
```

### Otomatik Yedekleme (Cron)

`backup.sh` scripti oluşturun:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/mariadb"
DATE=$(date +%Y%m%d_%H%M%S)
PASSWORD=$(cat /opt/mariadb/secrets/db_root_password.txt)

mkdir -p $BACKUP_DIR

docker exec production_mariadb mariadb-dump \
  -u root -p$PASSWORD \
  --all-databases \
  --single-transaction \
  --quick \
  | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 7 günden eski yedekleri sil
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

Cron'a ekleyin:

```bash
chmod +x backup.sh
crontab -e
# Her gece 02:00'de yedek al
0 2 * * * /opt/mariadb/backup.sh
```

---

## 🔧 Bakım Komutları

### Veritabanı Boyutu

```sql
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema;
```

### Tablo Optimizasyonu

```sql
-- Tüm tabloları optimize et
OPTIMIZE TABLE table_name;

-- Tüm veritabanını analiz et
ANALYZE TABLE table_name;
```

### Yavaş Sorguları Görüntüleme

```bash
docker exec production_mariadb tail -f /var/log/mysql/slow.log
```

---

## 🔒 Güvenlik İpuçları

> [!WARNING] > **Üretim Ortamı İçin:**
>
> 1. `MARIADB_ROOT_PASSWORD` asla `.env` dosyasına yazmayın, Docker Secrets kullanın
> 2. Port `13306`'yı sadece localhost'a açın (compose dosyasında `127.0.0.1:13306:3306`)
> 3. Firewall'da 3306 portunu **kapatın** (zaten localhost'a açık)
> 4. Düzenli yedek alın ve yedekleri **farklı bir sunucuda** saklayın

> [!TIP] > **Performans İyileştirme:**
>
> - `innodb_buffer_pool_size` → RAM'in %50-70'i
> - `innodb_flush_log_at_trx_commit = 2` → Hız için (veri kaybı riski az)
> - `skip-name-resolve = 1` → DNS lookup'ı atla

---

## 🐛 Sorun Giderme

**Container başlamıyor:**

```bash
docker logs production_mariadb --tail 50
```

**Bağlantı hatası:**

```bash
# Port dinliyor mu?
docker exec production_mariadb ss -tlnp | grep 3306

# Kullanıcı var mı?
docker exec -it production_mariadb mariadb -u root -p -e "SELECT User, Host FROM mysql.user;"
```

**Yavaş sorgular:**

```sql
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G
```
