# Production Nginx Config

Bu config, TLS termination ve reverse proxy icin baslangic seviyesinde production baseline'dir. Hedef, minimum hareketli parca ile guvenli bir edge katmani kurmaktir.

## Safe Defaults

- HTTP isteklerini HTTPS'e yonlendir
- upstream'i sadece internal servis adina bagla
- TLS sertifika path'lerini container volume ile ver
- security header'lari acik birak
- gereksiz modulleri veya karmasik rewrite kurallarini ekleme

## Template

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

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    server_tokens off;
    gzip on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;

    server {
        listen 80;
        server_name example.com;

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name example.com;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;

        location /healthz {
            access_log off;
            return 200 "ok\n";
            add_header Content-Type text/plain;
        }

        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 60s;
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
        }
    }
}
```

## Deployment Notes

- TLS terminate ediyorsa sertifikalari rotate edilebilir volume ile bagla
- upstream timeout'lari uygulamanin gercek cevabina gore ayarla
- websocket varsa `Upgrade` ve `Connection` header'larini koru
- `server_tokens off` acik kalsin

## Validation

```bash
nginx -t
nginx -T | sed -n '1,220p'
```

Kontrol listesi:

- config syntax geciyor mu
- server_name dogru domain ile eslesiyor mu
- TLS dosyalari okunabiliyor mu
- upstream adresi container network icinden resolve oluyor mu

## Deployment Verification

```bash
curl -I http://example.com
curl -Ik https://example.com
curl -fsS https://example.com/healthz
```

Beklenen sonuc:

- HTTP 301 ile HTTPS'e gider
- HTTPS sertifika hatasiz acilir
- health endpoint 200 doner
