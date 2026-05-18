# 🍯 Cowrie Honeypot - Tam Rehber

Bu rehber, Cowrie Honeypot'unuzu kurduktan sonra nasıl yöneteceğinizi, izleyeceğinizi ve raporlayacağınızı anlatır.

Bu rehber, Cowrie Honeypot'unuzu kurduktan sonra nasıl yöneteceğinizi, izleyeceğinizi ve raporlayacağınızı anlatır.

---

## 📍 Dizin Yapısı (Önerilen)

Production ortamı için `/mnt/block/cowrie/` dizinini kullanıyoruz.

```text
/mnt/block/cowrie/
├── docker-compose.yml       # Container ayarları
├── etc/
│   └── cowrie.cfg           # Cowrie config
├── var/
│   ├── log/cowrie/
│   │   └── cowrie.json      # ANA LOG DOSYASI
│   └── lib/cowrie/
│       ├── downloads/       # İndirilen malware'ler
│       └── tty/             # Session kayıtları (playback)
├── passwords_collected.txt  # Toplanan şifreler
├── create_report.sh         # HTML Rapor scripti
├── daily_summary.sh         # Günlük Özet scripti
└── report.html              # HTML rapor çıktısı
```

---

## 1. Sistem Durumu ve Yönetim

### Container Kontrol

```bash
# Durum
docker ps | grep cowrie

# Detaylı durum
docker inspect cowrie | jq '.[0].State'

# Kaynak kullanımı (CPU, RAM)
docker stats cowrie --no-stream
```

### Başlat / Durdur / Yeniden Başlat

```bash
cd /mnt/block/cowrie

# Başlat
docker compose up -d

# Durdur
docker compose down

# Yeniden başlat
docker compose restart

# Loglarla birlikte başlat (debug için)
docker compose up
```

### Port Durumu

```bash
# Honeypot portları açık mı?
sudo lsof -i :22
sudo lsof -i :23

# Gerçek SSH (bizim erişimimiz)
sudo lsof -i :2222
```

| Port     | Servis          | Açıklama                  |
| :------- | :-------------- | :------------------------ |
| **22**   | SSH Honeypot    | Saldırganlar buraya düşer |
| **23**   | Telnet Honeypot | IoT botları buraya gelir  |
| **2222** | Gerçek SSH      | Bizim güvenli erişimimiz  |

---

## 2. Canlı İzleme Komutları

### 🔴 Canlı Tüm Olaylar

```bash
tail -f /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq .
```

### 🟢 Canlı - Sadece Önemli Olaylar (Önerilen)

```bash
tail -f /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r '
  if .eventid == "cowrie.login.success" then
    "🟢 GİRİŞ: \(.src_ip) → \(.username):\(.password)"
  elif .eventid == "cowrie.login.failed" then
    "🔴 BAŞARISIZ: \(.src_ip) → \(.username):\(.password // "KEY")"
  elif .eventid == "cowrie.command.input" then
    "⚡ KOMUT: \(.src_ip) → \(.input)"
  elif .eventid == "cowrie.session.file_download" then
    "📥 DOWNLOAD: \(.src_ip) → \(.url)"
  elif .eventid == "cowrie.session.closed" then
    "🚪 ÇIKIŞ: \(.src_ip) (\(.duration | tostring | split(".")[0])sn)"
  else
    empty
  end
'
```

### 📊 Watch ile Dashboard (Terminal)

Her 5 saniyede bir güncellenen canlı izleme ekranları:

**Son Saldırılar:**

```bash
watch -n 5 'echo "=== SON SALDIRILAR ===" && cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r "select(.eventid | test(\"login\")) | \"\(.timestamp | split(\"T\")[1] | split(\".\")[0]) \(.src_ip) \(.username):\(.password // \"KEY\")\"" | tail -10'
```

**Son Komutlar:**

```bash
watch -n 5 'echo "=== SON KOMUTLAR ===" && cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r "select(.eventid == \"cowrie.command.input\") | \"\(.timestamp | split(\"T\")[1] | split(\".\")[0]) | \(.src_ip) | \(.input)\"" | tail -15'
```

**Genel İstatistik:**

```bash
watch -n 10 'echo "=== HONEYPOT İSTATİSTİK ===" && \
echo "Toplam Bağlantı: $(cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r ".session" | sort -u | wc -l)" && \
echo "Benzersiz IP: $(cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r ".src_ip" | sort -u | wc -l)" && \
echo "Başarılı Giriş: $(cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r "select(.eventid==\"cowrie.login.success\")" | wc -l)" && \
echo "Çalıştırılan Komut: $(cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r "select(.eventid==\"cowrie.command.input\")" | wc -l)"'
```

---

## 3. Analiz Komutları

### IP Analizi

