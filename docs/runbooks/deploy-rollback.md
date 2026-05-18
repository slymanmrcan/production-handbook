# Deploy Geri Alma

Bu runbook, hatali deploy sonrasinda servisi en kisa surede stabil bir surume geri almak icindir. Amac "hızlıca eskiye dönmek" ama bunu kontrollü ve izlenebilir yapmaktir.

## Etki

- Yeni sürüm 500/timeout üretir.
- Config veya migration uyumsuzluğu oluşur.
- Kullanıcı akışı bozulur.
- Hata oranı ve alert seviyesi yükselir.

## Tipik Failure Mode'lar

- Yanlış image/tag deploy edildi.
- Yeni config production ile uyumsuz.
- DB migration geri alınamaz.
- Release artifact bozuk.
- Systemd service veya Docker Compose start olmuyor.

## 1. Önce Yayılmayı Durdur

Yeni deploy zincirini durdur:

```bash
systemctl stop app 2>/dev/null || true
docker stop app 2>/dev/null || true
```

Eğer CI/CD hala koşuyorsa:

- pipeline'ı pause et
- otomatik restart / auto-scaling varsa geçici kapat
- yeni release'lerin gelmesini engelle

## 2. Son Saglam Sürümü Bul

Roll back edeceğin artefact'i netleştir:

```bash
ls -1t /opt/app/releases 2>/dev/null | head
git tag --sort=-creatordate | head
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}'
```

Kullandığın deploy modeline göre geri dönüş yolu değişir:

- symlink tabanlı release
- git tag / checkout tabanlı
- docker image tag tabanlı
- package version tabanlı

## 3. Rollback Yolu

### A. Symlink tabanlı release

```bash
ln -sfn /opt/app/releases/<previous-release> /opt/app/current
systemctl restart app
```

### B. Git tabanlı deploy

```bash
cd /opt/app
git checkout <stable-tag-or-commit>
systemctl restart app
```

### C. Docker Compose tabanlı deploy

```bash
export IMAGE_TAG=<stable-tag>
docker compose pull
docker compose up -d
docker compose ps
```

### D. System package tabanlı deploy

```bash
apt-cache policy <package-name>
apt install <package-name>=<stable-version>
systemctl restart <service-name>
```

## 4. Migration Notu

Eger yeni deploy DB migration uyguladıysa rollback öncesi şu soruyu cevapla:

- Migration geri alınabiliyor mu?
- Geri alınamıyorsa uygulama eski kodla yeni şemayı okuyabiliyor mu?

Geri alınamayan migration varsa rollback bazen kod geri alma değil, **compatibility mode** veya feature flag kapatma demektir.

Örnek:

```bash
psql -U <db_user> -d <db_name> -c 'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;'
```

## 5. Hizli Doğrulama

Rollback sonrası önce servis ayağa kalktı mı bak:

```bash
systemctl status app --no-pager
journalctl -u app --since "10 min ago" --no-pager
curl -fsS https://<app>/healthz
```

Container ise:

```bash
docker compose ps
docker logs --tail 100 app
curl -fsS https://<app>/healthz
```

## 6. Kullanici Etkisini Kontrol Et

Rollback sadece servis "aktif" görünüyor diye tamam sayılmaz.

Kontrol et:

```bash
curl -I https://<app>/
curl -fsS https://<app>/api/version
```

Şunlara bak:

- 2xx dönüyor mu?
- Hata oranı düşmüş mü?
- Version header / release info beklenen sürümü gösteriyor mu?

## 7. Geri Donus Sonrası İzleme

Rollback'tan sonra en az 15-30 dakika gözlemle:

```bash
journalctl -u app -f
tail -f /var/log/nginx/error.log
```

Alert metrikleri:

- HTTP 5xx
- latency
- restart count
- DB connection errors

## 8. Verification

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Servis ayağa kalktı mı | `systemctl status app --no-pager` | `active (running)` |
| Sağlık kontrolü | `curl -fsS https://<app>/healthz` | 200/healthy |
| Son sürüm aktif mi | `git rev-parse --short HEAD` veya image tag kontrolü | Beklenen stabil sürüm |
| Hata logu azaldı mı | `journalctl -u app --since "10 min ago" | rg 'error|exception'` | Yeni hata artışı olmamalı |
| Kullanici akışı | `curl -I https://<app>/` | Beklenen HTTP status |

## 9. Escalation Kriterleri

Rollback yeterli değilse escalation et:

- DB migration yüzünden eski sürüm çalışmıyorsa.
- Config geri alma sonrası da hata sürüyorsa.
- Birden fazla host aynı hatayı veriyorsa.
- Rollback 10 dakikada tamamlanamadıysa.

## 10. Olay Kaydı

Kayıta geçir:

- Hangi sürümden hangi sürüme dönüldü
- Rollback komutu / yöntemi
- Gözlenen hata mesajı
- Rollback sonrası health check sonucu
- Gerekirse feature flag veya migration notu
