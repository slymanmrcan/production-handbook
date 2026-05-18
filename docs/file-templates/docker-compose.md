# Docker Compose Template

Bu sayfa production'a dogrudan kopyalanacak bir "baseline" sunar. Amaç tek dosyada her seyi cozmeye calismak degil, network, secret, storage ve restart davranisini netlestirmektir.

## Tasarim Kurallari

- public portlari sadece proxy katmaninda ac
- uygulama container'ini host'a degil loopback veya internal network'e bagla
- database ve cache servisini disari acma
- secret degerleri compose dosyasinda inline yazma
- volume ve network isimlerini acik tut

## Template

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: my_app
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      NODE_ENV: production
      APP_PORT: 3000
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - db
      - redis
    networks:
      - internal_net

  nginx:
    image: nginx:1.27-alpine
    container_name: my_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - internal_net

  db:
    image: postgres:15-alpine
    container_name: my_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - internal_net

  redis:
    image: redis:7-alpine
    container_name: my_redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    networks:
      - internal_net

volumes:
  db_data:
  redis_data:

networks:
  internal_net:
    driver: bridge
```

## Deployment Notes

- `env_file` ile secret ve runtime ayarlari ayri dursun
- `depends_on` sadece baslama sirasi icindir, health kontrol yerine gecmez
- production'da uygulama ve database icin kalici volume kullan
- proxy disinda port publish etme

## Validation

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f --tail=50 app
```

Kontrol listesi:

- compose interpolation hatasiz calisiyor mu
- servis isimleri birbiriyle ayni network'te gorunuyor mu
- host'a sadece gerekli portlar aciliyor mu
- container'lar restart policy ile ayakta kaliyor mu

## Deployment Verification

```bash
curl -fsS http://127.0.0.1:3000/healthz
docker compose exec db psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-myapp}" -c '\l'
docker compose exec redis redis-cli ping
```

Eger proxy katmani kullaniliyorsa disari acik son nokta HTTP degil HTTPS olmali. Uygulama container'ini dogrudan public porta baglama.
