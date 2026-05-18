# Redis (Production Ready) 🔴

Redis varsayılan olarak "güvensiz" gelir (şifresizdir, her yere açıktır). Bu şablon ile onu **sertleştirilmiş (hardened)**, güvenli ve kalıcı (persistent) hale getiriyoruz.

---

## 🏗️ Klasör Yapısı

```text
redis/
├── docker-compose.yml
├── .env
├── configs/
│   └── redis.conf
└── data/                 # Verilerin tutulacağı yer
```

---

## 🐳 1. Docker Compose Dosyası

`docker-compose.yml` içeriği:

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    container_name: production_redis
    restart: always
    # Config dosyasını yüklemek için explicit komut:
    command: redis-server /usr/local/etc/redis/redis.conf
    ports:
      - "127.0.0.1:6379:6379" # SADECE localhost'a aç!
    volumes:
      - ./data:/data
      - ./configs/redis.conf:/usr/local/etc/redis/redis.conf

    # --- GÜVENLİK (HARDENING) ---
    # Container yetkilerini minimuma indiriyoruz
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
      - DAC_OVERRIDE

    # --- KAYNAKLAR ---
    mem_limit: 1g
    cpus: 1.0

    sysctls:
      # Redis performans ayarı
      net.core.somaxconn: 1024

    healthcheck:
      test:
        [
          "CMD",
          "redis-cli",
          "-a",
          "CokGucluBirRedisSifresiBelirleyin_!23",
          "ping",
        ]
      interval: 10s
      timeout: 5s
      retries: 3
```

---

## ⚙️ 2. Konfigürasyon (`redis.conf`)

`configs/redis.conf` dosyası oluşturun. `command` satırı sayesinde Redis bu dosyayı okuyacaktır.

### A. Güvenlik Ayarları 🛡️

```ini
# --- AĞ ---
bind 0.0.0.0      # Docker içinde (Dışarıya Compose ile kapattık)
protected-mode yes

# --- ŞİFRELEME ---
requirepass "CokGucluBirRedisSifresiBelirleyin_!23"
# Not: ACL (Access Control List) kullanmak isterseniz "user" tanımları yapabilirsiniz.

# --- TEHLİKELİ KOMUTLARI KAPATMA ---
# Saldırganın sunucuyu silmesini engelle
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command DEBUG ""
```

### B. Kalıcılık (Persistence) 💾

Veri kaybını önlemek için hem **RDB** (Snapshot) hem **AOF** (Log) açıyoruz.

```ini
# --- RDB (Snapshot) ---
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /data

# --- AOF (Append Only File) ---
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
```

### C. Bellek Yönetimi 🧠

```ini
# RAM sınırına gelince hata ver (eviction yapma)
maxmemory 768mb
maxmemory-policy noeviction
```

---

## 🚀 3. Başlatma

```bash
docker compose up -d
```

### Test Etme

```bash
# Şifreli Ping
docker exec -it production_redis redis-cli -a "CokGucluBirRedisSifresiBelirleyin_!23" ping
# PONG
```

> [!TIP] > **Neden `command` kullandık?**
> Varsayılan Redis imajı, config dosyası olmadan başlar. Biz `command: redis-server /path/to/conf` diyerek "benim ayarlarımı kullan" demiş olduk.
