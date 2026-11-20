# Uygulama-Sunucu Kontratı (App Contracts) 📜

Bu belge, AI destekli geliştirme sırasında üretilen uygulamaların ve container tanımlarının **bu sunucu altyapısında sorunsuz, güvenli ve bakım yapılabilir şekilde koşması** için uyması gereken teknik sözleşmedir.

---

## 1. Evrensel Container Kontratı (Tüm Servisler)

AI bir `Dockerfile` veya `docker-compose.yml` ürettiğinde aşağıdaki kurallar **zorunludur**:

| Kural | Gereksinim | Anti-Pattern (Yasak) |
| :--- | :--- | :--- |
| **Base Image** | Sabit sürüm tag'i (`node:22-alpine`, `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`). | `:latest` kullanmak. |
| **Build Yapısı** | Multi-stage build (SDK/build araçları final imaja taşınmaz). | Tek stage'de derleyip çalıştırmak. |
| **Kullanıcı** | `USER appuser` (non-root UID/GID). | Default `root` ile çalıştırmak. |
| **Restart Policy** | `restart: unless-stopped`. | Restart policy tanımlamamak. |
| **Healthcheck** | Compose veya Dockerfile içinde tanımlı, `/healthz` kontrolü. | Healthcheck olmadan deploy etmek. |
| **Kaynak Limiti** | `cpus`, `memory` ve `pids_limit` tanımlı. | Limitsiz container (host'u OOM'a sürükler). |
| **Log Limiti** | `json-file` driver + `max-size: "10m"`, `max-file: "3"`. | Sınırsız Docker logu. |
| **Runtime Hardening** | `security_opt: ["no-new-privileges:true"]`, `cap_drop: ["ALL"]`, uygunsa `read_only: true`. | `privileged: true` veya `network_mode: host`. |

Host erişimi gereken özel servislerde Docker Engine 28.0.0 veya üzerinde loopback bind kullanın. Uygun ortamda servisi özel Docker ağında tutun. [Docker Gateway Mimarisi](../security/docker-gateway.md)

---

## 2. Stack Bazlı Kontratlar

### 🔷 .NET Core Backend
Referans reçete: [.NET Core Hardening](../recipes/dotnet.md) · [Şablon](../file-templates/dotnet-backend.md)

- `ASPNETCORE_ENVIRONMENT=Production` ve `DOTNET_EnableDiagnostics=0` (gerekmiyorsa).
- Reverse proxy arkasında doğru IP ve HTTPS tespiti için `UseForwardedHeaders()` yapılandırılmalı.
- `builder.Services.AddHealthChecks()` ile `/healthz` endpoint'i açık olmalı.
- Veritabanı migration'ları uygulama startup'ında körlemesine çalışmak yerine kontrollü deploy adımı (veya idempotent init job) olarak tasarlanmalı.
- Kestrel sadece container içi porta (örn. `8080`) bind etmeli; container non-root kullanıcıda çalıştığı için `80` yerine `8080` kullanılmalı.

### ⚛️ React / SPA Frontend
Referans reçete: [React + Nginx](../recipes/react.md) · [Nginx Şablon](../file-templates/nginx.md)

- Build aşaması Node imajında, runtime aşaması minimal `nginx:alpine` (non-root) imajında olmalı.
- SPA routing için `try_files $uri $uri/ /index.html;` tanımlı olmalı.
- Statik asset'ler (`/assets/`) uzun cache (`Cache-Control: public, max-age=31536000, immutable`), `index.html` ise `no-cache` başlığıyla sunulmalı.
- Build zamanı ortam değişkenleri (`VITE_*`, `NEXT_PUBLIC_*`) içine **asla** gizli API anahtarı konmamalı (tarayıcıya açık gider).

### 🐘 PostgreSQL & 🐬 MySQL / MariaDB
Referans reçete: [PostgreSQL Tuning](../recipes/postgres.md) · [MySQL/MariaDB](../recipes/mysql.md)

- Port kesinlikle public açılmaz; sadece `internal: true` backend ağında `expose` edilir.
- Veri dizini mutlaka named volume veya kontrollü host mount ile kalıcı yapılır.
- Şifreler `POSTGRES_PASSWORD_FILE: /run/secrets/db_pass` gibi dosya tabanlı secret ile verilir.
- Backup script'i ([backup.md](../scripts/library/backup.md)) ve restore testi ([restore.md](../scripts/library/restore.md)) ile uyumlu dump alınabilir olmalı.

### 🔴 Redis
Referans reçete: [Redis Cache](../recipes/redis.md) · [Şablon](../file-templates/redis.md)

- Public erişim yasak; sadece internal backend ağı.
- `requirepass` (veya ACL) aktif, `maxmemory` ve eviction policy (`allkeys-lru` veya iş kuralına uygun) tanımlı olmalı.
- Uygulama, Redis geçici olarak düştüğünde tamamen çökmek yerine kontrollü hata veya degrade davranışı göstermeli.

---

## 3. Ortam (Environment) ve Deploy Kontratı

| Alan | Kural |
| :--- | :--- |
| **Ortam Ayrımı** | `dev`, `staging`, `prod` ayrı `.env` ve ayrı compose/stack dizinlerinde yaşar; aynı veritabanını paylaşmaz. |
| **Secret Yönetimi** | `.env` dosyaları `.gitignore` içindedir; repoda sadece örnek şema (`.env.example`) bulunur. |
| **İmaj Etiketleme** | Production deploy'ları git SHA veya semver tag (`v1.4.2`) ile yapılır; rollback için önceki tag korunur. |
| **Migration Güvenliği** | Geriye dönük uyumsuz (destructive) şema değişiklikleri (`DROP COLUMN`) iki aşamalı (expand-and-contract) yapılır. |

---

## 4. Kontrat Doğrulama Komutları

AI tarafından üretilen bir servisi canlıya almadan önce kontrata uyduğunu şu komutlarla test edin:

```bash
# 1. Compose dosyasının hatasız render edildiğini doğrula
docker compose config --quiet

# 2. Container non-root, limitli ve healthy mi?
docker inspect <container> --format 'User={{.Config.User}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}} Mem={{.HostConfig.Memory}} Pids={{.HostConfig.PidsLimit}} NoNewPriv={{json .HostConfig.SecurityOpt}}'

# 3. Hardcoded secret taraması
rg -n -i '(password|secret|token|apikey)\s*[:=]\s*["'\'']?[A-Za-z0-9_\-]{8,}' Dockerfile docker-compose*.yml .
```
