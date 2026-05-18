# CrowdSec ile Modern Koruma 🛡️

**CrowdSec**, kitlesel istihbarat (crowd-sourced intelligence) kullanan modern bir güvenlik aracıdır. Fail2Ban'in "yeni nesil" halefi olarak düşünülebilir.

> [!CAUTION] > **Önce Fail2ban'i Silin:** CrowdSec kurmadan önce sunucunuzda Fail2ban varsa mutlaka durdurun ve kaldırın. İkisi aynı anda **çalışmamalıdır** (Çakışma yaratır).
>
> ```bash
> sudo systemctl stop fail2ban && sudo apt remove fail2ban
> ```

---

## 🔑 Terimler Sözlüğü (Sözlük)

CrowdSec dünyasına girmeden önce bu dört terimi bilmek hayat kurtarır:

| Terim          | Anlamı         | Açıklama                                                                                  |
| :------------- | :------------- | :---------------------------------------------------------------------------------------- |
| **Bouncer**    | Kapı Görevlisi | Kararları uygulayan parçadır. (Örn: `iptables` bouncer'ı IP'yi bloklar).                  |
| **Scenario**   | Kural/Senaryo  | Neyin saldırı olduğunu tanımlar. (Örn: "3 dakikada 5 hatalı SSH girişi").                 |
| **Decision**   | Karar          | Bir senaryo tetiklenince alınan aksiyon. (Örn: "Bu IP'yi 4 saat banla").                  |
| **Collection** | Paket          | İlgili senaryo ve ayrıştırıcıların (parsers) toplu halidir. (Örn: `crowdsecurity/nginx`). |
| **Alert**      | Uyarı          | Bir saldırı tespit edildiğinde oluşturulan kayıt (Henüz aksiyon alınmamış olabilir).      |

---

## 1. Neden CrowdSec? (Fail2Ban vs CrowdSec)

Fail2Ban sadece **sizin** loglarınızı okur. CrowdSec ise **herkesin** deneyiminden faydalanır.

Dünyanın bir ucundaki saldırgan başka bir CrowdSec kullanıcısına saldırdığında, IP adresi "kötü niyetli" olarak işaretlenir ve bu bilgi anında (veya kısa sürede) sizin sunucunuza da gelir. Böylece saldırgan daha kapınıza gelmeden engellenmiş olur.

| Özellik        | Fail2Ban                   | CrowdSec                          |
| :------------- | :------------------------- | :-------------------------------- |
| **Mantık**     | Log okur, Regex ile banlar | Log okur, Senaryo ile karar verir |
| **İstihbarat** | Yok (Sadece yerel)         | **Var** (Küresel IP veritabanı)   |
| **Hız**        | Hızlı                      | Çok Hızlı (Golang ile yazılmış)   |
| **Yönetim**    | Dosya tabanlı (Basit)      | CLI + Web Konsol (Modern)         |
| **IPv6**       | Zor                        | Tam Destek                        |

---

## 2. Hızlı Kurulum (Debian/Ubuntu)

Kurulum scripti gerekli repoları otomatik ekler.

```bash
curl -s https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | sudo bash
sudo apt install -y crowdsec
```

Kurulum sırasında CrowdSec, sunucunuzdaki servisleri (SSH, Nginx, Docker vb.) otomatik algılar ve uygun koleksiyonları kurar.

### Firewall Bouncer Kurulumu (Zorunlu)

CrowdSec tek başına sadece "tespit" yapar (Detect). Engelleme yapması (Remediate) için "Bouncer" şarttır.

```bash
sudo apt install -y crowdsec-firewall-bouncer-iptables
```

---

## 3. Kritik Ayar: Whitelist (Beyaz Liste) 🏳️

**Kendimizi banlamayalım!** Kurulumdan hemen sonra kendi statik IP'nizi veya VPN IP'nizi beyaz listeye ekleyin.

1.  Whitelist dosyasını oluşturun/düzenleyin:

    ```bash
    sudo nano /etc/crowdsec/parsers/s02-enrich/my-whitelist.yaml
    ```

