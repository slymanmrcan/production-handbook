# Temel OS Kurulumu 🖥️

Yeni bir Ubuntu/Debian sunucusuna ilk giriş yaptıktan sonra yapılması gereken temel ayarlar burada toplanır. Amaç "sunucu açıldı" demek değil, **öngörülebilir bir host baseline** oluşturmaktır.

---

## 0. Day-0 Host Baseline Politikası

Production host için önerilen varsayılan politika:

| Konu | Önerilen Değer | Neden? |
| :--- | :------------- | :----- |
| **Hostname** | `prod-api-01` gibi anlamlı isim | Log, monitoring ve inventory tarafında host'u anında tanımak için |
| **Timezone** | `UTC` | Log korelasyonu, incident analizi ve multi-region tutarlılığı için |
| **Locale** | `C.UTF-8` veya `en_US.UTF-8` | Script ve CLI çıktılarının öngörülebilir olması için |
| **İlk Patch** | `apt update && apt full-upgrade -y` | Host'u ilk dakikadan güncel güvenlik seviyesine çekmek için |
| **Admin Erişimi** | Dedicated non-root sudo user | Root yerine daha izlenebilir ve kontrollü yönetim için |

Kısa karar özeti:

- Host timezone ile uygulama timezone aynı olmak zorunda değildir.
- Çoğu production host'ta **host = UTC**, uygulama veya UI = yerel saat yaklaşımı daha doğrudur.
- Tek kişi yönetiyor olsanız bile gündelik işi `root` ile yapmayın.

---

## 1. İlk Bağlantı (SSH)

### Root ile İlk Giriş

```bash
# Varsayılan SSH portu (22)
ssh root@SUNUCU_IP

# Özel port kullanıyorsanız
ssh -p 2222 root@SUNUCU_IP

# SSH key ile bağlanma
ssh -i ~/.ssh/id_rsa root@SUNUCU_IP
```

İlk bağlantıda amaç sadece içeri girmek değil, **root bağımlılığından çıkış planını** hemen uygulamaktır. Root ile bağlandıktan sonra sıradaki adım:

1. sistemi patchlemek,
2. dedicated sudo user açmak,
3. SSH erişimini o kullanıcıya taşımak,
4. root SSH erişimini kapatmaktır.

> Güvenlik notu: Root ile SSH bağlantısını mümkün olan en kısa sürede bırakın. Root, sürekli kullanılan admin hesabı değil, emergency erişim hesabı olmalıdır.

---

## 2. İlk Update / Upgrade ve Patch Window

Yeni kurulmuş image "temiz" olabilir ama "güncel" olmak zorunda değildir. İlk login sonrası patch baseline oluşturmak gerekir.

### Neden hemen update/upgrade?

- Kernel, OpenSSH ve libc gibi kritik paketler geride kalmasın diye
- Daha sonra kuracağınız Docker, Nginx veya agent'lar eski paket tabanına oturmasın diye
- Host drift'i ilk günden başlamasın diye

### Önerilen sıra

```bash
# Paket listesini güncelle
apt update

# Tam yükseltme (kernel ve dependency değişimleri dahil)
apt full-upgrade -y

# Gereksiz paketleri temizle
apt autoremove -y
apt autoclean
```

### `upgrade` yerine neden `full-upgrade`?

- `apt upgrade` daha konservatif davranır
- `apt full-upgrade` yeni dependency, kernel ve paket değişimlerini de uygular

Fresh host için pratikte en doğru başlangıç çoğu zaman:

```bash
apt update && apt full-upgrade -y
```

### Reboot gerekli mi?

İlk patch sonrası reboot gerekip gerekmediğini görünür hale getirin:

```bash
test -f /var/run/reboot-required && cat /var/run/reboot-required || echo "reboot not required"
uname -r
```

`needrestart` daha detaylı çıktı verir:

```bash
sudo apt install -y needrestart
sudo needrestart -r l
```

### Verify

```bash
apt list --upgradable
test -f /var/run/reboot-required && cat /var/run/reboot-required || echo "reboot not required"
```

Beklenen:

- Kritik paketlerin büyük kısmı güncellenmiş olmalı
- `apt list --upgradable` çıktısı boş veya minimal olmalı
- Reboot gerekiyorsa operasyon notuna işlenmeli

---

## 3. Dedicated Non-Root Sudo User Oluşturma

Production host'ta gündelik yönetim `root` ile yapılmaz. Bunun yerine:

- insan kullanıcılar için named admin user,
- otomasyon için ayrı deploy/service user,
- root için ise break-glass erişim

kullanılır.

### Neden root değil?

- `sudo` log'ları üzerinden kimin ne yaptığı daha net izlenir
- Yanlış komutun blast radius'u azalır
- `PermitRootLogin no` uygulamak kolaylaşır
- İnsan ve servis erişimini ayırabilirsiniz

Minimum kabul edilebilir model:

