# Gereksiz Servislerin Temizliği (Multi-Cloud)

Sanal sunucular (VPS), genellikle çok amaçlı imajlardan türetilir. Bu imajlar, "her duruma uysun" diye ihtiyacınız olmayan onlarca servisle yüklü gelir.

Bu rehber **Oracle Cloud, Google Cloud (GCP), Alibaba Cloud, AWS, Azure** ve **DigitalOcean** üzerindeki **Ubuntu, Debian ve CentOS** sistemleri için geçerlidir.

---

## 1. Analiz: Neyin Çalıştığını Gör

Körlemesine servis kapatmayın. Önce neyin çalıştığını görün. **Listede gördüğünüz servislerin ne işe yaradığını öğrenmek için [Servis Sözlüğü](service-glossary.md) sayfasına bakın.**

=== "Debian / Ubuntu"
`  systemctl list-units --type=service --all
    # Veya sadece çalışanları görmek için:
    systemctl list-units --type=service --state=running
 `

=== "CentOS / RHEL"
`  systemctl list-units --type=service --state=running
 `

---

## 2. Hızlı Referans Tablosu ⚡️

Hangi servise ne yapacağınıza karar veremiyorsanız bu tabloyu kullanın:

| Servis            | Ne Yapar        | Kapatılabilir mi?                 | Risk       |
| ----------------- | --------------- | --------------------------------- | ---------- |
| **cups**          | Yazıcı yönetimi | ✅ **EVET**                       | Yok        |
| **bluetooth**     | Bluetooth       | ✅ **EVET**                       | Yok        |
| **ModemManager**  | Modem/SIM       | ✅ **EVET**                       | Yok        |
| **rpcbind**       | NFS port map    | ⚠️ NFS yoksa EVET                 | Düşük      |
| **multipathd**    | Çoklu disk yolu | ⚠️ SAN yoksa EVET                 | Orta       |
| **iscsid**        | iSCSI disk      | ❌ **HAYIR** (Block Volume varsa) | **Yüksek** |
| **cloud-init**    | İlk boot ve IP  | ❌ **ASLA**                       | **Kritik** |
| **snapd**         | Snap paketler   | ⚠️ Agent veya App yoksa           | Orta       |
| **postfix/exim4** | Mail gönderme   | ⚠️ Cron/Fail2ban yoksa            | Düşük      |
| **firewalld**     | Firewall        | ⚠️ UFW kurulacaksa EVET           | Orta       |
| **vnstat**        | Trafik izleme   | ✅ İsteğe bağlı                   | Yok        |

---

## 3. Güvenli Temizlik Sırası 🎯

**ASLA** tüm servisleri aynı anda kapatmayın! Adım adım ilerleyin.

### Adım 1: Kesinlikle Gereksizler (Bloatware)

Sunucuda yazıcı, modem veya ses kartı yoktur.

=== "Temizlik Komutu"

```bash # Servisleri durdur
sudo systemctl stop cups cups-browsed bluetooth ModemManager udisks2
sudo systemctl disable cups cups-browsed bluetooth ModemManager udisks2

# (Opsiyonel) Eğer tamamen silmek isterseniz:
# sudo apt purge -y cups* bluez* alsa-utils ModemManager
# sudo apt autoremove -y
```

!!! info "Hata Alırsanız Sevinin! 🎉"
Eğer `Failed to stop... unit not loaded` hatası alırsanız, bu harika bir haberdir! O servis zaten sisteminizde yüklü değil demektir. Hiçbir şey yapmanıza gerek yok.

!!! tip "Kapatmak mı, Silmek mi?"
_ **Disable:** "Şimdilik çalışma ama dosyalar dursun, belki lazım olur." (Güvenli)
_ **Mask:** "Asla ve asla çalışma, kimse seni çağıramazsın." (Daha Güvenli) \* **Purge:** "Kökten sil, dosyalarını da yok et." (En Temiz - Paket adını küçük harfle yazın!)

### Adım 2: snapd (Snap Paket Yöneticisi)

Canonical'ın konteyner tabanlı paket sistemi.

**Kapatmalı mıyım?**

- **HAYIR:** Eğer `snap list` çıktısında şunlar varsa:
  - `oracle-cloud-agent` (Oracle Cloud)
  - `amazon-ssm-agent` (AWS)
  - `google-cloud-ops-agent` (GCP)
  - `core`, `snapd`, `lxd` (Sistem bileşenleri)
  - `certbot` (Eğer snap ile kurulduysa)
- **EVET:** Liste tamamen boşsa VE snap kullanmayacaksanız.

```bash
# Kontrol et
snap list

# Eğer liste BOŞSA veya gereksizse:
sudo systemctl stop snapd snapd.socket
sudo systemctl disable snapd snapd.socket
# sudo apt purge snapd -y  # Sadece Ubuntu/Debian ve eminseniz!
```

---

### Adım 3: Ağ ve Depolama (Kontrollü Gidin)

#### Multipath Tools (`multipathd`)

**Kapatmalı mıyım?**

