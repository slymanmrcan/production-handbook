# Traefik Edge Proxy Baseline

Traefik bu rehberde hostun disina acilan edge proxy olarak kullanilir. Varsayimimiz su: uygulama konteynerleri private bir Docker network uzerinde calisir, sadece Traefik public portlari dinler ve TLS termination burada yapilir.

## Ne Zaman Kullanilir

- Docker tabanli birden fazla servisi tek noktadan publish etmek istediginde
- Host uzerinde Nginx yerine Docker-native service discovery istediginde
- Uygulama container labels ile route edilmeli ise

## Ne Yapmaz

- Public olmayan servisleri otomatik olarak guvenli yapmaz
- Yanlis expose edilmis container'lari tek basina kurtarmaz
- Uygulama tarafindaki auth veya rate limit ihtiyacini ortadan kaldirmaz

## Baseline Politika

- `exposedByDefault=false` kullan
- Docker socket sadece read-only baglanmali
- Traefik yalnizca `proxy` gibi tek bir user-defined network ile konusmali
- Dashboard acilacaksa ayrica auth ve IP kısıtı ile korunmali
- `latest` tag kullanma, incelenmis bir release tag'i pinle

## Ornek Compose

```yaml
version: "3.8"

networks:
  proxy:
    name: proxy

services:
  traefik:
    image: traefik:v3.1
    restart: unless-stopped
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=proxy
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --log.level=INFO
      - --accesslog=true
      - --api.dashboard=true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - proxy
    read_only: true
    tmpfs:
      - /tmp
      - /run
    security_opt:
      - no-new-privileges:true
    labels:
      - traefik.enable=true
      # Dashboard'i public acmayin; gerekiyorsa ayrica router + auth tanimlayin.
```

## Uygulama Ekleme

Route etmek istedigin servis ayni `proxy` network'unde olmali ve label ile acilmalidir.

```yaml
services:
  app:
    image: ghcr.io/example/app:1.0.0
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.http.routers.app.rule=Host(`app.example.com`)
      - traefik.http.routers.app.entrypoints=websecure
      - traefik.http.routers.app.tls=true
      - traefik.http.services.app.loadbalancer.server.port=8080
```

## Operasyon Notlari

- `docker.sock` Traefik icin gucludur; kimlerin compose calistirdigini kontrol et.
- TLS sertifikasi icin Let’s Encrypt kullanacaksan acik bir certificate resolver tanimla ve rate limit'e dikkat et.
- Dashboard'u sadece local veya bastion uzerinden erisilebilir tut.
- Loglar ilk triage icin degerlidir; access log kapatma karari bilincli verilmelidir.

## Verification

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs traefik --tail=50
curl -I http://127.0.0.1
```

Beklenen sonuclar:

- `docker compose config` hata vermemeli
- Traefik container `running` olmali
- `80` istegi `443`'e redirect etmeli
- Loglarda provider load ve entrypoint ayarlari gorunmeli

## Common Mistakes

- `exposedbydefault=true` ile tum container'lari internete acmak
- Dashboard'u auth'suz yayinlamak
- Docker socket'i write erişimli baglamak
- App container'i Traefik network'unden bagimsiz calistirmak
