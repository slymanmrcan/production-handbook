# Sistem Snapshot ve Geri Yükleme (Timeshift)

Sunucu yönetiminde en büyük güvence, bir şeyler ters gittiğinde "zamanda geriye yolculuk" yapabilmektir.

Linux dünyasında bu işin standart aracı **Timeshift**'tir. Windows'taki "System Restore" veya macOS'teki "Time Machine" gibi çalışır.

## 1. Timeshift Nedir?

Timeshift, sistem dosyalarının (kullanıcı verileri DEĞİL) anlık görüntüsünü alır.

- **Kapsam:** `/etc`, `/usr`, `/boot`, `/root` gibi sistem dizinleri.
- **Hariç:** `/home` (Kullanıcı dökümanları, web sitesi verileri).

> [!TIP]
> Veritabanı ve kullanıcı verileri için `backup-db.sh` scriptini kullanın. Timeshift sisteminizi kurtarır, verilerinizi değil.

## 2. Kurulum ve Mod Seçimi (RSYNC vs BTRFS)

Öncelikle dosya sisteminizi kontrol edin:

```bash
df -Th /
```

| Özellik        | RSYNC                       | BTRFS                            |
| :------------- | :-------------------------- | :------------------------------- |
| **Hız**        | Yavaş (dosya kopyalar)      | Çok hızlı (CoW - Copy on Write)  |
| **Alan**       | Fazla tüketir               | Minimal (Sadece değişen bloklar) |
| **Gereksinim** | Tüm dosya sistemleri (EXT4) | Sadece BTRFS                     |

### Kurulum (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install timeshift -y
```

### GRUB Entegrasyonu (Kritik!) 🛡️

Sistem hiç açılmazsa boot menüsünden snapshot dönmek için bu paketi mutlaka kurun:

```bash
sudo apt install timeshift-autosnap-apt -y
```

_Bu paket her `apt upgrade` öncesi otomatik snapshot alır._

## 3. Yapılandırma

İlk çalıştırmada yapılandırma sihirbazını kullanın:

```bash
sudo timeshift --setup
```

### Manuel Komutla Snapshot

```bash
# Snapshot al (Yorum eklemek önemlidir)
sudo timeshift --create --comments "Update Oncesi Guvenlik"
```

> [!CAUTION] > **Disk Alanı Uyarısı:** RSYNC modu her snapshot için GB'larca alan tüketebilir! Küçük disklerde (20-40GB) maksimum 2-3 snapshot tutun.

### Rotasyon Ayarı (Retention)

Eski snapshot'ların diski doldurmasını önlemek için `/etc/timeshift/timeshift.json` dosyasını düzenleyin:

```json
{
  "schedule_daily": "true",
  "count_daily": "3",
  "count_weekly": "2",
  "count_monthly": "1"
}
```

## 4. Geri Yükleme (Restore)

Sistemi eski bir tarihe döndürmek için:

```bash
# 1. Mevcut snapshotları listele
sudo timeshift --list

# 2. İnteraktif mod (Tarih seçimi menüsü)
sudo timeshift --restore

# 3. (Opsiyonel) Direkt belirli bir tarih
# sudo timeshift --restore --snapshot "2024-01-15_10-30-45"
```

> [!WARNING]
> Restore işlemi canlı çalışan sunucuda risklidir. Mümkünse Rescue Mode veya Live CD üzerinden yapılması daha sağlıklıdır. Ancak sistem açılıyorsa CLI üzerinden de denenebilir.

## 5. Hızlı Kontrol Listesi (Snapshot Öncesi)

Kritik bir işlem yapmadan önce:

- [ ] `df -h` → Yeterli disk alanı var mı?
- [ ] `sudo timeshift --list` → Gerekirse eski snapshot'ları (`--delete`) temizle.
- [ ] Veritabanı backup'ı alındı mı? (`backup-db.sh`)
- [ ] Cloud panel snapshot'ı alındı mı? (Kernel update ise)

## 6. Cloud Snapshots (En Güvenli Yöntem)

Eğer sanal sunucu (VPS/Cloud) kullanıyorsanız (AWS, Oracle, DigitalOcean), paneldeki **Snapshot** özelliği Timeshift'ten çok daha üstündür.

- **Tam İmaj:** Diskin bit-bit kopyasını alır.
- **Güvenilirlik:** %100 garantilidir. İşletim sistemi çökmüş olsa bile kurtarır.

**Öneri:** Kritik update (Kernel, Docker sürüm yükseltme) öncesi mutlaka Cloud Provider panelinden Snapshot alın.