- `deployer` veya `opsadmin` gibi bir non-root sudo user
- SSH key ile giriş
- Root SSH kapalı

### Kullanıcı oluşturma

```bash
# Yeni kullanıcı oluştur
adduser deployer

# Sudo grubuna ekle
usermod -aG sudo deployer

# Kullanıcıyı kontrol et
id deployer
groups deployer
```

### SSH Key Kopyalama

Root'tan yeni kullanıcıya SSH key'i kopyalayın:

```bash
mkdir -p /home/deployer/.ssh
cp /root/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys
```

### Test

```bash
# Yeni terminalde test et
ssh deployer@SUNUCU_IP
sudo whoami
```

Beklenen:

- `ssh deployer@SUNUCU_IP` çalışmalı
- `sudo whoami` -> `root`

### Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Kullanıcı var mı | `id deployer` | UID, GID ve grup bilgileri görünmeli |
| Sudo yetkisi var mı | `sudo -l -U deployer` | Beklenen sudo policy görünmeli |
| Grup üyeliği | `getent group sudo` | `deployer` sudo grubunda görünmeli |
| SSH key izinleri | `sudo ls -ld /home/deployer/.ssh /home/deployer/.ssh/authorized_keys` | `.ssh` 700, `authorized_keys` 600 olmalı |
| Root dışı giriş testi | `ssh deployer@SUNUCU_IP` | Beklenen auth yöntemiyle giriş sağlanmalı |

Detaylı model ve çok kullanıcılı yapı için:

- [Kullanıcı Yönetimi](user-management.md)

---

## 4. SSH Port Değiştirme (Güvenlik)

Varsayılan 22 portu yerine özel port kullanmak bot trafiğini azaltabilir; ama bu tek başına hardening değildir. Önce key auth ve root kapatma oturmalı, sonra port değişikliği düşünülmelidir.

```bash
sudo nano /etc/ssh/sshd_config
```

Temel ayarlar:

```bash
Port 2222
PermitRootLogin no
PasswordAuthentication no
PermitEmptyPasswords no
```

Test ve uygulama:

```bash
sudo sshd -t
sudo systemctl restart sshd
sudo ss -tlnp | grep 2222
```

Firewall'da portu açın:

```bash
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

Yeni port ile bağlanma:

```bash
ssh -p 2222 deployer@SUNUCU_IP
```

> Dikkat: Yeni port ile bağlantıyı test etmeden eski oturumu kapatmayın.

---

## 5. Hostname, Timezone ve Locale Politikası

### Hostname

Hostname sadece kozmetik değildir. Aşağıdaki yerlerde kritik hale gelir:

- monitoring dashboard
- log aramaları
- backup raporları
- incident timeline'ları
- CMDB / inventory kayıtları

Önerilen pattern:

```text
<environment>-<role>-<index>
```

Örnekler:

- `prod-api-01`
- `prod-db-01`
- `staging-web-02`

```bash
sudo hostnamectl set-hostname prod-api-01
hostnamectl
sudo nano /etc/hosts
```

`/etc/hosts` örneği:

```text
127.0.0.1 localhost
127.0.1.1 prod-api-01

# Sunucu IP'si
YOUR_SERVER_IP prod-api-01
```

Kontrol:

```bash
hostnamectl --static
hostname -f
getent hosts "$(hostname)"
```

### Timezone Politikası: Host için UTC önerilir

Burada en doğru varsayılan çoğu zaman:

```text
Timezone = UTC
```

### Neden UTC?

- Farklı bölge ve servis loglarını hizalamak kolay olur
- Yaz saati / kış saati geçişleri sorun çıkarmaz
- DB, cron, alert ve queue timestamp'leri daha az sürpriz üretir
- Incident anında "hangi yerel saat?" tartışması olmaz

### Ne zaman local timezone kullanılabilir?

Sadece şu gibi net bir gereksinim varsa:

- compliance raporu lokal saat istiyorsa
- tüm operasyon ekibi tek timezone ile çalışıyorsa
- legacy uygulama host saatine sıkı bağımlıysa

Ama varsayılan öneri yine de:

- host = `UTC`
- uygulama veya UI = ihtiyaca göre `Europe/Istanbul`

```bash
timedatectl
sudo timedatectl set-timezone UTC
sudo timedatectl set-ntp true
timedatectl status
```

Kesin doğrulama:

```bash
timedatectl show --property=Timezone --value
timedatectl show --property=NTPSynchronized --value
date -u
```

### Locale Politikası: `C.UTF-8` veya `en_US.UTF-8`

Locale; tarih biçimi, ay adları, karakter seti ve bazı komut çıktılarını etkiler.

Server tarafında tavsiye:

- minimal ve öngörülebilir ortam için `C.UTF-8`
- daha klasik GNU/Linux ortamı için `en_US.UTF-8`

`tr_TR.UTF-8` kullanmak teknik olarak yanlış değildir; ama bazı script'lerde:

- localized hata mesajları,
- tarih / ay isimleri,
- büyük-küçük harf davranışları

parse sorunlarına yol açabilir.

En güvenli varsayılan:

```bash
sudo update-locale LANG=C.UTF-8 LC_ALL=C.UTF-8
```

English locale istenirse:

```bash
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