2.  Şu içeriği (kendi IP'nizle) ekleyin:

    ```yaml
    name: my-custom-whitelist
    description: "Guvenli IP listem"
    whitelist:
      reason: "Ofis/Ev IP"
      ip:
        - "192.168.1.5" # Yerel IP örneği
        - "203.0.113.55" # Statik WAN IP'niz
      # cidr:                 # İsterseniz blok olarak ekleyin
      #   - "192.168.0.0/24"
    ```

3.  Servisi yeniden yükleyin:
    ```bash
    sudo systemctl reload crowdsec
    ```

---

## 4. Kurulum Sonrası Test (Simülasyon Modu) 🧪

CrowdSec'i "Simülasyon" moduna alarak kararların gerçekten uygulanmamasını (sadece loglanmasını) sağlayabilirsiniz. İlk kurulumda önerilir.

```bash
# Simülasyonu aç
sudo cscli simulation enable --global

# Logları izle (Başka bir terminalden saldırı denemesi yapabilirsiniz)
tail -f /var/log/crowdsec.log
```

Her şeyin düzgün çalıştığına emin olduktan sonra kapatmayı unutmayın:

```bash
sudo cscli simulation disable --global
sudo systemctl reload crowdsec
```

---

## 5. Temel Komutlar (`cscli`)

CrowdSec'in kalbi `cscli` komutudur.

### Durum ve Metrikler

```bash
# Genel sağlık durumu
sudo cscli metrics

# Bouncer'lar çalışıyor mu?
sudo cscli bouncers list
```

### Kararlar ve Banlama

```bash
# Şu an kimler banlı?
sudo cscli decisions list

# Masum birini yanlışlıkla banladıysanız:
sudo cscli decisions delete --ip 1.2.3.4

# Manuel banlama (4 saatliğine)
sudo cscli decisions add --ip 1.2.3.4 --duration 4h --reason "Canim istedi"
```

### Uyarılar (Alerts)

```bash
# Geçmiş uyarıları listele
sudo cscli alerts list
```

---

## 6. Koleksiyonlar ve Senaryolar 📦

CrowdSec "Hub" mantığıyla çalışır. İhtiyacınız olan koruma paketlerini indirirsiniz.

```bash
# Nginx koruması ekle (HTTP saldırıları için)
sudo cscli collections install crowdsecurity/nginx
sudo systemctl reload crowdsec
```

Varsayılan olarak `crowdsecurity/linux` (SSH, Sudo vb.) zaten kuruludur.

---

## 7. Docker Entegrasyonu 🐳

Docker kullanıyorsanız, container loglarını CrowdSec'e okutmalısınız.

### Yöntem 1: Host Üzerinden (Önerilen)

CrowdSec host makinede kuruluysa, Docker'ın log dizinini okuması yeterlidir: `acquis.yaml` dosyasına ekleyin.

```yaml
# /etc/crowdsec/acquis.yaml
filenames:
  - /var/lib/docker/containers/*/*.log
labels:
  type: docker
```

### Yöntem 2: Tam Docker Stack (Compose Örneği)

Eğer her şeyi Docker içinde çalıştırmak isterseniz örnek `docker-compose.yml`:

```yaml
version: "3"
services:
  crowdsec:
    image: crowdsecurity/crowdsec
    environment:
      GID: "1000"
      COLLECTIONS: "crowdsecurity/linux crowdsecurity/traefik" # İhtiyaç duyulanlar
    volumes:
      - ./crowdsec-db:/var/lib/crowdsec/data
      - ./crowdsec-config:/etc/crowdsec
      - /var/log/auth.log:/var/log/auth.log:ro
    security_opt:
      - no-new-privileges:true

  bouncer-iptables:
    image: crowdsecurity/crowdsec-firewall-bouncer-iptables
    environment:
      API_KEY: "${API_KEY}" # CrowdSec'ten alacağınız anahtar
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host # Firewall yönetimi için şart
```

---

## 8. Web Konsol (Vizibilite) 🌍

Sunucunuz ne yapıyor görmek için [app.crowdsec.net](https://app.crowdsec.net) adresine kayıt olun.

1.  Hesap açın.
2.  Sunucunuzdan kayıt komutunu girin:
    ```bash
    sudo cscli console enroll <SIZE_VERILEN_KOD>
    ```
3.  Artık saldırıları harita üzerinde canlı izleyebilirsiniz!

---

## 9. Sorun Giderme (Troubleshooting) 🔧

**S: Bir IP banlandı ama hala erişebiliyor?**
C: Bouncer kurulmamış veya çalışmıyor olabilir. `sudo cscli bouncers list` ile kontrol edin.

**S: Kendi IP'mi banladım!**
C: Acil durum: Başka bir IP'den (mobil veri vb.) bağlanıp `sudo cscli decisions delete --ip <IP>` yapın. Sonra Whitelist ayarlayın!

**S: Loglarda "file not found" hataları var.**
C: `acquis.yaml` dosyasındaki log yollarını kontrol edin. Ubuntu'da auth logları `/var/log/auth.log`, bazılarında `/var/log/secure` olabilir.
