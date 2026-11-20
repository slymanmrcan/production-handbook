# Sunucu kurulum yol haritası

Yeni bir Ubuntu veya Debian sunucusu kuruyorsan Day 0 ile başla. Sunucun hazırsa bulunduğun aşamayı seç ve devam etmeden önce o aşamanın kontrollerini tamamla.

- [Day 0 · Sunucuyu hazırla](#day-0)
- [Day 1 · Uygulamayı yayınla](#day-1)
- [Day 2 · Canlı sistemi işlet](#day-2)

!!! info "Başlamadan önce"
    Sunucunun IP adresine, sağlayıcının verdiği başlangıç hesabına ve kendi SSH anahtarına ihtiyacın var. Ağ veya SSH ayarlarını değiştirmeden önce sağlayıcının kurtarma konsoluna erişebildiğini doğrula. Uygulamayı HTTPS üzerinden yayınlamak için yönetebildiğin bir alan adı veya alt alan adı hazırla.

## Sunucuyu hazırla { #day-0 }

**Day 0 hedefi:** Yetkili hesabınla SSH üzerinden bağlanabiliyorsun ve Docker çalışıyor.

Henüz sunucun yoksa [bulut hazırlığından](../cloud/shared/index.md) başla. Sağlayıcıya özel rehberler **Kurulum** menüsünde bulunur.

1. **İlk bağlantıyı kur.** Sunucuna [SSH ile bağlan](../how-to/base-os.md#1-ilk-baglant-ssh), sistemi güncelle ve günlük yönetim için bir sudo hesabı oluştur.
2. **Sistemi gözden geçir.** Sunucunun saatini, ağını ve diskini kontrol et. Ayrı bir ayar gerekiyorsa [ağ ve DNS](../how-to/network-baseline.md), [disk ve LVM](../how-to/storage-lvm.md) veya [swap](../how-to/swap.md) rehberine bak.
3. **Erişimi güvenli hale getir.** [SSH ayarlarını](../security/ssh.md) ve [UFW kurallarını](../security/firewall.md) uygula. Mevcut oturumu kapatmadan ikinci bir terminalde yeniden bağlan. [Fail2ban](../security/fail2ban.md) ve [otomatik güvenlik güncellemelerini](../security/updates.md) ayarla.
4. **Docker’ı kur.** [Docker Engine ve Compose](../how-to/docker.md) kurulumunu bitir. [Docker Gateway kuralını](../security/docker-gateway.md) incele ve iç servisleri özel ağda tut.

??? example "Kurulumu otomatikleştir"
    Aynı kurulumu birden fazla sunucuda tekrarlıyorsan [Cloud-Init](../how-to/cloud-init.md) veya [Bootstrap betiğini](../scripts/library/bootstrap.md) incele.

!!! check "Day 1’e geçmeden önce"
    - `sudo sshd -t` hata vermemeli. Yeni SSH oturumu ve `sudo -v` başarılı olmalı.
    - `sudo ufw status verbose` beklediğin erişim kurallarını göstermeli.
    - `systemctl is-active docker` çıktısı `active` olmalı ve `docker compose version` sürümü göstermeli.

    [İlk kurulum kontrol listesini tamamla](../checklists/server-first-setup.md).

## Uygulamayı yayınla { #day-1 }

**Day 1 hedefi:** Uygulamaya reverse proxy üzerinden HTTPS ile erişiliyor ve iç servisler izole.

1. **Trafik yolunu planla.** [Mimariyi](../architecture/overview.md) ve [port stratejisini](../architecture/port-strategy.md) incele. HTTP ve HTTPS trafiğini reverse proxy karşılar. Uygulama ve veritabanı özel ağda veya localhost üzerinde kalır.
2. **Uygulamayı çalıştır.** [Compose şablonunu](../file-templates/docker-compose.md) ve kullandığın servislerin [uygulama reçetelerini](../recipes/index.md) temel al. Parola ve anahtarları [secrets rehberine](../security/secrets.md) göre yönet.
3. **HTTPS erişimini kur.** [Reverse proxy’yi](../how-to/reverse-proxy.md) kur, alan adını sunucuya yönlendir ve [TLS sertifikasını](../how-to/tls.md) ayarla. Proxy seçimine göre [Nginx](../recipes/nginx.md) veya [Traefik](../recipes/traefik.md) reçetesini takip et.

??? example "Yapılandırma şablonları ve AI ile geliştirme"
    - [.env örneği](../file-templates/env-example.md) ve [systemd servis şablonu](../file-templates/systemd.md)
    - [AI destekli geliştirme](../ai-dev/index.md) ve [üretilen yapılandırmaları denetleme](../ai-dev/ai-audit-gates.md)

!!! check "Kullanıcı trafiğini açmadan önce"
    - `docker compose config --quiet` hata vermemeli. `docker compose ps` sağlık kontrolü olan servisleri `healthy` göstermeli.
    - Nginx kullanıyorsan `sudo nginx -t` başarılı olmalı. `curl -fsS https://app.example.com/healthz` komutunu kendi alan adın ve sağlık kontrolü yolunla çalıştırdığında uygulama başarılı yanıt vermeli.
    - Yedekten geri dönmeyi ve önceki sürüme dönüş yolunu kontrol et.

    [Uygulama yayın kontrolünü](../checklists/app-launch.md) ve [canlıya geçiş kontrolünü](../checklists/prod-ready.md) tamamla.

## Canlı sistemi işlet { #day-2 }

**Day 2 hedefi:** Sorunları alarmlarla fark edebiliyor, yedekten dönebiliyor ve kesintide izleyeceğin yolu biliyorsun.

1. **İzleme ve logları kur.** [İzleme sistemini](../how-to/monitoring-stack.md) yapılandır, bir test alarmının sana ulaştığını doğrula. [Merkezi loglama](../how-to/centralized-logging.md) ve [log rotasyonu](../how-to/logrotate.md) ayarlarını gözden geçir.
2. **Yedekleri düzenli olarak doğrula.** [Yedekleme stratejini](../how-to/backups.md) belirle ve [test ortamında yedekten dön](../how-to/disaster-recovery-drill.md). Otomasyon gerekiyorsa [veritabanı yedekleme betiğine](../scripts/library/backup.md) bak.
3. **Bakım ve olay müdahalesini planla.** [Haftalık bakım](../scripts/library/maintenance.md) ve [güvenlik denetimi](../scripts/library/audit.md) görevlerini planla. Kritik alarmları ilgili [olay müdahale rehberiyle](../runbooks/index.md) eşleştir. Belirti belirsizse [sorun giderme rehberinden](../troubleshooting/index.md) başla.

!!! check "Düzenli işletim kontrolleri"
    - Prometheus kullanıyorsan `curl -fsS http://localhost:9090/-/ready` başarılı dönmeli.
    - Son yedeğin test ortamında geri yüklenebildiğini doğrula. Sıkıştırılmış bir yedek için `gzip -t YEDEK_DOSYASI.sql.gz` dosyanın bütünlüğünü kontrol eder.
    - `systemctl --failed` kritik servis hatası göstermemeli. `df -h` ve `df -i` ile disk ve inode kullanımını izle.
