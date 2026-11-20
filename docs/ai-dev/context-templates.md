# Hazır Context / Rule Şablonları 📋

Yeni bir uygulama reposu açtığınızda AI kodlama asistanının **ilk satırdan itibaren sunucu ve production standartlarını bilmesi** için aşağıdaki şablonları projenizin `AGENTS.md` (veya kullandığınız AI aracının kural/context dosyasına) doğrudan ekleyebilirsiniz.

---

## Şablon 1 — Genel Uygulama Reposu (Kısa & Evrensel)

Herhangi bir backend/frontend projesinin `AGENTS.md` dosyasına eklenecek minimum altyapı bloğu:

```markdown
## Production Infrastructure Contract (Target Server)

This application will be deployed to a hardened Ubuntu LTS server running Docker Engine + Compose v2 behind a reverse proxy (Nginx/Traefik).

### Mandatory Rules for Code, Dockerfiles & Configs
1. **Networking & Ports:**
   - Never expose app, database, or cache ports directly to `0.0.0.0`.
   - Use private Docker networks. For required host access, bind to `127.0.0.1:<host>:<container>` on Docker Engine 28.0.0 or later. Keep Docker packet filtering enabled.
   - Standard host port ranges: Frontend `3000-3999`, API `4000-4999`, Data `5000-5999`, Ops `8000-8999`.
2. **TLS & Reverse Proxy:**
   - TLS terminates at the edge reverse proxy. The app listens on plain HTTP inside the container.
   - Respect `X-Forwarded-For` and `X-Forwarded-Proto` headers.
3. **Container Security:**
   - Multi-stage Dockerfiles only; pin base image versions (never `:latest`).
   - Run as a non-root user (`USER appuser`).
   - Include `security_opt: [no-new-privileges:true]`, `cap_drop: [ALL]`, resource limits (`cpus`, `memory`, `pids_limit`), and `json-file` log rotation (`max-size: 10m`, `max-file: 3`).
4. **Operational Readiness:**
   - Expose `GET /healthz` returning HTTP 200.
   - Log structured output to `stdout`/`stderr` (no local log files inside containers).
   - Handle `SIGTERM` for graceful shutdown.
5. **Secrets:**
   - Never hardcode secrets or commit `.env`. Maintain `.env.example` with placeholders only.
   - Support file-based secrets (`/run/secrets/...`) where applicable.
```

---

## Şablon 2 — Full-Stack (.NET API + React + PostgreSQL + Redis)

Kendi standart stack'iniz için doğrudan kullanılabilir genişletilmiş şablon:

```markdown
## Stack & Deployment Rules (.NET + React + PostgreSQL + Redis)

- **Backend (.NET):**
  - Listen on container port `8080` as non-root user.
  - Configure `UseForwardedHeaders()` for reverse proxy compatibility.
  - Expose `/healthz` via `AddHealthChecks()`.
  - Keep DB migrations explicit and repeatable; avoid destructive changes in a single release.
- **Frontend (React / SPA):**
  - Build with pinned Node LTS image; serve static files via non-root `nginx:alpine`.
  - Use `try_files $uri $uri/ /index.html;` for SPA routing.
  - Never put secrets in client-side env variables (`VITE_*`).
- **Data Layer (PostgreSQL & Redis):**
  - Attached only to `backend` Docker network (`internal: true`); never exposed publicly.
  - PostgreSQL uses named volume + `POSTGRES_PASSWORD_FILE`.
  - Redis requires password + `maxmemory` policy; app must handle temporary cache unavailability gracefully.
- **Verification Before Done:**
  - `docker compose config --quiet` must pass.
  - No hardcoded secrets, no `:latest` tags, no public `0.0.0.0` port bindings except edge `80/443`.
```

---

## Şablon 3 — Altyapı / Bash Script Reposu

Otomasyon veya sunucu bakım script'i yazdırırken kullanılacak kural bloğu:

```markdown
## Bash & Server Automation Rules

- Every script must start with `#!/usr/bin/env bash` and `set -Eeuo pipefail`.
- Scripts must be **idempotent** (safe to run multiple times without duplicating config lines or breaking services).
- Never use `curl | sh` or disable security controls (`ufw disable`, `chmod 777`).
- Always validate configs before restarting services (`sshd -t`, `nginx -t`, `sysctl --system`).
- Every change must include a concrete verification command (`Verify Step`).
```

---

## Doğrulama

Şablonu hedef projeye ekledikten sonra AI'dan basit bir `Dockerfile` veya `docker-compose.yml` üretmesini isteyin ve şu 3 noktayı hemen kontrol edin:
1. `USER` non-root olarak eklenmiş mi?
2. `ports` yerine `expose` veya `127.0.0.1:` kullanılmış mı?
3. `healthcheck`, `logging` ve `limits` blokları kendiliğinden gelmiş mi?