- **EVET:** Standart bir VM ise ve sadece **Boot Volume** kullanıyorsanız. Ek diskiniz (`/dev/sdb`) olsa bile `/dev/mapper` altında görünmüyorsa.
- **HAYIR:** Kurumsal SAN/iSCSI yapısında, diski `/dev/mapper/mpatha` gibi bir isimle kullanıyorsanız.

#### iSCSI Servisi (`iscsid`) - DİKKAT! ⛔

**Oracle Cloud Block Volume kullanıcıları için HAYATİDİR.**

- **HAYIR:** Eklediğiniz Block Volume'ler iSCSI protokolü ile çalışır. Kapatırsanız diskiniz ve veriniz kaybolur!
- **EVET:** Sadece Boot Volume kullanıyorsanız ve gelecekte de disk eklemeyecekseniz (Sadece bu durumda).

#### RPC Bind (`rpcbind`)

**Kapatmalı mıyım?** NFS (Dosya Paylaşımı) kullanmıyorsanız kapatın.

```bash
sudo systemctl stop rpcbind
sudo systemctl disable rpcbind
sudo systemctl stop rpcbind.socket
sudo systemctl disable rpcbind.socket
```

---

## 4. Kritik Uyarılar! ⚠️

### Firewall Çakışması

**ASLA** iki firewall servisi aynı anda çalışmamalıdır.

- **Ubuntu:** `ufw` kullanıyorsanız `firewalld` veya `iptables-persistent` çakışabilir.
- **CentOS:** `firewalld` varsayılandır. `ufw` kuracaksanız `firewalld` KAPATILMALIDIR.

```bash
# CentOS için Firewalld kapatma (Eğer UFW kullanacaksanız):
sudo systemctl stop firewalld && sudo systemctl disable firewalld
sudo systemctl mask firewalld # Tekrar açılmasını engeller
```

### Mail Transfer Agent (MTA)

**Postfix** (CentOS) veya **Exim4** (Ubuntu).
Sistem e-postaları (Cron, Fail2Ban bildirimleri) için kullanılır. Dışarıya mail atmayacaksanız:

1.  **Güvenli:** Sadece `localhost` dinlemesini sağlayın (`inet_interfaces = loopback-only`).
2.  **Agresif:** Tamamen kapatın (Log takibi zorlaşabilir).

```bash
# Kapatmak için:
sudo systemctl stop postfix exim4
sudo systemctl disable postfix exim4
```

### Getty Servisleri (ARM Sunucular Dikkat!)

- `getty@tty1` -> Fiziksel konsol.
- `serial-getty@ttyAMA0` -> **ARM (Oracle Ampere) Serial Console.**

**UYARI:** Oracle Cloud ARM sunucularda `serial-getty@ttyAMA0` servisini **SAKIN KAPATMAYIN**. SSH erişiminiz kesilirse sunucuyu kurtarmanın tek yolu Web Konsol'dur ve o da bu servise bağlıdır.

---

## 5. Bulut Ajanları (Cloud Agents) - DOKUNMAYIN! ⛔

Her bulut sağlayıcısı yönetimi için kendi ajanını yükler. **Silerseniz Reboot/Reset Password özellikleri bozulur.**

### Evrensel

- **cloud-init:** Tüm bulutlarda (AWS, GCP, Oracle, Azure) vardır. İlk IP ve Key ayarlarını yapar. **ASLA SİLMEYİN.**

### Oracle Cloud Infrastructure (OCI)

- **Servisler:** `oracle-cloud-agent`, `oracle-cloud-agent-updater`
- **Not:** Genelde Snap veya Systemd servisidir. Dokunmayın.

### Google Cloud Platform (GCP)

- **Servisler:** `google-guest-agent` (Metadata/Network), `google-oslogin-agent` (SSH Key Yönetimi)
- **Risk:** Silerseniz GCP Console'dan SSH yapamazsınız.

### Amazon Web Services (AWS)

- **Servisler:** `amazon-ssm-agent`, `amazon-cloudwatch-agent`
- **Risk:** SSM Session Manager erişimi kaybolur.

### Alibaba & Azure & DigitalOcean

- **Alibaba:** `aliyun-service`
- **Azure:** `walinuxagent` (waagent)
- **DigitalOcean:** `digitalocean-agent`
- **Hetzner:** `hcloud-init`

> **Genel Kural:** Servis adında `agent`, `guest`, `monitoring` veya sağlayıcı adı (`oracle`, `aws` vb.) geçiyorsa **DOKUNMAYIN.**

---

## 6. Son Kontrol Listesi ✅

Temizlik sonrası son bir kontrol için şu komutu çalıştırıp "kırmızı bayrak" listedekiler var mı bakın:

```bash
# Gereksiz servis kontrolü:
sudo systemctl list-units --type=service --state=running | \
  grep -iE "cups|bluetooth|modem|rpcbind|postfix|exim4|multipath|vnstat|udisks2|polkit|alsa|pulse"
```

- **Çıktı BOŞSA:** Mükemmel! 🎉 Sunucunuz temiz ve güvenli.
- **Çıktı VARSA:** Listeyi ve yukarıdaki "İstisnalar"ı tekrar kontrol edin.
