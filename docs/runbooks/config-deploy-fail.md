# Config Deploy Hatasi

Bu runbook config, env veya template degisikligi deploy edildikten sonra uygulama bozuldugunda kullanilir.

## 1. Semptomlar

Tipik belirtiler:

- servis aciliyor ama hemen crash oluyor
- 500 / 502 / 503 hatalari artiyor
- sadece bir environment'ta bozulma var
- yeni config ile eski config arasinda fark var

## 2. Immediate Containment

Etkiyi sinirlamak icin:

- yeni deploy'u durdur
- problemli config'i production'a yayma
- gerekirse onceki config / env set'e geri don

```bash
systemctl stop <service>
```

Container kullaniyorsaniz:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 100 <container>
```

## 3. Config Diff ve Triage

Önce ne degistiğini netlestirin:

```bash
git log --oneline -n 5
git diff HEAD~1..HEAD -- .env* *.yml *.yaml *.conf
```

Systemd unit kullaniyorsaniz:

```bash
systemctl cat <service>
systemctl show <service> -p Environment -p EnvironmentFile -p ExecStart
```

Nginx veya benzeri config varsa syntax kontrolu yapin:

```bash
nginx -t
```

Environment degiskenlerini kontrol edin:

```bash
env | rg '^(APP_|DB_|REDIS_|NODE_ENV|ASPNETCORE_ENVIRONMENT)'
```

## 4. Siklikla Gidilen Hata Noktalari

- eksik `.env` veya EnvironmentFile
- escape edilmemis karakterler
- yanlis path veya mount
- secret placeholder yerine gercek deger beklenmesi
- prod / staging farkli config seti
- syntax dogru ama semantik yanlis

## 5. Geri Alma Karari

Rollback'i seç:

- config diff net ve riskliyse
- uygulama config bagimliysa ve restart ile duzelmiyorsa
- hata deploy'dan hemen sonra basladiysa

```bash
# Örnek: onceki git commit veya tag'e donus
git checkout <stable-tag>
systemctl restart <service>
```

## 6. Verify

Geri donus veya fix sonrasinda:

```bash
systemctl status <service> --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
journalctl -u <service> --since "15 min ago" --no-pager
```

Beklenen:

- servis aktif
- health endpoint 200 dönüyor
- config-related error yok

## 7. Evidence

Sorun kaydı icin saklayin:

```bash
mkdir -p /tmp/config-deploy-evidence
systemctl cat <service> > /tmp/config-deploy-evidence/systemd-unit.txt
systemctl show <service> -p Environment -p EnvironmentFile -p ExecStart > /tmp/config-deploy-evidence/systemd-env.txt
journalctl -u <service> --since "1 hour ago" --no-pager > /tmp/config-deploy-evidence/journal.txt
git diff HEAD~1..HEAD -- .env* *.yml *.yaml *.conf > /tmp/config-deploy-evidence/config-diff.txt
```

## 8. Escalation Criteria

Su durumda daha yukari escalete edin:

- config syntax dogru ama hata devam ediyor
- env/secret eksigi paylasilan bir config management problemine isaret ediyor
- rollback yapildi ama eski config de calismiyor
- uygulama source code degisimi olmadan sadece config ile bozuluyorsa

