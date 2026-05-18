# Redis Container Baseline

Redis bu rehberde cache, queue ve session storage icin kullanilir. Varsayimimiz su: Redis public internete acilmaz, app container'lariyla ayni private network'te calisir ve disariya sadece ihtiyac varsa localhost uzerinden acilir.

## Ne Zaman Kullanilir

- Application cache lazimsa
- Queue backend lazimsa
- Kisa omurlu session veya token storage gerekiyorsa

## Ne Yapmaz

- Public cache servisi olarak internete acilmaz
- Kalici ana veri deposu yerine gecmez
- Auth'suz veya network izolasyonsuz calistirilmaz

## Baseline Politika

- `requirepass` veya ACL kullan
- Production'da AOF'i acik tut
- Yalnizca internal network'e bagla
- `maxmemory` ve eviction policy tanimla
- Host portu yayinlama; gerekiyorsa sadece `127.0.0.1` uzerinden yayinla

## Ornek Compose

```yaml
version: "3.8"

networks:
  backend:
    name: backend
    internal: true

volumes:
  redis_data:

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command:
      - redis-server
      - --appendonly
      - "yes"
      - --save
      - "60"
      - "1000"
      - --requirepass
      - ${REDIS_PASSWORD}
      - --maxmemory
      - 256mb
      - --maxmemory-policy
      - allkeys-lru
      - --protected-mode
      - "yes"
    volumes:
      - redis_data:/data
    networks:
      - backend
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a $$REDIS_PASSWORD ping | grep -q PONG"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
```

## Operasyon Notlari

- `requirepass` istemci tarafinda dotenv veya secret manager ile beslenmeli
- AOF acik oldugunda disk kullanimi ve fsync davranisini izle
- Cache ve queue kullanimi icin ayrica memory limiti belirle
- Redis'i DB gibi kullanacaksan backup ve restore disiplinini ayri tasarla

## Verification

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" INFO persistence | rg 'aof|rdb'
docker compose logs redis --tail=50
```

Beklenen sonuclar:

- Compose config parse edilmeli
- Container `healthy` veya `running` olmali
- `PING` cevabi `PONG` olmali
- AOF/RDB durumu beklenen modda gorunmeli

## Common Mistakes

- Redis'i host portu ile public'e acmak
- `maxmemory` tanimlamadan cache olarak kullanmak
- Secret'i compose dosyasina hardcode etmek
- Persistence'i kapatip kalici veri beklemek
