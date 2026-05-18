# React + Nginx Recipe

Bu recipe, SPA frontend'i statik olarak paketleyip Nginx ile servis etmek icin kullanilir. Hedef; runtime shell'i azaltmak, root yuzeyini daraltmak ve app katmanini reverse proxy arkasinda tutmaktir.

## Ne Zaman Secilir

- React/Vue/Angular gibi statik build cikisi olan frontend'lerde
- Frontend'in backend API'den ayrildigi senaryolarda
- CDN yoksa ama yine de basit ve guvenli bir edge katmani gerekiyorsa

## Varsayimlar

- Build islemi CI veya localde tamamlanir
- Uygulama static asset uretir
- Public trafik sadece proxy katmanindan gelir
- Frontend dogrudan database veya secret store'a ulasmaz

## Hardening Kararlari

- `nginxinc/nginx-unprivileged` kullanilir
- Container `read_only` calisir
- `tmpfs` ile gecici write alanlari sinirlanir
- `cap_drop: [ALL]` ile capability yuzeyi kapatilir
- `no-new-privileges:true` ile privilege escalation engellenir

## Nginx Konfigürasyonu

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;
    server_tokens off;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable" always;
    }
}
```

## Multi-Stage Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

## Compose Baseline

```yaml
services:
  frontend:
    build: .
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
      - /var/run
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

## Doğrulama

```bash
docker build -t my-react-app .
docker run --rm -p 8080:8080 my-react-app
curl -fsS http://127.0.0.1:8080/
```

Beklenen durum:

- Build basarili olmali
- Container root filesystem'e yazmaya calismamali
- SPA route'lar `index.html` ile geri donmeli
- HTTP response header'lari beklenen security baselines ile gelmeli
