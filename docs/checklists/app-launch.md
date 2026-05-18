# App Launch Checklist (Docker) 🐳

Uygulamanızı Docker ile canlıya almadan önce bu teknik detayları kontrol edin.

## 1. Container Sağlığı 🩺

- **Restart Policy:** `restart: always` veya `unless-stopped` ayarlı mı? (Sunucu reboot olunca kalkmalı).
- **Healthcheck:** `docker ps` yazdığınızda `(healthy)` ibaresini görüyor musunuz?
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:80/health"]
    interval: 30s
    retries: 3
  ```

## 2. Kaynak Yönetimi ⚖️

- **Limits:** CPU ve RAM limiti koydunuz mu? (Koymazsanız Memory Leak tüm sunucuyu kilitler).
  ```yaml
  deploy:
    resources:
      limits:
        cpus: "1.0"
        memory: 512M
  ```
- **PIDs Limit:** Fork bomb veya runaway worker için `pids_limit` koydunuz mu?
- **OOM Davranışı:** Container ölürse host etkilenmeden yeniden kalkış davranışı net mi?

## 3. Loglama Stratejisi 📜

- **Driver:** Docker varsayılan olarak sonsuz log yazar. Diski doldurmamak için limit şart.
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```

## 4. Network Exposure 🌐

- **Port Binding:** Sadece public olması gereken portlar dış dünyaya açık mı?
- **Host Network:** `network_mode: host` kullanmıyor musunuz?
- **Internal Services:** DB, Redis, queue gibi servisler `127.0.0.1` veya internal network ile sınırlı mı?
- **Health Endpoint:** Load balancer veya reverse proxy'nin vuracağı endpoint gerçekten çalışıyor mu?

## 5. Runtime Security 🔐

- **Non-Root User:** Container root olarak çalışmamalı.
- **Read-Only FS:** Uygun servislerde `read_only: true` ve dar `tmpfs` tanımlı olmalı.
- **No New Privileges:** `security_opt: [no-new-privileges:true]` aktif olmalı.
- **Capabilities:** Mümkünse `cap_drop: [ALL]` ile başlayıp sadece gereken capability'leri ekleyin.
- **Image Tag:** Deploy edilen image immutable tag veya digest ile gelmeli; kör `latest` kullanmayın.

## 6. Veri Kalıcılığı (Persistence) 💾

- **Volumes:** Veritabanı verisi (MySQL/Postgres) `volume` olarak mount edildi mi? (Bind mount veya Named volume).
  - _Test:_ Container'ı sil (`docker rm -f`) ve tekrar başlat. Veriler duruyor mu?

## 7. Çevresel Değişkenler (ENV) 🌍

- **Debug Mode:** `ASPNETCORE_ENVIRONMENT` veya `NODE_ENV` değişkeni **Production** mı?
- **Secrets:** API Key'ler kodun içinde (hardcoded) değil, değil mi?
- **Env File Hakları:** `.env` veya mounted secret dosyaları dar izinlerle tutuluyor mu?

## 8. Smoke & Rollback 🚬

- **Compose Render:** `docker compose config` hatasız parse edilmeli.
- **Rollback Artefact:** Bir önceki image tag veya compose revision erişilebilir olmalı.
- **Smoke Test:** Reverse proxy üstünden gerçek istek atıldığında beklenen HTTP kodu dönmeli.
- **DB Migration:** Şema değişikliği varsa migration sonrası healthcheck ve temel query doğrulanmalı.

## Verify Matrix ✅

| Kontrol | Verify Komutu | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| **Compose Syntax** | `docker compose config` | Compose dosyası hatasız render edilmeli. |
| **Restart Policy** | `docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' <container_id>` | `always` veya `unless-stopped` dönmeli. |
| **Healthcheck** | `docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' <container_id>` | Çıktı `healthy` olmalı. |
| **CPU / RAM Limits** | `docker inspect --format 'NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}}' <container_id>` | Her iki değer de `0` dışında olmalı. |
| **PIDs Limit** | `docker inspect --format '{{.HostConfig.PidsLimit}}' <container_id>` | `0` dışında bir limit görünmeli. |
| **Log Ayarı** | `docker inspect --format '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}' <container_id>` | `json-file` veya merkezi log driver ve `max-size` / `max-file` ayarı görünmeli. |
| **Port Binding** | `docker inspect --format '{{json .HostConfig.PortBindings}}' <container_id>` | Sadece beklenen public portlar görünmeli. |
| **Network Mode** | `docker inspect --format '{{.HostConfig.NetworkMode}}' <container_id>` | `host` olmamalı; beklenen bridge/custom network görünmeli. |
| **Non-Root** | `docker inspect --format '{{.Config.User}}' <container_id>` | Boş olmamalı ve `root` olmamalı. |
| **Read-Only FS** | `docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' <container_id>` | Uygunsa `true` görünmeli. |
| **No New Privileges** | `docker inspect --format '{{json .HostConfig.SecurityOpt}}' <container_id>` | `no-new-privileges:true` görünmeli. |
| **Capabilities** | `docker inspect --format '{{json .HostConfig.CapDrop}} {{json .HostConfig.CapAdd}}' <container_id>` | Gereksiz capability'ler düşürülmüş olmalı. |
| **Persistence** | `docker inspect --format '{{range .Mounts}}{{println .Type "->" .Destination}}{{end}}' <container_id>` | DB veya kalıcı veri dizinleri mount edilmiş görünmeli. |
| **NODE_ENV** | `docker exec <container_id> printenv NODE_ENV` | `production` dönmeli. |
| **ASPNETCORE_ENVIRONMENT** | `docker exec <container_id> printenv ASPNETCORE_ENVIRONMENT` | `Production` dönmeli. |
| **Image Tag** | `docker inspect --format '{{.Config.Image}}' <container_id>` | `latest` yerine belirli tag veya digest görünmeli. |
| **Smoke Request** | `curl -fsSI https://<app-url>/healthz` | 2xx/3xx ve beklenen header'lar dönmeli. |
| **Rollback Artefact** | `docker image ls --digests | head` | Önceki image/tag erişilebilir olmalı. |
| **Secret Kontrolü** | `rg -n '(password|secret|token|apikey)' docker-compose*.yml Dockerfile .env* .` | Hardcoded secret bulunmamalı; secret'ler dosya mount veya secrets mekanizması ile gelmeli. |
