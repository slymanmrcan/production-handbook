# AI Denetim Kapıları (Audit Gates) 🛡️

AI ile üretilen kod, `Dockerfile`, `docker-compose.yml`, Nginx konfigürasyonu, CI/CD workflow'u veya bash script **doğrudan production'a gönderilmez**. Bu belge, AI çıktılarının canlıya geçmeden önce geçmesi gereken zorunlu **İnsan + Otomasyon Denetim Kapılarını** tanımlar.

---

## Kapı 1 — Güvenlik ve Exposure Denetimi (Blocker)

Aşağıdaki maddelerden **herhangi biri** başarısızsa PR / deploy reddedilir:

| Kontrol | Ne Aranır? | Doğrulama Komutu |
| :--- | :--- | :--- |
| **Secret Sızıntısı** | Kodda, compose'da, Dockerfile `ENV`/`ARG` içinde veya git geçmişinde şifre/token olmamalı. | `rg -n -i '(password|secret|api_key|private_key|bearer)' .` |
| **Port / UFW Bypass** | `docker-compose.yml` içinde `0.0.0.0` veya çıplak `PORT:PORT` (edge 80/443 hariç) olmamalı. | `rg -n 'ports:' -A 5 docker-compose*.yml` |
| **Root & Privilege** | `Dockerfile` içinde `USER` non-root olmalı; `privileged: true` veya `network_mode: host` olmamalı. | `rg -n 'USER |privileged|network_mode' Dockerfile docker-compose*.yml` |
| **Güvenlik Duvarı & SSH** | Script veya config değişikliği UFW'yi kapatmamalı, `PermitRootLogin yes` veya `PasswordAuthentication yes` açmamalı. | `sshd -t && ufw status verbose` |
| **Güvenilmeyen İndirme** | Script içinde `curl ... \| sh` veya checksum'sız binary indirme olmamalı. | `rg -n 'curl.*\|\s*(ba)?sh|wget.*\|\s*(ba)?sh' .` |

---

## Kapı 2 — Konfigürasyon & Sentaks Doğrulaması (Blocker)

AI'ın ürettiği her yapılandırma dosyası kendi doğrulayıcısından geçmelidir:

| Dosya Türü | Zorunlu Doğrulama Komutu | Beklenen Sonuç |
| :--- | :--- | :--- |
| **Docker Compose** | `docker compose config --quiet` | Exit code `0`, uyarı/hata yok. |
| **Nginx Config** | `nginx -t` (veya `docker exec <nginx> nginx -t`) | `syntax is ok` ve `test is successful`. |
| **SSH Config** | `sshd -t` | Çıktısız exit code `0`. |
| **Bash Script** | `bash -n script.sh && shellcheck script.sh` | Sentaks hatası yok; kritik shellcheck uyarısı yok. |
| **Systemd Unit** | `systemd-analyze verify /etc/systemd/system/<unit>.service` | Kritik hata yok. |

---

## Kapı 3 — Operasyonel Dayanıklılık Denetimi (Warning / Go-No-Go)

AI çoğunlukla "mutlu yol (happy path)" üretir; üretimde ayakta kalma şartlarını manuel kontrol edin:

- **Idempotency (Scriptler):** Script ikinci kez çalıştırıldığında hata vermeden, mevcut config'i bozmadan tamamlanıyor mu?
- **Rollback Planı:** Deploy veya migration bozulursa 2 dakika içinde önceki sürüme dönme yolu belli mi?
- **Kaynak & Log Sınırları:** `memory`, `cpus`, `pids_limit` ve `logging.options` (`max-size`, `max-file`) tanımlı mı?
- **Healthcheck & Timeout:** Reverse proxy timeout'ları ve container healthcheck süreleri gerçekçi mi?
- **Dependency Pinning:** `latest` yerine sabit imaj/paket sürümü kullanılmış mı?

---

## Kapı 4 — Yapay Zeka Halüsinasyon Kontrolleri

AI ile altyapı/sunucu kodu üretirken en sık görülen 5 halüsinasyon tipi:

1. **Var olmayan CLI flag'i / config direktifi:** Üretilen flag'i mutlaka `--help` veya `man` ile doğrula.
2. **Eski sürüm sözdizimi:** `docker-compose` (v1), `version: "3.8"` (artık gereksiz), deprecated Nginx `ssl on;` veya eski systemd direktifleri.
3. **Yanlış dosya yolu:** Ubuntu/Debian'da `/etc/ssh/sshd_config.d/`, `/etc/nginx/sites-available/`, `/etc/sysctl.d/` yollarının dağıtımla uyumlu olduğunu kontrol et.
4. **Sessizce çalışan ama güvenlik kıran "fix":** Hata alınca `chmod 777`, `chown -R root`, `iptables -F` veya `TLS verify skip` önerilerini doğrudan reddet.
5. **Eksik servis reload/restart:** Config yazılıp servis test edilmeden restart edilmesi (her zaman önce test, sonra reload).

---

## Hızlı Karar Özeti

- **Kapı 1 veya Kapı 2'de tek kırmızı varsa:** **NO-GO** — düzeltilmeden merge/deploy yapılmaz.
- **Kapı 1 & 2 yeşil, Kapı 3 tamamlandıysa:** [App Launch](../checklists/app-launch.md) ve [Go / No-Go Decision Matrix](../checklists/prod-ready.md) ile canlıya çıkış onayı verilir.
