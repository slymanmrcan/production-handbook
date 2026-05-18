# AWS EBS: Blok Depolama ve Disk Operasyonu

EBS, AWS üzerinde kalıcı blok disk katmanıdır. Küçük production server'da uygulama verisi, log, yedek staging alanı veya database için kullanılır.

## 1. Temel Kural

EBS volume:

- aynı AZ içinde olmalı
- instance'a attach edilmeli
- dosya sistemi oluşturulduktan sonra mount edilmelidir
- root volume ile data volume aynı şey değildir

## 2. Volume Tipi Seçimi

Küçük prod için varsayılan tercih:

- `gp3`

Neden:

- gp2'ye göre daha esnek
- boyuttan bağımsız performans ayarı yapılabilir
- çoğu Linux sunucu için yeterli

## 3. Volume Oluşturma ve Attach

### Console Akışı

1. EC2 -> Elastic Block Store -> Volumes
2. Create Volume
3. Aynı AZ seç
4. `gp3` seç
5. İlgili instance'a attach et

### CLI ile Kontrol

```bash
aws ec2 describe-volumes --output table
aws ec2 describe-volumes --filters Name=status,Values=in-use --output table
```

## 4. Instance İçinde Diski Tanıma

Nitro tabanlı instance'larda disk isimleri genelde `nvme` olur.

```bash
lsblk
sudo blkid
```

Örnek cihazlar:

- `/dev/nvme1n1`
- `/dev/nvme1n1p1`
- `/dev/xvdf`

## 5. İlk Kurulum

Sadece boş disk için:

```bash
sudo mkfs.ext4 /dev/nvme1n1
sudo mkdir -p /data
```

UUID ile mount edin:

```bash
sudo blkid /dev/nvme1n1
sudo nano /etc/fstab
```

Örnek satır:

```fstab
UUID=<uuid> /data ext4 defaults,noatime,nofail 0 2
```

Uygula:

```bash
sudo mount -a
df -hT /data
findmnt /data
```

## 6. `DeleteOnTermination`

Bu ayar kritik:

- Root volume için bazen uygundur
- Data volume için çoğu zaman yanlış seçimdir

Prod data için düşünmeniz gereken soru:

- Instance terminate olursa bu disk de silinsin mi?

Çoğu durumda cevap `hayır`dır.

## 7. Volume Resize

EBS volume boyutunu AWS tarafında büyüttükten sonra Linux içinde de filesystem'i büyütmeniz gerekir.

### 1. Disk Boyutunu AWS'de Artır

`modify-volume` veya console ile hacmi büyütün.

Kontrol:

```bash
aws ec2 describe-volumes --volume-ids <vol-id> --output table
```

### 2. Partition Büyüt

```bash
sudo growpart /dev/nvme0n1 1
```

### 3. Filesystem Büyüt

ext4 için:

```bash
sudo resize2fs /dev/nvme0n1p1
```

xfs için:

```bash
sudo xfs_growfs /data
```

### Verify

```bash
lsblk
df -hT /data
```

## 8. Snapshot

Snapshot, EBS volume'un noktasal yedeğidir. Backup stratejisinin temel parçasıdır.

### Snapshot Oluşturma

```bash
aws ec2 create-snapshot --volume-id <vol-id> --description "prod-data-snapshot"
```

### Snapshot Listeleme

```bash
aws ec2 describe-snapshots --owner-ids self --output table
```

### Geri Dönüş

Snapshot'tan yeni volume oluşturun, sonra attach edin.

## 9. App-Consistent ve Crash-Consistent Farkı

Snapshot tek başına her zaman uygulama tutarlılığı sağlamaz.

- Crash-consistent: disk o anda ne haldeyse onu alır
- App-consistent: uygulama flush/freeze sonrası alınır

Database için mümkünse:

- önce backup script
- sonra snapshot
- gerekiyorsa `fsfreeze`

## 10. Küçük Prod İçin Önerilen Disk Modeli

| Kullanım | Öneri |
| :------- | :---- |
| OS | Root volume, gp3 |
| Uygulama verisi | Ayrı EBS volume |
| Loglar | Gerekirse ayrı volume |
| Backup staging | Ayrı küçük volume veya path |

## 11. Sık Hatalar

- Volume'u farklı AZ'de oluşturmaya çalışmak
- `mkfs` komutunu yanlış diske çalıştırmak
- `fstab`'de UUID yerine değişebilen device name kullanmak
- Resize sonrası filesystem büyütmeyi unutmak
- Snapshot'ı backup sanmak ama restore test yapmamak

## 12. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Volume listesi | `aws ec2 describe-volumes --output table` | Volume görünmeli |
| Attach durumu | `aws ec2 describe-volumes --filters Name=status,Values=in-use --output table` | Attached volume görünmeli |
| Disk görünürlüğü | `lsblk` | Yeni disk görünmeli |
| UUID | `sudo blkid` | Mount için UUID görünmeli |
| Mount | `sudo mount -a` | Hata olmamalı |
| Filesystem | `df -hT /data` | Boyut doğru görünmeli |
| Snapshot | `aws ec2 describe-snapshots --owner-ids self --output table` | Snapshot görünmeli |

## 13. Sonraki Adımlar

- [AWS Concepts](concepts.md)
- [AWS EC2](ec2.md)
- [AWS Networking](networking.md)
- [AWS CLI](cli.md)
