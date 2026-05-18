# Zamanlanmış Görevler (Cron) ⏰

Linux sunucularında periyodik işlemler (yedekleme, log temizleme, rapor alma vb.) için **Cron** kullanılır. En temel ve güvenilir otomasyon aracıdır.

---

## 1. Cron Sözdizimi (Syntax)

Bir Cron işi (job) tanımlarken şu 5 zaman dilimini kullanırız:

```text
* * * * * komut
│ │ │ │ │
│ │ │ │ └─── Haftanın Günü (0 - 7) (Pazar = 0 veya 7)
│ │ │ └───── Ay (1 - 12)
│ │ └─────── Ayın Günü (1 - 31)
│ └───────── Saat (0 - 23)
└─────────── Dakika (0 - 59)
```

> [!TIP] > **Yardımcı Araç:** Zamanlamayı görselleştirmek için [crontab.guru](https://crontab.guru/) sitesini kullanabilirsiniz.

---

## 2. Temel Komutlar

Kendi kullanıcınız (root değilse `sudo` kullanmayın) için zamanlanmış görevleri yönetmek:

```bash
# Mevcut görevleri listele
crontab -l

# Görevleri düzenle (Editör açar)
crontab -e

# Tüm görevleri sil (Dikkat!)
crontab -r
```

---

## 3. Yaygın Kullanım Örnekleri

| Zamanlama              | Kod           | Açıklama                                         |
| :--------------------- | :------------ | :----------------------------------------------- |
| **Her Dakika**         | `* * * * *`   | Test amaçlı veya çok sık gereken işler.          |
| **Her 5 Dakikada Bir** | `*/5 * * * *` | `*/` operatörü "her X'te bir" demektir.          |
| **Her Saat Başı**      | `0 * * * *`   | Dakika 0 olduğunda çalışır.                      |
| **Her Gece Yarısı**    | `0 0 * * *`   | Günlük yedekler için idealdir. (00:00)           |
| **Her Pazar 04:00**    | `0 4 * * 0`   | Haftalık bakım işlemleri için.                   |
| **Açılışta (Reboot)**  | `@reboot`     | Sunucu yeniden başladığında **bir kez** çalışır. |

### Örnek Bir Satır:

```bash
# Her gece 03:30'da yedek al
30 03 * * * /home/kullanici/scripts/yedek_al.sh
```

---

## 4. Kullanıcı Crontab vs Sistem Crontab

İki farklı yerde tanımlama yapabilirsiniz. Aralarındaki fark, **"Kullanıcı"** sütunudur.

### A. Kullanıcı Crontab (`crontab -e`)

Sadece o kullanıcının yetkisiyle çalışır. Komut satırında **kullanıcı adı yazılmaz**.

```bash
# Doğru (crontab -e)
0 1 * * * /script.sh
```

### B. Sistem Crontab (`/etc/crontab` veya `/etc/cron.d/*`)

Tüm sistem için geçerlidir. Hangi kullanıcı yetkisiyle çalışacağı **belirtilmelidir**.

```bash
# /etc/cron.d/yedekleme
# Dakika Saat Gun Ay Gun Kullanici Komut
0 1 * * * root /script.sh
```

> [!CAUTION]
> Prodüksiyon ortamlarında `/etc/cron.d/` içine her uygulama için ayrı dosya oluşturmak (Örn: `/etc/cron.d/app-backup`) daha düzenli ve yönetilebilir bir yöntemdir.

---

## 5. Çıktı Yönetimi ve Loglama (Önemli) 📝

Varsayılan olarak Cron, bir çıktı (output) üretirse bunu **mail** atmaya çalışır (çoğu sunucuda mail ayarlı olmadığı için bu mesajlar kaybolur).

### Yöntem 1: Sessize Alma (Silent)

Eğer çıktı önemli değilse (çöp kutusu):

```bash
* * * * * /komut.sh > /dev/null 2>&1
```

### Yöntem 2: Dosyaya Loglama (Önerilen)

Yaptığı işi ve hataları görmek için:

```bash
# >> ile dosyanın sonuna ekle (append)
* * * * * /komut.sh >> /var/log/ozel-is.log 2>&1
```

---

## 6. Sık Yapılan Hatalar (Tuzaklar) 🪤

Cron çalışmıyorsa %90 sebebi şunlardır:

### 1. Çevre Değişkenleri (PATH Sorunu)

Cron, sizin terminalinizdeki `PATH` değişkenlerini (örn. `.bashrc`) bilmez.
**Hata:** `node: command not found`
**Çözüm:** Komutların **tam yolunu** yazın.

- Yanlış: `python3 script.py`
- Doğru: `/usr/bin/python3 /home/user/script.py`

### 2. Yüzde İşareti (`%`)

Cron dosyasında `%` karakteri "yeni satır" anlamına gelir. Eğer komutunuzda `%` varsa (örn: `date +%F`), ters slash ile kaçmalısınız: `\%`.

### 3. Dosya İzinleri

Çalıştırıcak scripti executable yapmayı unutmayın:

```bash
chmod +x /home/user/script.sh
```

### 4. Yeni Satır (Newline)

Cron dosyasının (**özellikle `/etc/cron.d/` altındakilerin**) son satırı boş olmalıdır. Dosya bir komutla bitiyorsa ve enter'a basılmamışsa çalışmayabilir.

---

## 7. Cron Alternatifleri 🔄

Modern Linux sistemlerinde cron'a alternatif veya onu tamamlayan araçlar vardır. Her birinin farklı kullanım senaryoları vardır.

### A. Systemd Timers (Önerilen - Modern Yöntem)

Ubuntu 16.04'ten beri varsayılan olarak gelir. Cron'dan **daha güçlü** ve **daha esnek**tir.

**Avantajları:**

- ✅ Systemd ile entegre (servislerin durumuna göre tetikleme)
- ✅ Detaylı loglama (`journalctl` ile)
- ✅ Görevler arası bağımlılık yönetimi
- ✅ Esnek zamanlama ("boot'tan 15 dakika sonra" gibi)
- ✅ Persistent (kaçırılan görevleri telafi eder)

**Nasıl Kullanılır?**

İki dosya gerekir:

1. **Service dosyası** (`.service`) → Ne yapılacak?
2. **Timer dosyası** (`.timer`) → Ne zaman yapılacak?

**Örnek: Her 10 dakikada bir backup**

**1. Service dosyası oluştur:**

```bash
sudo nano /etc/systemd/system/mybackup.service
```

```ini
[Unit]
Description=My Backup Task

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=ubuntu
StandardOutput=journal
StandardError=journal
```

**2. Timer dosyası oluştur:**

```bash
sudo nano /etc/systemd/system/mybackup.timer
```

```ini
[Unit]
Description=Run backup every 10 minutes

[Timer]
OnBootSec=5min           # Boot'tan 5 dakika sonra ilk çalıştır
OnUnitActiveSec=10min    # Her 10 dakikada bir tekrarla
Persistent=true          # Kaçırılan görevleri telafi et

[Install]
WantedBy=timers.target
```

**3. Timer'ı aktif et:**

```bash
# Systemd'ye yeni dosyaları tanıt
sudo systemctl daemon-reload

# Timer'ı başlat ve enable et
sudo systemctl enable --now mybackup.timer

# Timer'ın durumunu kontrol et
systemctl status mybackup.timer

# Tüm timer'ları listele
systemctl list-timers --all
```

**Zamanlama Seçenekleri:**

| Direktif          | Açıklama               | Örnek                           |
| :---------------- | :--------------------- | :------------------------------ |
| `OnBootSec`       | Boot'tan X sonra       | `OnBootSec=5min`                |
| `OnUnitActiveSec` | Son çalışmadan X sonra | `OnUnitActiveSec=10min`         |
| `OnCalendar`      | Belirli zaman          | `OnCalendar=daily`              |
| `OnCalendar`      | Özel zaman             | `OnCalendar=*-*-* 02:00:00`     |
| `OnCalendar`      | Haftalık               | `OnCalendar=Mon *-*-* 09:00:00` |
| `OnCalendar`      | Aylık                  | `OnCalendar=*-*-01 03:00:00`    |

**Kullanışlı Komutlar:**

```bash
# Tüm timer'ları listele (--no-pager: scroll yapmadan tümünü göster)
systemctl list-timers --all --no-pager

# Bir timer'ı başlat/durdur
sudo systemctl start mybackup.timer
sudo systemctl stop mybackup.timer

# Service'i manuel çalıştır (test için)
sudo systemctl start mybackup.service

# Log'ları kontrol et
journalctl -u mybackup.service -n 50
journalctl -u mybackup.timer -f  # Canlı takip
```

**Docker Örneği:**

```ini
# /etc/systemd/system/docker-refresh.service
[Unit]
Description=Refresh Docker Container

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'docker stop myapp && docker rm myapp && docker run -d --name myapp nginx'

# /etc/systemd/system/docker-refresh.timer
[Unit]
Description=Refresh container every 30 minutes

[Timer]
OnCalendar=*:0/30  # Her 30 dakikada (saat başı ve yarımda)
Persistent=true

[Install]
WantedBy=timers.target
```

---

### B. anacron (Kapalı Bilgisayarlar İçin)

Ubuntu sistemlerinde varsayılan olarak gelir. **Sürekli açık olmayan** bilgisayarlar için tasarlanmıştır.

**Farkı:** Eğer bilgisayar kapalıyken bir görev çalışması gerekiyorsa, açıldığında o görevi çalıştırır. Cron ise o anı kaçırırsa görevi atlar.

**Kullanım:** Özellikle `/etc/cron.daily`, `/etc/cron.weekly`, `/etc/cron.monthly` klasörlerindeki scriptleri yönetir.

```bash
# anacron konfigürasyonu
cat /etc/anacrontab

# Örnek çıktı:
# period  delay  job-identifier  command
1         5      cron.daily      run-parts /etc/cron.daily
7         10     cron.weekly     run-parts /etc/cron.weekly
@monthly  15     cron.monthly    run-parts /etc/cron.monthly
```

**Örnek Kullanım:**

```bash
# /etc/cron.daily/ klasörüne script ekle
sudo nano /etc/cron.daily/my-backup

#!/bin/bash
tar -czf /backup/daily-$(date +%Y%m%d).tar.gz /var/www

# Çalıştırılabilir yap
sudo chmod +x /etc/cron.daily/my-backup
```

> [!TIP] > **Ne Zaman Kullanılır:** Laptop veya sürekli açık olmayan sunucular için idealdir. Desktop bilgisayarlarda günlük/haftalık bakım işleri için kullanılır.

---

### C. at (Tek Seferlik Görevler)

**Tek seferlik** görevler için kullanılır. Cron gibi tekrarlamaz, sadece **bir kez** çalışır.

**Kurulum:**

```bash
# at kurulu mu kontrol et
which at

# Kurulu değilse:
sudo apt update
sudo apt install at
sudo systemctl enable --now atd
```

**Kullanım Örnekleri:**

```bash
# 10 dakika sonra Docker container çalıştır
echo "docker run -d nginx" | at now + 10 minutes

# Yarın saat 14:00'te backup al
echo "tar -czf /backup/myapp-$(date +%Y%m%d).tar.gz /var/www/myapp" | at 14:00 tomorrow

# 2 saat sonra sistem bilgilerini dosyaya yaz
at now + 2 hours << EOF
df -h > /tmp/disk-report.txt
docker ps > /tmp/containers.txt
echo "Rapor hazır"
EOF

# Zamanlanmış görevleri listele
atq

# Bir görevi iptal et (örn: job 5)
atrm 5

# Bir görevin detaylarını gör
at -c 5
```

**Zaman Formatları:**

| Format             | Açıklama        |
| :----------------- | :-------------- |
| `now + 30 minutes` | 30 dakika sonra |
| `now + 2 hours`    | 2 saat sonra    |
| `now + 3 days`     | 3 gün sonra     |
| `14:30`            | Bugün 14:30     |
| `14:30 tomorrow`   | Yarın 14:30     |
| `14:30 2026-01-25` | Belirli tarih   |

**Pratik Örnek:**

```bash
# 1 saat sonra backup al ve çıktıyı logla
at now + 1 hour << 'END'
/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
END
```

---

## 8. Hangisini Kullanmalıyım? 🤔

| Araç               | Kullanım Senaryosu              | Örnek                                         |
| :----------------- | :------------------------------ | :-------------------------------------------- |
| **Cron**           | Basit, tekrarlayan görevler     | Her gece 03:00'te yedek al                    |
| **Systemd Timers** | Karmaşık, bağımlılıklı görevler | Veritabanı başladıktan 10 dakika sonra backup |
| **anacron**        | Sürekli açık olmayan sistemler  | Laptop'ta günlük bakım                        |
| **at**             | Tek seferlik görevler           | 2 saat sonra container yeniden başlat         |

**Önerimiz:**

- 🎯 **Yeni projeler için:** Systemd Timers (modern, güçlü)
- 🎯 **Basit işler için:** Cron (hızlı, kolay)
- 🎯 **Tek seferlik işler için:** at
- 🎯 **Laptop/Desktop için:** anacron
