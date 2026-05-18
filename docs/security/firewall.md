# Firewall (UFW) Yönetimi 🛡️

Linux sunucunuzun güvenliği için ilk savunma hattı güvenlik duvarıdır (Firewall). Biz kullanımı kolay ve güçlü olan **UFW (Uncomplicated Firewall)** aracını kullanıyoruz.

> [!IMPORTANT] > **Altın Kural:** "Her şeyi kapat, sadece ihtiyacı aç." (Default Deny)

---

## 1. Kurulum ve Hazırlık

Önce UFW paketinin kurulu olduğundan emin olalım (Genelde `ufw` komutu bulunamadı hatası alıyorsanız):

```bash
sudo apt update
sudo apt install ufw -y
```

Ardından temiz bir başlangıç yapalım. Eğer daha önce kurallar eklendiyse silelim.

```bash
# Servisi durdur (Güvenlik Önlemi)
# Ayarları yaparken bağlantımız kopmasın diye önce firewall'u kapatıyoruz.
sudo ufw disable

# Tüm kuralları sil (Temiz Başlangıç)
sudo ufw reset
```

> [!NOTE] > **Neden Sıfırlıyoruz?**
> Karışık veya hatalı eski kurallar kalmasın diye. Şu an Firewall **KAPALI**, yani konfigürasyon yaparken bağlantınız kesilmez. Rahat olun. ☕

### IPv6 Kontrolü

Sunucunuzda IPv6 aktifse UFW'nin bunu desteklediğinden emin olun.
`sudo nano /etc/default/ufw` dosyasını açın ve şu satırı kontrol edin:

```ini
IPV6=yes
```

---

## 2. Varsayılan Politikalar (Temel Yasaklar)

Güvenlik duvarının mantığı şudur: **"Aksi belirtilmedikçe her şeyi yasakla."**

```bash
# Dışarıdan gelen her şeyi ENGELLE
sudo ufw default deny incoming

# Dışarıya giden her şeyi ENGELLE (Opsiyonel ama önerilir - Egress Filtering)
# Bu, sunucu hacklenirse saldırganın dışarıya veri kaçırmasını zorlaştırır.
sudo ufw default deny outgoing
```

---

## 3. Temel Hizmetlerin İzni

Her şeyi yasakladık, şimdi sadece çalışan servislerimize "delik açacağız".

### Admin Erişimi (SSH) - ÇOK ÖNEMLİ ⚠️

Bunu yapmazsanız **sunucudan dışarıda kalırsınız!**

```bash
# Eğer standart port (22) kullanıyorsanız:
sudo ufw limit 22/tcp comment 'SSH'

# Eğer özel port (örn: 2222) kullanıyorsanız:
sudo ufw limit 2222/tcp comment 'SSH Port'
```

### Sık Kullanılan Servisler ve Portları

| Servis Adı | Port/Protokol  | Açıklama                |
| :--------- | :------------- | :---------------------- |
| SSH        | 22/tcp         | Güvenli Kabuk Erişimi   |
| HTTP       | 80/tcp         | Web Sunucusu (Şifresiz) |
| HTTPS      | 443/tcp        | Web Sunucusu (Şifreli)  |
| DNS        | 53/udp, 53/tcp | Alan Adı Çözümlemesi    |
| NTP        | 123/udp        | Ağ Zaman Protokolü      |
| MySQL      | 3306/tcp       | Veritabanı Sunucusu     |
| PostgreSQL | 5432/tcp       | Veritabanı Sunucusu     |
| Redis      | 6379/tcp       | Bellek İçi Veri Deposu  |

> [!NOTE] > **`limit` Nasıl Çalışır?**
>
> - **30 saniye** içinde **6'dan fazla** bağlantı denemesi yapan IP geçici olarak engellenir.
> - Brute-force saldırılarına karşı basit ama etkili bir korumadır.
> - Daha gelişmiş koruma için **Fail2Ban** kullanılmalıdır.

### Web Sunucusu (HTTP/HTTPS)

```bash
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
```

### Sunucunun Dışarı Çıkması İçin (Outgoing)

Eğer "Gideni Yasakla" (`default deny outgoing`) yaptıysanız, sunucunun çalışması için şunlara izin vermelisiniz:

```bash
# 1. DNS (Alan adlarını çözmek için)
sudo ufw allow out 53 comment 'DNS'

# 2. HTTP/HTTPS (Dosya indirmek, update yapmak, webhook atmak için)
sudo ufw allow out 80/tcp comment 'HTTP Out'
sudo ufw allow out 443/tcp comment 'HTTPS Out'

# 3. NTP (Saat senkronizasyonu)
sudo ufw allow out 123/udp comment 'NTP'
```

