# MySQL / MariaDB Container Baseline

Bu sayfa MySQL veya MariaDB icin productiona yakin bir konteyner baseline verir. Varsayimimiz su: veritabani public internete acilmaz, veri kalici volume'de tutulur ve uygulama sadece private network uzerinden baglanir.

## Ne Zaman Kullanilir

- Uygulama icin kalici SQL state gerekiyorsa
- Container icinde sade ve tekrar edilebilir bir DB stack istiyorsan
- Lokal debug icin host'a acik ama localhost ile sinirli bir erisim gerekiyorsa

## Baseline Politika

- Root password `.env` veya secret manager'dan gelsin
- DB kullanicisi ile app kullanicisi ayrilsin
- Public port acma; gerekiyorsa sadece `127.0.0.1:3306`
- `skip_name_resolve=1` ve `utf8mb4` gibi temel ayarlari standartlastir
- Ayri backup job kullan; DB konteynerini tek basina backup stratejisi sanma

## Ornek Compose

```yaml
version: "3.8"

networks:
  backend:
    name: backend
    internal: true

volumes:
  db_data:

services:
  db:
    image: mariadb:11.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASS}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASS}
    volumes:
      - db_data:/var/lib/mysql
      - ./my.cnf:/etc/mysql/conf.d/my.cnf:ro
    networks:
      - backend
    ports:
      - "127.0.0.1:3306:3306"
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -uroot -p$$MYSQL_ROOT_PASSWORD --silent"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
```

## my.cnf Baseline

```ini
[mysqld]
bind-address=0.0.0.0
skip_name_resolve=1
local_infile=0
max_connections=200
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
innodb_buffer_pool_size=256M
sql_mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

## Operasyon Notlari

- `bind-address=0.0.0.0` container icindeki private network icin uygundur; host portu hala localhost ile sinirli olmali
- `local_infile=0` CSV/LOAD DATA riskini azaltir
- Buffer pool ve `max_connections` degerlerini host RAM'ine gore ayarla
- Uzun vadeli veri icin backup ve restore testi zorunludur

## Verification

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose exec db mysqladmin ping -uroot -p"$DB_ROOT_PASS"
docker compose exec db mysql -uroot -p"$DB_ROOT_PASS" -e "SELECT 1;"
docker compose logs db --tail=50
```

Beklenen sonuclar:

- Compose config hata vermemeli
- Container `healthy` veya `running` olmali
- `mysqladmin ping` `mysqld is alive` donmeli
- Basit SQL sorgusu calismali

## Common Mistakes

- DB'yi public IP'ye acmak
- App kullanicisi yerine root ile baglanmak
- Persistent volume olmadan stateful DB calistirmak
- Backup/restore testini yapmadan production'a cikmak
