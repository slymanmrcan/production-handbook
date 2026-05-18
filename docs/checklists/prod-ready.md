# Go / No-Go Decision Matrix 🚦

Canlıya çıkış (Go-Live) bir histen ibaret olamaz. Aşağıdaki matris tamamlanmadan **TRAFİK YÖNLENDİRİLEMEZ**.

> [!IMPORTANT]
> `<container>`, `<app-url>`, `<db-container>` gibi yerleri kendi ortamınıza göre doldurun. Durdurma veya restore içeren komutları önce staging ortamında çalıştırın.

## 🔴 Blocker (Kesin Engel)

Bu maddelerden **bir tanesi bile** eksikse, deployment iptal edilir.

| Kontrol | Verify Komutu | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| **Data Security** | `docker inspect <container> --format '{{range .Mounts}}{{println .Type "->" .Destination}}{{end}}'`<br>`docker inspect <container> --format '{{range .Config.Env}}{{println .}}{{end}}'` | Secret'ler file/volume mount olarak görünmeli; kritik secret değerleri env listesinde taşınmamalı. |
| **Firewall** | `ufw status verbose`<br>`ss -tulpn` | Sadece 80/443/SSH public açık olmalı; DB portları localhost veya internal network ile sınırlı kalmalı. |
| **Backup** | `ls -lh /var/backups/db`<br>`gzip -t /var/backups/db/<latest>.sql.gz`<br>`docker exec <staging-db> psql -U <db_user> -d <db_name> -c 'SELECT NOW();'` | Son backup dosyası mevcut olmalı, gzip doğrulaması geçmeli ve staging restore testi başarılı dönmeli. |
| **SSL** | `systemctl is-enabled certbot.timer`<br>`certbot certificates` | Timer aktif olmalı, sertifika süresi geçerli görünmeli. |
| **Non-Root** | `docker inspect <container> --format '{{.Config.User}}'` | Çıktı boş olmamalı ve `root` olmamalı. |
| **Health Endpoint** | `docker inspect <container> --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}'`<br>`curl -fsS https://<app-url>/healthz` | Container `healthy` olmalı ve dış health endpoint başarılı dönmeli. |
| **Runtime Hardening** | `docker inspect <container> --format '{{.HostConfig.ReadonlyRootfs}} {{json .HostConfig.SecurityOpt}} {{json .HostConfig.CapDrop}}'` | En azından riskli servislerde read-only rootfs, `no-new-privileges` ve capability düşürme görünmeli. |
| **Rollback Hazırlığı** | `docker inspect <container> --format '{{.Config.Image}}'`<br>`docker image ls --digests | head` | Çalışan image net olarak tanımlı olmalı; önceki artefact erişilebilir olmalı. |
| **Failed Units** | `systemctl --failed` | Kritik servis tarafında failed unit görünmemeli. |

## 🟡 Warning (Riskli Geçiş)

Bu maddeler eksikse Manager onayı ile geçilebilir ama 24 saat içinde düzeltilmelidir.

| Kontrol | Verify Komutu | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| **Monitoring** | `curl -fsS http://localhost:9090/-/ready`<br>`curl -fsS http://localhost:9093/-/ready` | Prometheus ve Alertmanager hazır dönmeli; alarm yolu sessiz olmamalı. |
| **Logs** | `docker inspect <container> --format '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}'`<br>`logrotate -d /etc/logrotate.conf` | Log driver ve rotate ayarı görünmeli; logrotate dry-run hata vermemeli. |
| **Performance** | `wrk -t2 -c50 -d30s https://<app-url>/healthz` | Hedef yükte P99 latency hedefi karşılanmalı; hata oranı kabul edilebilir seviyede kalmalı. |
| **Fallbacks** | `docker stop <db-container>`<br>`curl -I https://<app-url>` | Staging ortamında DB yokken kullanıcıya kontrollü hata/bakım cevabı dönmeli; uygulama crash olmamalı. |
| **Disk / Inode** | `df -h /`<br>`df -i /` | Disk ve inode kullanımı alarm eşiğinin altında kalmalı. |
| **Rate Limit / Abuse Guard** | `curl -I https://<app-url>`<br>`nginx -T | rg 'limit_req|limit_conn'` | Public girişte temel abuse/rate-limit katmanı görünmeli. |
| **Image Scan** | `trivy image <image:tag>` | Bilinen HIGH/CRITICAL açıklar yönetilmiş veya kabul edilmiş olmalı. |

## 🟢 Good to Have (İyileştirme)

| Kontrol | Verify Komutu | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| **CDN** | `curl -I https://<app-url>/assets/app.js` | `server`, `cf-cache-status`, `x-cache` gibi CDN/cache header'ları görünmeli. |
| **CI/CD** | `gh workflow list`<br>`gh run list --limit 5` | Deploy pipeline tanımlı olmalı ve son koşuların durumu görülebilmeli. |
| **Docs** | `rg -n 'TODO|TBD|FIXME' docs/runbooks docs/how-to docs/checklists` | Kritik runbook/checklist sayfalarında açık TODO kalmamalı. |
| **Change Record** | `git log --oneline -n 5` | Release'e giren commit seti izlenebilir olmalı. |
| **Security Baseline** | `lynis audit system --quick` | Ağır kritik bulgu görünmemeli veya risk kabulü net olmalı. |

---

## 🚬 Post-Deploy 15 Dakika Kontrolü

Deploy tamamlandıktan sonra "çıktı geçti" demek yetmez. İlk 15 dakikada aşağıdaki kısa tur yapılmalı:

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| **Canlı Trafik** | `curl -fsS https://<app-url>/healthz` | Uygulama erişilebilir kalmalı. |
| **App Logs** | `docker logs <container> --tail 100` | Crash loop, migration hatası veya secret/config hatası görünmemeli. |
| **Proxy Logs** | `journalctl -u nginx -n 50 --no-pager` | 5xx patlaması görünmemeli. |
| **Container Durumu** | `docker ps --format 'table {{.Names}}\t{{.Status}}'` | Ana servisler `Up` ve sağlıklı görünmeli. |
| **Host Load** | `uptime`<br>`free -h` | Anormal load veya bellek baskısı görünmemeli. |

---

## 📝 Karar

| Durum          | Karar               | İmza/Onay |
| :------------- | :------------------ | :-------- |
| ✅ Tümü Yeşil  | **GO** 🚀           | Mühendis  |
| ⚠️ Sarı Var    | **GO with Risk** 🤞 | Team Lead |
| ❌ Kırmızı Var | **NO-GO** 🛑        | -         |
