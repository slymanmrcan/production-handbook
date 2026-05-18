# Bastion Host (Jump Box) Mimarisi 🏰

Bastion Host (Kale Sunucusu), ağınızın tek giriş kapısıdır. Diğer tüm sunucular internete kapalıdır (Private Network), sadece Bastion sunucusundan gelen bağlantıları kabul ederler.

Bu yapı, saldırı yüzeyini **tek bir noktaya** indirger ve bu noktayı çok sıkı korumanıza olanak tanır.

## 1. Mimari

```mermaid
graph LR
    User[💻 Sen (Laptop)] -->|SSH (22)| Bastion[🏰 Bastion Host\n(Public IP)]
    Bastion -->|SSH (Internal)| App1[App Server 1\n(Private IP)]
    Bastion -->|SSH (Internal)| DB1[DB Server 1\n(Private IP)]

    style Bastion fill:#f96,stroke:#333
    style User fill:#fff,stroke:#333
```

- **Bastion:** Public IP'ye sahip tek sunucu. Çok sıkı güvenlik önlemleri var (2FA, IP Whitelist).
- **Internal Sunucular:** Sadece Private IP'leri var. Dış dünyadan SSH erişimi YOK.

## 2. Bastion Sunucu Kurulumu

Bu sunucu üzerinde **hiçbir uygulama çalışmamalıdır**. Sadece SSH servisi olmalıdır.

### Adım 1: Sıkılaştırma (Hardening)

Standart güvenlik önlemlerini (Key-only auth, root login disable) uygulayın. Ek olarak:

**_/etc/ssh/sshd_config_**

```bash
# Sadece forwarding ve jump için izin ver
AllowTcpForwarding yes
X11Forwarding no
PermitTunnel no
AllowAgentForwarding yes
```

### Adım 2: 2FA (Google Authenticator)

Bu sunucuya giren herkesin telefonundaki kodu girmesi zorunlu olmalıdır.
_(Detaylar için [Google Auth (2FA)](2fa.md) sayfasına bakın)_

### Adım 3: Firewall (Kritik!)

Sadece yöneticilerin IP adreslerine izin verin.

```bash
sudo ufw default deny incoming
sudo ufw allow from 88.241.x.x to any port 22
sudo ufw enable
```

## 3. Bağlantı (Client Usage)

Bastion kullanmak zor veya yavaş değildir. `ProxyJump` özelliği ile sanki direkt bağlanıyormuşsunuz gibi çalışır.

### Yöntem 1: Tek Seferlik Komut (-J)

```bash
# Format: ssh -J <bastion-user>@<bastion-host> <target-user>@<target-host>

ssh -J admin@bastion.example.com root@10.0.0.5
```

Terminal size önce Bastion şifresini/anahtarını sorar (veya bilgisayarınızdaki key'i kullanır), sonra hedef sunucuya sizi fırlatır.

### Yöntem 2: SSH Config (Otomatik) 🚀

Bilgisayarınızdaki `~/.ssh/config` dosyasına şu ayarı yapın.

```ssh
# 1. Bastion Sunucusu
Host bastion
    HostName bastion.example.com
    User admin
    IdentityFile ~/.ssh/id_rsa

# 2. Arka Plandaki Sunucular (Private IP)
Host app-server
    HostName 10.0.0.5
    User root
    # Sihirli satır: Bastion üzerinden yap
    ProxyJump bastion
```

Artık sadece sunucu ismini yazmanız yeterli:

```bash
ssh app-server
```

_Arka planda otomatik olarak Bastion üzerinden tünel açılır._

## 4. Avantajlar

1.  **Tek Noktadan Denetim:** Kimin ne zaman bağlandığını sadece Bastion loglarına bakarak görebilirsiniz.
2.  **Yama Yönetimi:** Sadece tek bir sunucunun SSH servisini güncellemek ve korumakla yükümlüsünüz.
3.  **İzolasyon:** Arka plandaki veritabanı veya uygulama sunucularını `0.0.0.0`'a açmanıza gerek kalmaz.

## 5. Farklı Ağ Senaryoları

Bastion sunucusunun nerede olduğuna göre iki farklı kurulum stratejisi vardır.

### Senaryo A: Aynı Ağda (VPC/LAN) - ⭐ Önerilen

En güvenli yöntemdir. Hedef sunucuların **Public IP adresi yoktur**.

- **Bastion:** Public IP + Private IP (örn: `10.0.0.2`)
- **App Server:** Sadece Private IP (örn: `10.0.0.5`)

Saldırgan App Server'a istese de ulaşamaz çünkü internete kapalıdır. Bastion üzerinden `10.0.0.5`'e tünel atılır.

### Senaryo B: Farklı Ağlarda (Remote Bastion)

Eğer Bastion AWS'de, App Server ise başka bir veri merkezindeyse ve aralarında özel bir ağ (VPN/VPC Peering) yoksa:

- **Bastion:** Public IP (`88.x.x.x`)
- **App Server:** Public IP (`99.x.x.x`)

**Güvenlik Kuralı (Whitelist):**
App Server 'herkese' açık IP'ye sahip olsa bile, Firewall (UFW) kuralı ile **sadece Bastion'un IP'sini** kabul etmelidir.

**App Server üzerinde:**

```bash
# 1. Herkese kapat
sudo ufw deny 22

# 2. SADECE Bastion sunucusuna aç
sudo ufw allow from 88.x.x.x to any port 22
```

Böylece App Server internete açık olsa bile, Bastion dışında kimse SSH yapamaz.
