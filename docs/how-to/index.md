# Sistem Yönetimi - Kurulum & Konfigürasyon ⚙️

Bu bölüm, Linux sunucunuzu sıfırdan production-ready hale getirmek için gereken **adım adım kurulum rehberlerini** içerir.

---

## 🎯 Bu Bölümde Neler Var?

### 🖥️ Temel Sistem

Sunucunuzun temelini oluşturan core ayarlar:

- **[Temel OS](base-os.md)** - İlk kurulum sonrası yapılması gerekenler
- **[Cloud-Init](cloud-init.md)** - İlk boot otomasyonu ve user-data standardı
- **[Netplan & DNS](network-baseline.md)** - Static IP, gateway ve resolver yönetimi
- **[Disk & LVM](storage-lvm.md)** - Partition, filesystem, `fstab` ve volume büyütme
- **[Kullanıcı Yönetimi](user-management.md)** - Kullanıcı oluşturma, sudo, SSH key
- **[Shell Konfigürasyonu](shell-config.md)** - `.bashrc`, alias, PATH yönetimi
- **[Dosya İzinleri](file-permissions.md)** - chmod, chown, umask, ACL
- **[Paket Yönetimi](package-management.md)** - apt, yum, snap kullanımı
- **[Swap Bellek](swap.md)** - Swap alanı oluşturma ve optimizasyon

### 🏗️ Altyapı Servisleri

Production ortamı için gerekli servisler:

- **[Docker & Storage](docker.md)** - Docker kurulumu ve disk yönetimi
- **[Nginx](nginx.md)** - Web sunucusu kurulumu
- **[Reverse Proxy](reverse-proxy.md)** - Nginx ile reverse proxy yapılandırması
- **[TLS](tls.md)** - SSL/TLS sertifika yönetimi (Let's Encrypt)

### ⚙️ Otomasyon

Zamanlanmış görevler ve servis yönetimi:

- **[Systemd Servis](systemd-service.md)** - Systemd ile servis tanımlama
- **[Zamanlanmış Görevler (Cron)](cron.md)** - Cron, systemd timers, anacron, at

### 🔧 Bakım & İzleme

Sistem sağlığı ve veri güvenliği:

- **[Monitoring](monitoring.md)** - Sistem izleme araçları
- **[Monitoring Stack](monitoring-stack.md)** - Prometheus + Grafana kurulumu
- **[Merkezi Loglama](centralized-logging.md)** - Loki/Promtail ile log toplama
- **[Logrotate](logrotate.md)** - Log dosyası rotasyonu
- **[Yedekleme (Backup)](backups.md)** - Yedekleme stratejileri
- **[DR Drill](disaster-recovery-drill.md)** - RPO/RTO, restore testi, tatbikat akışı
- **[Sistem Snapshot (Timeshift)](snapshots.md)** - Sistem anlık görüntüleri
- **[Sistem Klonlama (Tar)](system-clone.md)** - Sunucu klonlama

### 🌐 Network

Ağ ve port yönetimi:

- **[Ağ/Port Kontrolleri](port-checks.md)** - Port dinleme, network troubleshooting

---

## 📖 Nasıl Kullanılır?

1. **Yeni Sunucu:** Yukarıdan aşağıya sırayla ilerleyin (Temel Sistem → Altyapı → Otomasyon → Bakım)
2. **Belirli Bir Konu:** Sol menüden ilgili sayfaya direkt gidin
3. **Hızlı Referans:** Her sayfada kopyala-yapıştır hazır komutlar bulacaksınız

---

## 🚀 Hızlı Başlangıç

Yeni bir sunucu kuruyorsanız, şu sırayı takip edin:

1. ✅ [Temel OS](base-os.md) - Sistem güncellemeleri, timezone, hostname
2. ✅ [Cloud-Init](cloud-init.md) - İlk boot standardını oturt
3. ✅ [Netplan & DNS](network-baseline.md) - Ağ temelini sabitle
4. ✅ [Kullanıcı Yönetimi](user-management.md) - Sudo kullanıcısı oluştur
5. ✅ [Disk & LVM](storage-lvm.md) - Veri ve log disklerini ayır
6. ✅ [Docker](docker.md) - Container altyapısını kur
7. ✅ [Nginx](nginx.md) - Web sunucusunu kur
8. ✅ [TLS](tls.md) - SSL sertifikası al
9. ✅ [Merkezi Loglama](centralized-logging.md) - Log görünürlüğünü aç
10. ✅ [Yedekleme](backups.md) - Backup stratejisi oluştur
11. ✅ [DR Drill](disaster-recovery-drill.md) - Restore kabiliyetini ölç

> [!TIP] > **Güvenlik:** Kurulum tamamlandıktan sonra [Güvenlik](../security/index.md) bölümüne geçerek sunucunuzu sertleştirin!

---

## 🔗 İlgili Bölümler

- **[Güvenlik](../security/index.md)** - Sunucunuzu koruma altına alın
- **[Şablonlar](../file-templates/postgres.md)** - Hazır konfigürasyon dosyaları
- **[Scriptler](../scripts/index.md)** - Otomasyon scriptleri
- **[Kontrol Listeleri](../checklists/server-first-setup.md)** - İlk kurulum checklist
