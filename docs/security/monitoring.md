# İzleme ve Anomali Tespiti (Monitoring) 📊

Sunucunuzda **Prometheus** veya **Grafana** gibi gelişmiş araçlar yoksa, basit Bash scriptleri ile CPU kullanımı veya Ağ trafiği anormalleştiğinde mail atmanızı sağlayabilirsiniz.

Özellikle "Gece 3'te CPU neden %100 oldu?" sorusunun cevabını yakalamak için hayati önem taşır.

> ⚠️ **İlk Kurulumda Test Edin!**
> Script'leri cron'a eklemeden önce manuel çalıştırıp mail/bildirim geldiğini doğrulayın: `sudo /usr/local/bin/cpu_alert.sh`

## 1. Ön Gereksinim: Mail Kurulumu 📬

Scriptlerin çalışması için sunucunun mail atabilmesi gerekir.

```bash
# Basit mail client kurulumu
sudo apt install mailutils -y

# Test et
echo "Test mail" | mail -s "Test" admin@example.com
```

_Not: Eğer sunucu mail atamıyorsa (Port 25 kapalıysa), aşağıda anlatılan **Telegram** yöntemini kullanın._

---

## 2. CPU Anomali Alarmı 🚨

Bu script, CPU kullanımı belirlediğiniz eşiği (örn: %80) geçerse size mail atar ve log tutar.

**Dosya:** `/usr/local/bin/cpu_alert.sh`

```bash
#!/bin/bash
# cpu_alert.sh - CPU Spike Monitor

THRESHOLD=80
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')
LOG_FILE="/var/log/cpu_alerts.log"
EMAIL="admin@example.com"

if [ "$CPU_USAGE" -gt "$THRESHOLD" ]; then
    TOP_PROCESS=$(ps aux --sort=-%cpu | head -6)
    MESSAGE="⚠️ CPU ALERT: Sunucu kullanımı %$CPU_USAGE seviyesinde!\n\nDetaylar:\n$TOP_PROCESS"
    echo -e "$MESSAGE" | mail -s "CPU Alert - $(hostname)" "$EMAIL"
    echo "$(date): CPU $CPU_USAGE%" >> "$LOG_FILE"
fi
```

**Kurulum:**

```bash
sudo chmod +x /usr/local/bin/cpu_alert.sh
echo "*/5 * * * * root /usr/local/bin/cpu_alert.sh" | sudo tee /etc/cron.d/cpu-alert
```

---

## 3. Network Anomali Alarmı (DDoS Tespiti) 🌐

`netstat` yerine modern ve hızlı **`ss`** komutunu kullanıyoruz.

**Dosya:** `/usr/local/bin/network_alert.sh`

```bash
#!/bin/bash
# network_alert.sh - Outbound Connection Monitor

# Eşik değer: 100 bağlantıdan fazlası şüpheli
THRESHOLD=100
LOG_FILE="/var/log/network_alerts.log"
EMAIL="admin@example.com"

# Loopback hariç aktif bağlantıları say (Hızlı yöntem)
CONNECTIONS=$(ss -tunap | grep ESTAB | grep -v '127.0.0.1' | wc -l)

if [ "$CONNECTIONS" -gt "$THRESHOLD" ]; then
    # Bağlantı detaylarını al
    DETAILS=$(ss -tunap | grep ESTAB | awk '{print $6}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10)

    echo "⚠️ NETWORK ALERT: $CONNECTIONS adet aktif bağlantı tespit edildi!" | \
    mail -s "Network Anomaly - $(hostname)" "$EMAIL"

    echo "$(date): $CONNECTIONS connections" >> "$LOG_FILE"
    echo "$DETAILS" >> "$LOG_FILE"
fi
```

**Kurulum:**

```bash
sudo chmod +x /usr/local/bin/network_alert.sh
echo "*/5 * * * * root /usr/local/bin/network_alert.sh" | sudo tee /etc/cron.d/network-alert
```

---

## 4. Disk ve Memory Alarmları 💾🧠

Disk dolarsa sunucu durur, RAM dolarsa `OOM Killer` servisleri öldürür.

**Dosya:** `/usr/local/bin/disk_alert.sh`

```bash
#!/bin/bash
THRESHOLD=85
USAGE=$(df / | tail -1 | awk '{print int($5)}')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    df -h | mail -s "⚠️ Disk Alert: %$USAGE dolu - $(hostname)" admin@example.com
fi
```

**Dosya:** `/usr/local/bin/memory_alert.sh`

```bash
#!/bin/bash
THRESHOLD=90
USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    free -h | mail -s "⚠️ Memory Alert: %$USAGE - $(hostname)" admin@example.com
fi
```

_(Bunları da cron'a eklemeyi unutmayın!)_

---

## 5. Alternatif: Telegram Bildirimi 📱

Mail ile uğraşmak istemiyorsanız Telegram Botu kullanın.

```bash
# Telegram fonksiyonu (Scriptlerinizde mail komutu yerine bunu kullanın)
send_telegram() {
    BOT_TOKEN="123456:ABC-xyz..."
    CHAT_ID="987654321"
    MESSAGE="$1"

    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        -d chat_id="$CHAT_ID" \
        -d text="$MESSAGE" \
        -d parse_mode="HTML" > /dev/null
}
```

---

## 6. Log Rotation (Logların Şişmesini Önleme) 🔄

Log dosyaları diski doldurmasın diye rotasyon ekleyelim.

**Dosya:** `/etc/logrotate.d/security-alerts`

```nginx
/var/log/cpu_alerts.log
/var/log/network_alerts.log
{
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

---

## 7. Hızlı Durum Kontrol Scripti (Security Status) 🚀

Tek komutla sunucunun genel sağlık ve güvenlik rontgeni.

**Dosya:** `/usr/local/bin/security_check.sh`

```bash
#!/bin/bash
# security_check.sh - Genel Bakış

echo "=== 🛡️  GÜVENLİK KONTROLÜ: $(date) ==="

echo -e "\n[1] Bekleyen Kritik Güncellemeler:"
apt list --upgradable 2>/dev/null | grep -i security || echo "Temiz."

echo -e "\n[2] Son Başarısız SSH Denemeleri:"
grep "Failed password" /var/log/auth.log | tail -5 || echo "Log bulunamadı."

echo -e "\n[3] Root Olarak Çalışan Docker Konteynerleri:"
if command -v docker &> /dev/null; then
    docker ps --quiet | xargs -I {} docker inspect {} --format '{{.Name}}: User={{.Config.User}}' | grep -E "User=$|User=root" || echo "Yok (Güvenli)."
else
    echo "Docker kurulu değil."
fi

echo -e "\n[4] Yüksek CPU Kullanan Süreçler:"
ps aux --sort=-%cpu | head -5

echo -e "\n[5] En Çok Bağlantı Kuran Dış IP'ler:"
ss -tunap | grep ESTAB | awk '{print $6}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -5

echo -e "\n[6] Disk Kullanımı:"
df -h | grep -E '^/dev/' | awk '$5 > 80 {print "⚠️ " $0}'

echo -e "\n[7] Zombie Process'ler:"
ps aux | awk '$8 ~ /Z/ {print $0}' || echo "Yok."

echo -e "\n[8] Kernel Bilgisi:"
uname -r

echo -e "\n=== KONTROL TAMAMLANDI ==="
```