---

## 4. Aktifleştirme

Kuralları girdik ama henüz aktif değil. Önce eklediğimiz kuralları kontrol edelim:

```bash
# Henüz aktif olmadığı için 'status' çalışmaz. Eklenenleri şöyle görürüz:
sudo ufw show added
```

Her şey doğruysa, artık sistemi başlatabiliriz.

```bash
# SADECE KOMUTU ÇALIŞTIRIN AMA 'y' DEMEDEN ÖNCE OKUYUN:
# "Command may disrupt existing ssh connections" uyarısı verecektir.
# Eğer yukarıdaki SSH kuralını eklediyseniz korkmayın, 'y' diyip devam edin.
sudo ufw enable
```

> [!TIP] > **Kalıcılık:** > `enable` komutu, servisi hem hemen çalıştırır hem de sunucu yeniden başladığında **otomatik açılması** için ayarlar.
> Yani sunucuya reboot atsanız bile kuralların tekrar aktif olması için bir şey yapmanıza gerek yoktur.

**Durumu Kontrol Et:**

```bash
sudo ufw status verbose
```

---

## 5. Yönetim ve İpuçları

### Kural Silme

En kolay yol numaralı listeyi kullanmaktır.

```bash
# 1. Numaraları gör
sudo ufw status numbered

# 2. Numaraya göre sil (Örn: 5 numaralı kuralı sil)
sudo ufw delete 5
```

### Loglama

Kimler ne deniyor görmek için logları açabilirsiniz (Diski doldurmaması için 'low' seviyesinde).

```bash
sudo ufw logging on
sudo ufw logging low
```

_Loglar `/var/log/ufw.log` dosyasına yazılır._

### Belirli Bir IP'ye İzin Verme

Yönetim panelinizi tüm dünyaya açmak yerine sadece ofis IP'nize açın:

```bash
sudo ufw allow from 195.175.X.Y to any port 2222 proto tcp comment 'Ofis SSH'
```

---

## 6. Docker Kullananlar İçin Kritik Uyarı 🐳

> [!WARNING] > **Docker Güvenlik Açığı:**
> Docker, varsayılan olarak `iptables` kurallarını kendisi yönetir ve UFW'yi **BYPASS EDER**.
> Yani siz UFW'den 8080 portunu kapatsanız bile, Docker o portu açtıysa dışarıdan erişilebilir!

### Çözüm: `ufw-docker` Aracı

Manuel `iptables` ayarı yapmak zordur. Bunun yerine şu aracı kullanın:

**1. Aracı Kurun:**

```bash
sudo wget -O /usr/local/bin/ufw-docker https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
```

**2. Docker Entegrasyonunu Yapın:**

```bash
# Bu komut gerekli iptables kurallarını ekler
ufw-docker install
```

**3. Docker Portlarını Açma (Artık UFW Üzerinden):**
Bir container'a dışarıdan erişim vermek isterseniz artık:

```bash
# Sadece belirli bir container'a izin ver
ufw-docker allow my-web-container 80
```

Şeklinde kullanmalısınız. Detaylar için [ufw-docker GitHub](https://github.com/chaifeng/ufw-docker) sayfasına bakın.

---

## 7. Acil Durum Senaryoları 🚨

### Sunucuya Erişimi Kaybettim!

1.  **Hetzner/AWS Konsol:** Hosting panelinizden **VNC/Console** ile bağlanın.
2.  **Firewall'u Kapatın:**
    ```bash
    sudo ufw disable
    ```
3.  **Hala Girilemiyor mu?** Sunucuyu "Rescue Mode"a alın.

### Tüm Kuralları Anlık Kaldırmak (Panik Butonu)

```bash
sudo ufw reset && sudo ufw disable
```

### Belirli Bir IP'yi Acil Banlamak

```bash
sudo ufw deny from 185.143.223.0/24 comment 'Spam IP Bloğu'
```

---

## 8. Kurulum Kontrol Listesi ✅

- [ ] UFW kuruldu (`sudo apt install ufw`)
- [ ] Varsayılan politikalar ayarlandı (`default deny incoming`)
- [ ] SSH portu açıldı (Yoksa dışarıda kalırsın!)
- [ ] Web portları açıldı (80, 443)
- [ ] Outgoing kuralları eklendi (DNS, HTTP, NTP)
- [ ] Kontrol edildi: `sudo ufw show added`
- [ ] Aktif edildi: `sudo ufw enable`
- [ ] Docker kullanılıyorsa `ufw-docker` kuruldu
