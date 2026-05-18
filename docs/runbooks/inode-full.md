# Inode Dolu

Bu runbook, inode tukendiginde uygulanir. Diskte bos alan olsa bile inode kalmadiysa yeni dosya, log ve temp file olusturulamaz.

## 1. Etki ve Belirtiler

- `No space left on device` gorunur ama `df -h` bos alan gosterebilir.
- Log rotate, package install, upload ve temp file isleri fail olur.
- Yeni klasor veya dosya yaratilamaz.
- Servisler gorunurde calisir ama yazma adiminda hata verir.

## 2. Immediate Containment

- Yeni dosya ureten job'lari durdur.
- Log patlamasi varsa ilgili servis veya batch job'u kes.
- Upload, cache veya export trafiklerini gecici olarak azalt.

```bash
systemctl stop <churn-service>
```

## 3. Likely Failure Modes

- Binlerce kucuk log dosyasi
- Cache, tmp, spool ve upload klasorlerinde dosya patlamasi
- Build artifact veya unpack edilen archive'lar
- Docker overlay ve image layer sayisi
- Deleted ama acik kalan dosyalar

## 4. Triage

Inode dolan mount'u bul:

```bash
df -iT
sudo du --inodes -xhd1 /var /tmp /home /opt 2>/dev/null | sort -h
sudo find /var/log -xdev -type f | wc -l
sudo lsof +L1
sudo journalctl --disk-usage
```

Bir dizinde anormal dosya sayisi varsa netlestir:

```bash
sudo find /var/log -xdev -type f -mtime -2 | head -n 20
sudo find /tmp -xdev -mindepth 1 -maxdepth 2 | head -n 50
```

Bakilacak sinyaller:

- Hangi mount'ta inode `%100`?
- Sorun tek bir uygulama klasorunde mi?
- Deleted-open file yüzünden inode serbest kalmiyor mu?

## 5. Safe Cleanup / Recovery

- Eski rotated loglari sil.
- Uygulama cache ve tmp dosyalarini temizle.
- Export, upload veya staging klasorlerinde biriken gecici dosyalari kaldir.
- Deleted-open file varsa ilgili process'i kontrollu restart et.

```bash
sudo find /var/log -xdev -type f -name '*.gz' -mtime +7 -delete
sudo find /var/tmp -xdev -mindepth 1 -type f -mtime +2 -delete
sudo systemctl restart <service>
```

- `truncate` inode bosaltmaz; sorun dosya sayisiyse gercekten dosya silmelisin.
- Uretim verisini tutan klasorlerde silme yapmadan once owner ile dogrula.

## 6. Escalation Criteria

- Cleanup sonrasi inode kullanimi hizla tekrar artiyorsa.
- Sorun data dizininde ve hangi dosyalarin silinecegi belli degilse.
- Birden fazla servis ayni anda yeni dosya yaratamiyorsa.
- Dosya sistemi read-only olduysa veya kernel hata veriyorsa.

Bu durumda uygulama sahibiyle birlikte file growth source'u bulun veya volume expansion planla.

## 7. Verification

```bash
df -iT
sudo du --inodes -xhd1 /var /tmp /home /opt 2>/dev/null | sort -h
systemctl status <service> --no-pager
```

Beklenen sonuclar:

- Inode kullanimi kritik esigin altina inmeli.
- Servis yeni dosya yazabiliyor olmali.
- Yeni `No space left on device` logu gelmemeli.

## 8. Ilgili Runbook

- Disk doluluk sorunu icin: [Disk Dolu Mudahalesi](disk-full.md)
- Servis yeniden ayağa alma icin: [Servis Kesintisi](service-down.md)
