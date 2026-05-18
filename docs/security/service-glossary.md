# Linux Servis Sözlüğü

Bu döküman, `systemctl list-units` komutunu çalıştırdığınızda karşınıza çıkabilecek servislerin anlamlarını ve "Silinmeli mi?" sorusunun cevabını içerir. Listenizdeki servisleri burada aratarak (Ctrl+F) ne işe yaradığını öğrenebilirsiniz.

---

## 1. Bulut ve Yönetim Ajanları (Cloud & Agents)

Bulut sağlayıcıların (Oracle, AWS, GCP) sunucuyu yönetmek için yüklediği servislerdir.

| Servis Adı                     | Açıklama                                                                             | Karar                     |
| :----------------------------- | :----------------------------------------------------------------------------------- | :------------------------ |
| **`cloud-init`**               | Sunucunun ilk açılışında IP, Hostname ve SSH anahtarlarını ayarlar.                  | ⛔️ **ASLA SİLME**        |
| **`oracle-cloud-agent`**       | Oracle Cloud yönetim paneli ile iletişim kurar (Reboot, Stop özellikleri için).      | ⛔️ **DOKUNMA**           |
| **`unified-monitoring-agent`** | Oracle için log ve metrik toplar.                                                    | ✅ İsteğe Bağlı (Kalsın)  |
| **`amazon-ssm-agent`**         | AWS Systems Manager. Konsol üzerinden terminale (Session Manager) bağlanmayı sağlar. | ⛔️ **DOKUNMA** (AWS)     |
| **`google-guest-agent`**       | GCP ağ ve metadata yönetimi. SSH anahtarlarını yönetir.                              | ⛔️ **DOKUNMA** (GCP)     |
| **`aliyun-service`**           | Alibaba Cloud yönetim ajanı.                                                         | ⛔️ **DOKUNMA** (Alibaba) |
| **`waagent`**                  | Azure Linux Agent.                                                                   | ⛔️ **DOKUNMA** (Azure)   |

---

## 2. Sistem Çekirdeği (System Core)

Linux'un çalışması için gerekli temel parçalar.

| Servis Adı             | Açıklama                                                                 | Karar                                   |
| :--------------------- | :----------------------------------------------------------------------- | :-------------------------------------- |
| **`dbus`**             | Programların birbiriyle konuşmasını sağlayan mesajlaşma sistemi.         | ⛔️ **ASLA SİLME**                      |
| **`systemd-journald`** | Log tutma servisi (System logs).                                         | ⛔️ **ASLA SİLME**                      |
| **`systemd-logind`**   | Kullanıcı girişlerini yönetir.                                           | ⛔️ **ASLA SİLME**                      |
| **`systemd-udevd`**    | Donanım aygıtlarını yönetir (`/dev` altındakiler).                       | ⛔️ **ASLA SİLME**                      |
| **`polkit`**           | Yetkilendirme yöneticisi (sudo benzeri ama GUI/servisler için).          | ⚠️ Genelde Kalsın (Agresif silinebilir) |
| **`cron` / `atd`**     | Zamanlanmış görevler.                                                    | ✅ Kalsın                               |
| **`getty@tty1`**       | Fiziksel/VNC konsol giriş ekranı.                                        | ✅ Kalsın                               |
| **`serial-getty@...`** | Seri port konsol. **ARM sunucularda (Oracle Ampere) hayati önem taşır.** | ⛔️ **DOKUNMA** (ARM)                   |

---

## 3. Ağ Servisleri (Network)

Sunucunun internete çıkmasını sağlayan servisler.

| Servis Adı              | Açıklama                                                         | Karar                         |
| :---------------------- | :--------------------------------------------------------------- | :---------------------------- |
| **`ssh` / `sshd`**      | Sunucuya uzaktan bağlanmanızı sağlar.                            | ⛔️ **ASLA SİLME**            |
| **`systemd-networkd`**  | Ağ yapılandırması (IP alma vb.).                                 | ⛔️ **ASLA SİLME**            |
| **`systemd-resolved`**  | DNS (Domain Name) çözümleme.                                     | ⛔️ **ASLA SİLME**            |
| **`systemd-timesyncd`** | Saat senkronizasyonu (NTP). Loglar ve güvenlik için şart.        | ✅ Kalsın                     |
| **`ModemManager`**      | USB Modem / SIM kart yönetimi.                                   | 🗑 **SİL** (Sunucuda gereksiz) |
| **`rpcbind`**           | NFS dosya paylaşımı için port atar. NFS yoksa güvenlik riskidir. | 🗑 **SİL** (NFS yoksa)         |
| **`vnstat`**            | Ağ trafiği izleme aracı (Ne kadar GB harcadım?).                 | ✅ İsteğe Bağlı               |
| **`wpa_supplicant`**    | Wi-Fi bağlantı yöneticisi.                                       | 🗑 **SİL** (Kablosuz değilse)  |

