# Nginx Recipe

Bu recipe, uygulamalarin onune konan edge proxy veya reverse proxy icin kullanilir. Hedef; TLS sonlandirma, header hardening, route kontrolu ve traffic shaping'i tek yerde toplamak.

## Ne Zaman Secilir

- React veya .NET gibi uygulamalarin onunde reverse proxy gerekiyorsa
- TLS termination Nginx'te yapilacaksa
- Path bazli routing, static asset serving veya rate limit gerekiyorsa

## Varsayimlar

- Uygulama upstream'i loopback veya private network ustunden erisilebilir
- Public servis portu sadece proxy tarafinda acilir
- Sertifikalar dis kaynakli veya otomatik yenilenen bir akisla saglanir

## Hardening Kararlari

- `server_tokens off`
- TLS sadece `TLSv1.2` ve `TLSv1.3`
- Request size ve timeout limitleri sinirli
- Security header'lar varsayilan
- Upstream'e dogrudan public erisim verilmez

## Baseline Konfigürasyon

```nginx
user nginx;
worker_processes auto;

error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    server_tokens off;

    client_max_body_size 8m;
    client_header_timeout 12;
    client_body_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'" always;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    include /etc/nginx/conf.d/*.conf;
}
```

## App Proxy Server

```nginx
server {
    listen 8443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://app:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Compose Baseline

```yaml
services:
  proxy:
    image: nginxinc/nginx-unprivileged:1.27-alpine
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
    ports:
      - "80:8080"
      - "443:8443"
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/ >/dev/null"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## Verification

```bash
nginx -t
docker compose config
curl -Ik https://example.com
```

Beklenen durum:

- Config syntax temiz olmali
- Upstream headers dogru tasinmali
- TLS handshake basarili olmali
- Rate limiting uygulandiginda 429 gorulebilmeli
