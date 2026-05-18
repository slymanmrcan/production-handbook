# Disk ve Kaynak Yönetimi

Disk, inode, RAM ve CPU dar boğazlarında ilk bakılacak komutlar.

## Hızlı Triyaj

Önce sorunun disk mi, inode mu, bellek mi, yük mü olduğunu ayır.

```bash
df -hT
df -ih
lsblk -f
findmnt
free -h
uptime
```

- `df -hT` doluluk ve dosya sistemi tipini birlikte gösterir.
- `df -ih` inode tıkanıklığını yakalar; disk boş görünse bile sistem yazamaz.
- `lsblk -f` ve `findmnt` mount zincirini doğrular.

## Disk Analizi

Hangi dizin şişti?

```bash
du -xhd1 /var
du -xhd1 /var/log
du -xah /var | sort -rh | head -n 20
du -sh /var/lib/docker/* 2>/dev/null
```

- `-x` ile başka mount'lara sıçrama, yanlış hacmi sayma.
- `du -xah` ile büyük dosyaları da gör; sadece klasör yeterli olmayabilir.
- Docker kullanıyorsan `/var/lib/docker` çoğu zaman ilk şüphelidir.

## Açık Ama Silinmiş Dosyalar

Disk dolu görünüp dosya bulunamıyorsa bunu kontrol et.

```bash
lsof +L1
journalctl --disk-usage
```

- `lsof +L1` silinmiş ama proses tarafından açık tutulan dosyaları gösterir.
- `journalctl --disk-usage` logların ne kadar yer kapladığını hızlıca söyler.

## Bellek ve CPU

Yük, swap ve anlık süreç baskısını incele.

```bash
free -h
vmstat 1
top
htop
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
```

- `available` sütunu, `free`'den daha değerlidir.
- `vmstat 1` ile CPU wait, swap ve run queue eğilimini gör.
- `htop` yoksa `top` yeterli; önemli olan anlık tabloyu okumaktır.

## I/O ve Donanım

Disk gecikmesi veya hata şüphesinde kullan.

```bash
iostat -xz 1
dmesg -T | grep -iE 'error|ext4|xfs|nvme|io'
mount | column -t
```

- `iostat` çoğu sistemde `sysstat` paketi ile gelir.
- `dmesg` I/O error, reset ve filesystem uyarılarını gösterir.
- `mount` ile read-only olmuş veya yanlış bağlanmış filesystem'i doğrula.

## Doğrulama

Temizlik, genişletme veya mount değişikliği sonrası:

```bash
df -hT
df -ih
findmnt
lsblk -f
```

## Yüksek Riskli Komutlar

Bu komutları sadece ne yaptığını biliyorsan çalıştır.

```bash
mkfs.ext4 /dev/sdX
wipefs -a /dev/sdX
fdisk /dev/sdX
parted /dev/sdX
lvextend -r -L +10G /dev/vg/data
resize2fs /dev/vg/data
xfs_growfs /mount/point
umount /mount/point
```

- `mkfs`, `wipefs`, `fdisk` ve `parted` veri kaybettirebilir.
- `lvextend` ile `resize2fs`/`xfs_growfs` uyumlu ilerlemeli.
- `umount` üretimde açık dosya varken servisleri bozabilir.