Kontrol:

```bash
cat /etc/default/locale
locale
localectl status 2>/dev/null || true
```

### Verify Matrix

| Ayar | Komut | Beklenen Sonuç |
| :--- | :---- | :------------- |
| Hostname | `hostnamectl --static` | Beklenen host adı dönmeli |
| FQDN / çözümleme | `hostname -f` | Hata vermemeli, host çözülebilmeli |
| Timezone | `timedatectl show --property=Timezone --value` | Varsayılan olarak `UTC` dönmeli |
| NTP sync | `timedatectl show --property=NTPSynchronized --value` | `yes` veya `true` dönmeli |
| Locale | `locale` | `LANG=C.UTF-8` veya beklenen locale görünmeli |

---

## 6. Temel Araçlar Kurulumu 🧰

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  htop \
  btop \
  jq \
  dialog \
  net-tools \
  vim \
  nano \
  unzip \
  zip \
  tree \
  ncdu \
  tmux \
  screen
```

### Araçların Kullanım Alanları

| Araç | Kullanım |
| :--- | :------- |
| `curl`, `wget` | Dosya indirme, API testleri |
| `git` | Kod ve config yönetimi |
| `htop`, `btop` | Sistem kaynak izleme |
| `jq` | JSON parse etme |
| `dialog` | Terminal UI scriptleri |
| `net-tools` | Eski ama faydalı network komutları |
| `vim`, `nano` | Metin editörleri |
| `tree` | Dizin yapısını görselleştirme |
| `ncdu` | Disk kullanımı analizi |
| `tmux`, `screen` | Terminal multiplexer |

---

## 7. Düşük Kaynaklı Sistemler İçin Optimizasyon 🐌

### A. Swappiness Ayarı

```bash
cat /proc/sys/vm/swappiness
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### B. Gereksiz Servisleri Devre Dışı Bırakma

```bash
systemctl list-unit-files --state=enabled
sudo systemctl disable --now bluetooth.service
sudo systemctl disable --now cups.service
sudo systemctl disable --now avahi-daemon.service
```

### C. Minimal Kernel Parametreleri

`/etc/sysctl.conf` dosyasına ekleyin:

```bash
vm.vfs_cache_pressure=50
vm.dirty_ratio=10
vm.dirty_background_ratio=5
net.core.rmem_max=8388608
net.core.wmem_max=8388608
```

Uygula:

```bash
sudo sysctl -p
```

### D. Hafif Alternatifler

| Standart | Hafif Alternatif |
| :------- | :--------------- |
| `htop` | `btop` |
| `systemd-journald` | Log boyutunu sınırla |
| `snapd` | Kaldır (gereksizse) |

İsteğe bağlı:

```bash
sudo apt purge snapd -y
sudo apt autoremove -y
```

`journald` sınırı:

```ini
[Journal]
SystemMaxUse=100M
SystemMaxFileSize=10M
```

```bash
sudo systemctl restart systemd-journald
```

---

## 8. Otomatik Güvenlik Güncellemeleri

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Önerilen ayarlar:

```text
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
```

---

## 9. Sistem Bilgilerini Görüntüleme

```bash
lsb_release -a
uname -r
lscpu
free -h
df -h
uptime
top
htop
```

---

## 10. Doğrulama Checklist ✅

Kurulumu tamamladıktan sonra kontrol edin:

- [ ] Sistem güncel (`apt update && apt full-upgrade`)
- [ ] Sudo yetkili kullanıcı oluşturuldu (`deployer`)
- [ ] SSH key ile bağlanılabiliyor
- [ ] SSH portu değiştirildi veya bilinçli olarak varsayılan bırakıldı
- [ ] Root SSH girişi kapatıldı (`PermitRootLogin no`)
- [ ] Hostname ayarlandı (`hostnamectl`)
- [ ] Timezone politikası uygulandı (`UTC` önerilir)
- [ ] Locale politikası uygulandı (`C.UTF-8` veya `en_US.UTF-8`)
- [ ] Temel araçlar kuruldu (`htop`, `git`, `curl`)
- [ ] Otomatik güvenlik güncellemeleri aktif
- [ ] Firewall yapılandırıldı (UFW)

---

## Sonraki Adımlar

1. [Kullanıcı Yönetimi](user-management.md)
2. [Cloud-Init ve First-Boot Provisioning](cloud-init.md)
3. [Güvenlik - SSH Hardening](../security/ssh.md)
4. [Güvenlik - Firewall](../security/firewall.md)
5. [Docker Kurulumu](docker.md)

---

## Referanslar

- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [Debian Administrator's Handbook](https://debian-handbook.info/)
- [SSH Hardening Guide](https://www.ssh.com/academy/ssh/sshd_config)