---

## 4. Depolama (Storage)

Disk yönetimi ile ilgili servisler.

| Servis Adı       | Açıklama                                                                         | Karar                                    |
| :--------------- | :------------------------------------------------------------------------------- | :--------------------------------------- |
| **`iscsid`**     | Ağ üzerinden disk bağlama (iSCSI). **Oracle Block Volume** kullanıyorsanız şart. | ⚠️ **DİKKAT** (Block Volume varsa SİLME) |
| **`multipathd`** | Diske giden birden fazla yol varsa yönetir. Tek diskli VM'lerde gereksiz.        | 🗑 **SİL** (Sadece Boot Volume ise)       |
| **`udisks2`**    | Masaüstünde USB takınca otomatik bağlayan araç. Sunucuda gereksiz.               | 🗑 **SİL**                                |
| **`fstrim`**     | SSD disklerin ömrünü uzatmak için bakım yapar.                                   | ✅ Kalsın                                |

---

## 5. Konteyner ve Uygulama (Docker & Apps)

| Servis Adı       | Açıklama                                                   | Karar                       |
| :--------------- | :--------------------------------------------------------- | :-------------------------- |
| **`docker`**     | Docker Engine. Konteynerleri çalıştırır.                   | ✅ Kalsın (Kullanıyorsanız) |
| **`containerd`** | Docker'ın altındaki konteyner çalışma zamanı.              | ✅ Kalsın (Docker varsa)    |
| **`snapd`**      | Snap paket yöneticisi. Oracle Agent buna bağımlı olabilir. | ⚠️ **KONTROLLÜ SİL**        |

---

## 6. Güvenlik (Security)

| Servis Adı                | Açıklama                                  | Karar                                   |
| :------------------------ | :---------------------------------------- | :-------------------------------------- |
| **`fail2ban`**            | SSH brute-force saldırılarını engeller.   | ✅ Kalsın (CrowdSec yoksa)              |
| **`apparmor`**            | Uygulama bazlı güvenlik profilleri.       | ✅ Kalsın                               |
| **`unattended-upgrades`** | Otomatik güvenlik güncellemelerini yapar. | ✅ **ŞİDDETLE ÖNERİLİR**                |
| **`ufw` / `firewalld`**   | Güvenlik duvarı.                          | ✅ Biri mutlaka çalışmalı (İkisi değil) |

---

## 7. Gereksiz Donanım (Bloatware)

Sunucularda (genelde) bulunmayan donanımlar için servisler.

| Servis Adı          | Açıklama                                                                                                            | Karar         |
| :------------------ | :------------------------------------------------------------------------------------------------------------------ | :------------ |
| **`cups`**          | Yazıcı servisi. Sunucudan çıktı almayacaksanız gereksiz.                                                            | 🗑 **SİL**     |
| **`cups-browsed`**  | Ağdaki yazıcıları otomatik bulur.                                                                                   | 🗑 **SİL**     |
| **`bluetooth`**     | Bluetooth cihaz yönetimi.                                                                                           | 🗑 **SİL**     |
| **`alsa-state`**    | Ses kartı ayarları.                                                                                                 | 🗑 **SİL**     |
| **`smartmontools`** | Fiziksel disk sağlık kontrolü. (Sanal sunucuda disk sanal olduğu için çoğu zaman işe yaramaz ama zararı da yoktur). | 🤷‍♂️ Fark etmez |

---

## Özet: Temizlik Komutu

Eğer yukarıdaki tablodan emin olduysanız, en yaygın gereksizleri temizlemek için:

```bash
# Servisleri durdur
sudo systemctl stop cups cups-browsed bluetooth ModemManager udisks2 rpcbind

# Başlangıçta çalışmasınlar
sudo systemctl disable cups cups-browsed bluetooth ModemManager udisks2 rpcbind

# Durum kontrolü
systemctl status cups
```
