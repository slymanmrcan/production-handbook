# Yedekleme Stratejisi ve Otomasyonu

"Yedek yoksa, veri yoktur."

## 1. 3-2-1 Kuralı

Basit ama hayat kurtarır:

- **3** kopya veriniz olsun (1 canlı, 2 yedek).
- **2** farklı medya kullanın (Sunucu diski + Harici Depolama).
- **1** kopya mutlaka "Off-site" (Sunucu dışında) olsun.

## 2. Otomatik Yedekleme Scripti

Aşağıdaki script, belirlediğiniz klasörleri ve MySQL/Postgres veritabanını sıkıştırıp tarihli olarak `/backups` dizinine atar.

Bu script **[Script Kütüphanesi > Veritabanı Yedekleme](../scripts/library/backup.md)** altında detaylandırılmıştır.

```bash
# Scripti çalıştırma örneği
/root/scripts/backup-db.sh
```

## 3. Zamanlama (Cron)

Scripti her gece 03:00'da çalıştırmak için:

```bash
crontab -e
```

Eklenecek satır:

```cron
0 3 * * * /bin/bash /root/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

## 4. Off-Site Transfer (Rclone)

Yedekleri sunucuda tutmak yetmez. `rclone` kullanarak S3, Google Drive veya Dropbox'a atın.

Rclone kurulumu ve detaylı kullanımı script dosyasının içinde açıklanmıştır (bkz: [backup-db.sh](../scripts/library/backup.md#kaynak-kod)).

## 5. Restore Testi ve DR Drill

Backup job'inin "success" dönmesi yeterli değildir. Duzenli olarak staging ortamina restore tatbikati yapin.

- RPO/RTO hedeflerini belirleyin
- Son backup dosyasinin bütünlüğünü test edin
- Geri donus süresini ölçün
- Sonucu yazili olarak kaydedin

Devam rehberi:

- [Disaster Recovery Drill (RPO / RTO / Restore Test)](disaster-recovery-drill.md)
- [Database Restore Script](../scripts/library/restore.md)
