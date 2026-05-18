# Script Çalıştırma Standartları

Script yazmak başlangıçtır. Production standardı, o scriptin nasıl tetiklendiği, nasıl gözlemlendiği ve hata anında nasıl davrandığı ile belirlenir.

## 1. Tercih Sırası

| Senaryo | Doğru Model | Kaçın |
| :------ | :---------- | :---- |
| Tek seferlik operasyon | `bash /usr/local/bin/script.sh` | `nohup` ile rastgele arka plana atmak |
| Zamanlanmış görev | `systemd timer` + `oneshot service` | Sadece cron'a güvenmek |
| Uzun yaşayan yardımcı süreç | `systemd service` | `while true; do ...; done` |
| Geliştirme testi | `systemd-run --pty --wait` | Prod unit'i bozmadan deneme yapmak |

Systemd destekli bir host'ta varsayılan seçim `systemd` olmalıdır. Cron, yalnızca legacy ortam veya çok basit görevler için geri planda kalmalıdır.

## 2. Cron Ne Zaman Kabul Edilir

Cron'u ancak şu koşullarda seç:

- hedef sistemde systemd yoksa
- iş çok basit ve dış bağımlılığı yoksa
- log, timeout ve retry davranışı ayrıca tanımlanmışsa

Cron kullanacaksan bile job'ı "sessiz" bırakma. Çıktıyı dosyaya veya merkezi log sistemine yönlendir, beklenen exit code'u izle ve başarısızlık alarmı üret.

## 3. Systemd Service + Timer Modeli

Önerilen yapı iki parçadır: bir `service` işi çalıştırır, bir `timer` bunu planlar.

```ini
[Unit]
Description=Database backup job
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=root
Group=root
ExecStart=/usr/local/bin/backup-db.sh
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
```

```ini
[Unit]
Description=Run database backup daily

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=300
AccuracySec=1m

[Install]
WantedBy=timers.target
```

Bu modelin avantajı şudur:

- tetikleme açıkça görünür
- kaçan job `Persistent=true` ile telafi edilir
- çıktılar journal'da kalır
- service tarafında hardening eklenebilir

## 4. Test ve Devreye Alma

Unit dosyası yazıldıktan sonra sırayla şunları yap:

```bash
sudo systemd-analyze verify backup.service backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
systemctl list-timers --all | rg backup
sudo systemctl start backup.service
journalctl -u backup.service -n 50 --no-pager
```

Bir job'ı canlıya almadan önce en az bir kez manuel tetikle ve log'u oku. Timer'ın listede görünmesi tek başına yeterli değildir.

## 5. Foreground ve Background Yönetimi

Arka plana atılmış shell job'ları, production'da en çok sorun çıkaran modeldir. Özellikle şu davranışlardan kaçın:

- `nohup script.sh &`
- terminal kapatıp işin yaşamasını beklemek
- PID takibi olmadan kendi kendine uzayan döngüler

Tercih edilen seçenekler:

- `systemd service`
- `systemd-run --unit ...`
- journal üzerinden log toplama

Örnek:

```bash
sudo systemd-run --unit=tmp-job --on-active=5m /usr/local/bin/health-check.sh
journalctl -u tmp-job -f
```

## 6. Loglama Davranışı

Shell çıktısını kaybetme. Journal, en temiz varsayılan hedeftir. Eğer dosyaya yazman gerekiyorsa logrotate ve retention da aynı anda düşünülmelidir.

Dosyaya yönlendirme gerekiyorsa örnek:

```bash
exec > >(tee -a /var/log/backup.log) 2>&1
```

Bu yaklaşımda dosya büyümesini ve yetki modelini ayrıca yönet.

## 7. Failure Politikası

Her script için şu noktalar net olmalı:

- timeout kaç saniye veya dakika?
- hangi exit code job failure sayılır?
- retry var mı, varsa kaç defa?
- aynı saat içinde ikinci tetikleme olursa ne olur?
- partial başarıyı nasıl bildirir?

Bu kararlar script içine yorum olarak değil, gerçek unit veya markdown standardı olarak yazılmalı.

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Timer görünür mü | `systemctl list-timers --all` | Job zamanlayıcı listede olmalı |
| Service çalışıyor mu | `systemctl status <unit>` | `active` ya da son run sonucu görünmeli |
| Config doğrulandı mı | `systemd-analyze verify <unit>` | Unit parse hatası olmamalı |
| Log erişimi var mı | `journalctl -u <unit> -n 50` | Son çalışma çıktıları okunmalı |
| Manuel tetikleme başarılı mı | `sudo systemctl start <unit>` | Tek seferlik run fail olmamalı |