```bash
# Benzersiz saldırgan IP'leri
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r '.src_ip' | sort -u

# IP sayısı
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r '.src_ip' | sort -u | wc -l

# En aktif 20 IP
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r '.src_ip' | sort | uniq -c | sort -rn | head -20

# Belirli IP'nin tüm aktiviteleri
IP="27.47.3.64"
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r "select(.src_ip==\"$IP\")"
```

### Şifre Analizi

```bash
# En çok denenen 30 şifre
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.password != null) | .password' | sort | uniq -c | sort -rn | head -30

# En çok denenen kullanıcı adları
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.username != null) | .username' | sort | uniq -c | sort -rn | head -20

# Şifreleri dosyaya kaydet (Sözlük oluştur)
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.password != null) | .password' | sort -u >> /mnt/block/cowrie/passwords_collected.txt
```

### Komut Analizi

```bash
# En çok çalıştırılan komutlar
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.eventid == "cowrie.command.input") | .input' | sort | uniq -c | sort -rn | head -20

# Tehlikeli komutlar (wget, curl, chmod)
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.eventid == "cowrie.command.input") | select(.input | test("wget|curl|chmod|busybox")) | "\(.src_ip) | \(.input)"'
```

### Malware Analizi

```bash
# İndirme denemeleri (URL'ler)
cat /mnt/block/cowrie/var/log/cowrie/cowrie.json | jq -r 'select(.eventid | test("download")) | "\(.src_ip) | \(.url // .outfile)"'

# İndirilen dosyalar
ls -lah /mnt/block/cowrie/var/lib/cowrie/downloads/

# Dosya hash'leri (VirusTotal için)
sha256sum /mnt/block/cowrie/var/lib/cowrie/downloads/* 2>/dev/null
```

### Session (Oturum) Analizi

```bash
# TTY kayıtlarını listele
ls -la /mnt/block/cowrie/var/lib/cowrie/tty/

# TTY kaydını oynat (session izle)
# Dosya adını değiştir
docker exec cowrie python3 /cowrie/cowrie-git/bin/playlog /cowrie/cowrie-git/var/lib/cowrie/tty/DOSYA_ADI.log
```

---

## 4. Log Yönetimi ve Temizlik

Honeypot logları çok hızlı büyür. Düzenli temizlik şarttır.

### Log Boyutunu Kontrol

```bash
du -sh /mnt/block/cowrie/var/
```

### Otomatik Log Rotation (Cron)

Her gece 03:00'te logları yedekleyip temizleyen script.

1.  **Scripti oluştur:** `nano /mnt/block/cowrie/log_rotate.sh`

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/mnt/block/cowrie/backups"
LOG_FILE="/mnt/block/cowrie/var/log/cowrie/cowrie.json"

mkdir -p $BACKUP_DIR

# Yedekle ve sıkıştır
cp $LOG_FILE ${BACKUP_DIR}/cowrie_${DATE}.json
gzip ${BACKUP_DIR}/cowrie_${DATE}.json

# TTY (Oturum kayıtları) yedekle
tar -czf ${BACKUP_DIR}/tty_${DATE}.tar.gz /mnt/block/cowrie/var/lib/cowrie/tty/ 2>/dev/null

# Log dosyasını sıfırla
> $LOG_FILE

# Container'ı yeniden başlat (Temiz başlangıç)
cd /mnt/block/cowrie && docker compose restart

# 30 günden eski yedekleri sil
find $BACKUP_DIR -type f -mtime +30 -delete

echo "$(date): Log rotation tamamlandı" >> /mnt/block/cowrie/rotation.log
```

2.  **Çalıştırılabilir yap:** `chmod +x /mnt/block/cowrie/log_rotate.sh`
3.  **Cron'a ekle:** `crontab -e` -> `0 3 * * * /mnt/block/cowrie/log_rotate.sh`

---

## 5. Otomatik Raporlama

### A. Günlük Özet Script (Terminal)

Hızlıca "Bugün ne oldu?" görmek için.

1.  **Script:** `nano /mnt/block/cowrie/daily_summary.sh`

```bash
#!/bin/bash
LOG="/mnt/block/cowrie/var/log/cowrie/cowrie.json"

