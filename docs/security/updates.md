# Otomatik Güvenlik Güncellemeleri

Sunucunuzun güvenliği için en kritik adım, güvenlik yamalarını zamanında almaktır. **Unattended Upgrades**, bu işi sizin yerinize sessizce halleder.

## 1. Kurulum

Paketi kurun:

```bash
sudo apt update
sudo apt install -y unattended-upgrades apt-listchanges
```

## 2. Aktifleştirme (Otomatikleştirme)

Çoğu rehber `dpkg-reconfigure` kullanır ama bu interaktiftir (otomasyona gelmez). Biz doğrudan ayar dosyasını oluşturacağız.

Şu dosyayı oluşturun/düzenleyin: `/etc/apt/apt.conf.d/20auto-upgrades`

```bash
sudo nano /etc/apt/apt.conf.d/20auto-upgrades
```

İçeriği şöyle olmalı:

```apt
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
```

- **Update-Package-Lists "1":** Her gün paket listesini güncelle (`apt update`).
- **Unattended-Upgrade "1":** Her gün güncellemeleri kur (`apt upgrade`).
- **AutocleanInterval "7":** 7 günde bir önbelleği temizle.

## 3. Konfigürasyon (Zamanlama ve Reboot)

Ana ayarlar `/etc/apt/apt.conf.d/50unattended-upgrades` dosyasındadır.
Burası "Neleri güncelleyeyim?" ve "Reboot edeyim mi?" sorularının cevabıdır.

Dosyayı açın:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Bu dosyada çoğu ayar `//` ile yorum satırı halindedir. Aşağıdaki adımları izleyin:

1.  **Allowed-Origins (Kontrol Edin):**
    Genelde varsayılan olarak açıktır. `${distro_id}:${distro_codename}-security` satırının başında `//` **olmadığından** emin olun.

    ```javascript
    Unattended-Upgrade::Allowed-Origins {
        "${distro_id}:${distro_codename}-security";
    };
    ```

2.  **Temizlik ve Reboot (Aktif Hale Getirin):**
    Bu satırlar varsayılan olarak **kapalıdır** (`//` ile başlar). Başındaki `//` işaretlerini silerek açın:

    ```javascript
    // Gereksiz kernel ve bağımlılıkları temizle
    Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
    Unattended-Upgrade::Remove-Unused-Dependencies "true";

    // Otomatik Yeniden Başlatma
    Unattended-Upgrade::Automatic-Reboot "true";
    Unattended-Upgrade::Automatic-Reboot-Time "04:00";
    ```

> [!WARNING] > **Automatic Reboot:** Kernel güncellemeleri yeniden başlatma gerektirir. Eğer bunu açarsanız, sunucunuz gece 04:00'te kapanıp açılabilir. Docker konteynerlerinizin `restart: always` modunda olduğundan emin olun!

## 4. İleri Düzey Ayarlar

### Paket Engelleme (Blacklist)

Bazen bir güncelleme sisteminizi bozabilir (örn: Nginx konfigürasyonu değişebilir). O paketi güncellemelerden hariç tutmak için `Package-Blacklist` kısmını kullanın.

`/etc/apt/apt.conf.d/50unattended-upgrades` dosyasında:

```javascript
Unattended-Upgrade::Package-Blacklist {
    "nginx";
    "libc6";
    "libc6-dev";
    // Regex de kullanabilirsiniz:
    // "linux-image.*";
};
```

### Diğer Depoları (Docker, Nginx) Dahil Etme

Varsayılan olarak sadece Ubuntu güvenlik yamaları alınır. Eğer Docker veya Nginx gibi dış kaynaklardan kurduğunuz paketlerin de güncellenmesini istiyorsanız `Allowed-Origins` kısmına ekleme yapmalısınız.

Ancak bu biraz karmaşıktır (`origin` ve `suite` değerlerini bilmeniz gerekir). Genelde güvenlik için sadece temel OS güncellemelerini açık tutmak ve uygulama güncellemelerini (Docker gibi) manuel yapmak daha güvenlidir.

### E-Posta Bildirimi

Güncellemelerden haberdar olmak isterseniz (mailx veya postfix gerekir):

```javascript
Unattended-Upgrade::Mail "admin@example.com";
Unattended-Upgrade::MailReport "on-change"; // Sadece güncelleme olursa yaz
```

## 5. Test Etme (Dry Run)

Yaptığımız ayarlar çalışıyor mu? Simülasyon yapalım:

```bash
sudo unattended-upgrades --dry-run --debug
```

Komutun sonunda `Checking (veya Installing)...` gibi çıktılar görüyorsanız sistem çalışıyor demektir.

## 6. Logları İzleme

Gerçekten güncelleme yapıp yapmadığını loglardan takip edebilirsiniz:

```bash
# Ana log dosyası
cat /var/log/unattended-upgrades/unattended-upgrades.log

# Son gerçekleşen işlemler
tail -f /var/log/unattended-upgrades/unattended-upgrades.log
```

## 7. Servis Durumu

Bu işlem bir "Systemd Timer" ile tetiklenir. Çalıştığını teyit edelim:

```bash
systemctl status apt-daily-upgrade.timer
```

Çıktıda `Active: active (waiting)` görmelisiniz.

## 8. Güncelleme Bildirimleri (MOTD) 📢

SSH ile sunucuya giriş yaptığınızda karşınıza çıkan _"3 updates can be applied immediately"_ yazısını sağlayan araç `update-notifier-common` paketidir.

### Kontrol Etme

Sisteminizde yüklü değilse (Ubuntu Minimal sürümlerde olmayabilir):

```bash
apt list --installed update-notifier-common
```

Yüklü değilse kurun:

```bash
sudo apt install update-notifier-common
```

### Nasıl Çalışır?

Bu araç `/var/lib/update-notifier/updates-available` adında bir dosyayı günceller. SSH girişinde (PAM modülü) bu dosya okunur ve size mesaj olarak gösterilir.

Eğer mesajın güncel olmadığını düşünüyorsanız, manuel olarak tetikleyebilirsiniz:

```bash
/usr/lib/update-notifier/update-motd-updates-available
```