echo "╔════════════════════════════════════════════════╗"
echo "║       🍯 COWRIE GÜNLÜK RAPOR                   ║"
echo "╚════════════════════════════════════════════════╝"
echo "📅 Tarih: $(date)"
echo ""
echo "📊 GENEL İSTATİSTİKLER"
echo "─────────────────────────────────────────────────"
echo "   Toplam Bağlantı    : $(cat $LOG | jq -r '.session' | sort -u | wc -l)"
echo "   Benzersiz IP       : $(cat $LOG | jq -r '.src_ip' | sort -u | wc -l)"
echo "   Başarılı Giriş     : $(cat $LOG | jq 'select(.eventid=="cowrie.login.success")' | wc -l)"
echo "   Başarısız Giriş    : $(cat $LOG | jq 'select(.eventid=="cowrie.login.failed")' | wc -l)"
echo "   Çalıştırılan Komut : $(cat $LOG | jq 'select(.eventid=="cowrie.command.input")' | wc -l)"
echo ""
echo "🌍 EN AKTİF 5 SALDIRGAN"
echo "─────────────────────────────────────────────────"
cat $LOG | jq -r '.src_ip' | sort | uniq -c | sort -rn | head -5 | awk '{printf "   %-20s : %s deneme\n", $2, $1}'
echo ""
echo "🔑 EN ÇOK DENENEN 5 ŞİFRE"
echo "─────────────────────────────────────────────────"
cat $LOG | jq -r 'select(.password != null) | .password' | sort | uniq -c | sort -rn | head -5 | awk '{printf "   %-20s : %s kez\n", $2, $1}'
echo ""
echo "💻 SON 5 KOMUT"
echo "─────────────────────────────────────────────────"
cat $LOG | jq -r 'select(.eventid == "cowrie.command.input") | "   \(.src_ip): \(.input)"' | tail -5
echo ""
echo "📥 İNDİRİLEN MALWARE"
echo "─────────────────────────────────────────────────"
ls /mnt/block/cowrie/var/lib/cowrie/downloads/ 2>/dev/null | head -5 || echo "   Henüz yok"
echo ""
echo "═════════════════════════════════════════════════"
```

2.  **Çalıştırılabilir yap:** `chmod +x /mnt/block/cowrie/daily_summary.sh`

### B. HTML Dashboard Raporu (Görsel) ✨

Şık, karanlık modlu bir HTML raporu oluşturur.

1.  **Script:** `nano /mnt/block/cowrie/create_report.sh`

```bash
#!/bin/bash
LOG_FILE="/mnt/block/cowrie/var/log/cowrie/cowrie.json"
OUTPUT_FILE="/mnt/block/cowrie/report.html"

cat <<EOF > $OUTPUT_FILE
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="60">
    <title>🍯 Honeypot Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            padding: 20px;
            min-height: 100vh;
        }
        h1 {
            text-align: center;
            color: #00d9ff;
            margin-bottom: 10px;
            text-shadow: 0 0 20px rgba(0,217,255,0.5);
        }
        .timestamp { text-align: center; color: #888; margin-bottom: 30px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .card h2 {
            color: #00d9ff;
            margin-bottom: 15px;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .metric {
            font-size: 3em;
            font-weight: bold;
            color: #00ff88;
            text-shadow: 0 0 30px rgba(0,255,136,0.5);
        }
        .metric-row {
            display: flex;
            justify-content: space-around;
            text-align: center;
        }
        .metric-item { flex: 1; }
        .metric-label { color: #888; font-size: 0.9em; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th {
            background: rgba(0,217,255,0.2);
            color: #00d9ff;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        tr:hover { background: rgba(255,255,255,0.05); }
        .danger { color: #ff6b6b; }
        .success { color: #00ff88; }
        .command {
            font-family: 'Fira Code', 'Consolas', monospace;
            color: #ffd93d;
            font-size: 0.85em;
            word-break: break-all;
        }
        .ip { color: #74b9ff; }
        .count {
            background: rgba(0,217,255,0.2);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.85em;
        }
        .full-width { grid-column: 1 / -1; }
        pre {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85em;
        }
    </style>
</head>
<body>
    <h1>🍯 Honeypot İstihbarat Merkezi</h1>
    <p class="timestamp">Son Güncelleme: $(date '+%Y-%m-%d %H:%M:%S') | Sayfa 60 saniyede yenilenir</p>

    <div class="grid">
        <div class="card">
            <h2>📊 Genel Bakış</h2>
            <div class="metric-row">
                <div class="metric-item">
                    <div class="metric">$(cat $LOG_FILE | jq -r '.session' | sort -u | wc -l)</div>
                    <div class="metric-label">Toplam Bağlantı</div>
                </div>
                <div class="metric-item">
                    <div class="metric">$(cat $LOG_FILE | jq -r '.src_ip' | sort -u | wc -l)</div>
                    <div class="metric-label">Benzersiz IP</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🔐 Giriş İstatistikleri</h2>
            <div class="metric-row">
                <div class="metric-item">
                    <div class="metric success">$(cat $LOG_FILE | jq 'select(.eventid=="cowrie.login.success")' | wc -l)</div>
                    <div class="metric-label">Başarılı</div>
                </div>
                <div class="metric-item">
                    <div class="metric danger">$(cat $LOG_FILE | jq 'select(.eventid=="cowrie.login.failed")' | wc -l)</div>
                    <div class="metric-label">Başarısız</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🌍 En Aktif Saldırganlar</h2>
            <table>
                <tr><th>IP Adresi</th><th>Deneme</th></tr>
                $(cat $LOG_FILE | jq -r '.src_ip' | sort | uniq -c | sort -rn | head -10 | awk '{print "<tr><td class=\"ip\">"$2"</td><td><span class=\"count\">"$1"</span></td></tr>"}')
            </table>
        </div>

        <div class="card">
            <h2>🔑 En Çok Denenen Şifreler</h2>
            <table>
                <tr><th>Şifre</th><th>Deneme</th></tr>
                $(cat $LOG_FILE | jq -r 'select(.password != null) | .password' | sort | uniq -c | sort -rn | head -10 | awk '{print "<tr><td class=\"danger\">"$2"</td><td><span class=\"count\">"$1"</span></td></tr>"}')
            </table>
        </div>

        <div class="card">
            <h2>👤 En Çok Denenen Kullanıcılar</h2>
            <table>
                <tr><th>Kullanıcı</th><th>Deneme</th></tr>
                $(cat $LOG_FILE | jq -r 'select(.username != null) | .username' | sort | uniq -c | sort -rn | head -10 | awk '{print "<tr><td>"$2"</td><td><span class=\"count\">"$1"</span></td></tr>"}')
            </table>
        </div>

        <div class="card">
            <h2>💻 Son Çalıştırılan Komutlar</h2>
            <table>
                <tr><th>IP</th><th>Komut</th></tr>
                $(cat $LOG_FILE | jq -r 'select(.eventid == "cowrie.command.input") | "<tr><td class=\"ip\">\(.src_ip)</td><td class=\"command\">\(.input)</td></tr>"' | tail -10)
            </table>
        </div>

        <div class="card full-width">
            <h2>🦠 İndirilen Zararlı Yazılımlar</h2>
            <pre>$(ls -lh /mnt/block/cowrie/var/lib/cowrie/downloads/ 2>/dev/null | tail -n +2 | awk '{print $9 " (" $5 ")"}')</pre>
            $(if [ -z "$(ls /mnt/block/cowrie/var/lib/cowrie/downloads/ 2>/dev/null)" ]; then echo "<p style='color:#888;'>Henüz malware yakalanmadı</p>"; fi)
        </div>

        <div class="card full-width">
            <h2>⚡ Son 10 Olay (Canlı Akış)</h2>
            <table>
                <tr><th>Zaman</th><th>IP</th><th>Olay</th><th>Detay</th></tr>
                $(cat $LOG_FILE | jq -r '
                  if .eventid == "cowrie.login.success" then
                    "<tr><td>\(.timestamp | split("T")[1] | split(".")[0])</td><td class=\"ip\">\(.src_ip)</td><td class=\"success\">✓ Giriş</td><td>\(.username):\(.password)</td></tr>"
                  elif .eventid == "cowrie.login.failed" then
                    "<tr><td>\(.timestamp | split("T")[1] | split(".")[0])</td><td class=\"ip\">\(.src_ip)</td><td class=\"danger\">✗ Başarısız</td><td>\(.username):\(.password // "KEY")</td></tr>"
                  elif .eventid == "cowrie.command.input" then
                    "<tr><td>\(.timestamp | split("T")[1] | split(".")[0])</td><td class=\"ip\">\(.src_ip)</td><td>💻 Komut</td><td class=\"command\">\(.input)</td></tr>"
                  else
                    empty
                  end
                ' | tail -10)
            </table>
        </div>
    </div>

</body>
</html>
EOF

echo "✅ Rapor oluşturuldu: $OUTPUT_FILE"
```

2.  **Çalıştırılabilir yap:** `chmod +x /mnt/block/cowrie/create_report.sh`

### Raporu Web'de Yayınla (Nginx)

```bash
# Nginx zaten varsa, sembolik link oluşturun (root yetkisi gerekir)
sudo ln -sf /mnt/block/cowrie/report.html /var/www/html/honeypot.html

# Sonra tarayıcıdan girin
# http://SUNUCU_IP/honeypot.html
```

---

## 6. Sorun Giderme

**Container Başlamıyor**

```bash
docker logs cowrie --tail 100
```

**Permission Hatası**
Volume map edilen klasörlerin izinleri yanlışsa container yazamaz.

```bash
sudo chmod -R 777 /mnt/block/cowrie/var/
docker compose restart
```

**Log Dosyası Yok**

```bash
ls -la /mnt/block/cowrie/var/log/cowrie/
# Boşsa klasörleri elle oluşturun
mkdir -p /mnt/block/cowrie/var/log/cowrie
```
