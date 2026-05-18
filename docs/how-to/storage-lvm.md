# Disk, Filesystem ve LVM Yonetimi

Uygulama büyür, log artar, database sisar. Disk tarafini "sonra bakariz" diye birakirsaniz olay bir runbook'a doner.

Bu rehber:

- yeni disk ekleme,
- partition olusturma,
- LVM kurma,
- filesystem secimi,
- `fstab` ile kalici mount,
- volume genisletme

icin operasyonel bir temel sunar.

## 1. Mevcut Disk Topolojisini Cikar

```bash
lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS
df -hT
blkid
sudo pvs
sudo vgs
sudo lvs
```

Degisiklikten once disklerin hangi amaca hizmet ettigini not alin:

- root filesystem
- uygulama verisi
- log dizinleri
- backup dizini

## 2. Filesystem Secimi

| Filesystem | Ne Zaman? | Not |
| :--------- | :-------- | :-- |
| `ext4` | Genel amacli host'lar | En guvenli varsayilan secim. |
| `xfs` | Buyuk veri ve buyuk dosya yukleri | Kucultme desteklemez; buyutme tarafinda gucludur. |

Varsayilan öneri:

- Genel Linux host: `ext4`
- Buyuk log / veri hacmi: `xfs`

## 3. Yeni Diski LVM Ile Hazirla

Ornek:

- Yeni disk: `/dev/sdb`
- Volume Group: `vg_data`
- Logical Volume: `lv_app`
- Mount point: `/srv/app`

### Partition Olustur

```bash
sudo parted /dev/sdb --script mklabel gpt
sudo parted /dev/sdb --script mkpart primary 1MiB 100%
sudo partprobe /dev/sdb
lsblk /dev/sdb
```

### LVM Katmanlarini Olustur

```bash
sudo pvcreate /dev/sdb1
sudo vgcreate vg_data /dev/sdb1
sudo lvcreate -n lv_app -L 50G vg_data
```

### Filesystem Olustur

```bash
sudo mkfs.ext4 /dev/vg_data/lv_app
sudo mkdir -p /srv/app
```

### UUID ile `fstab` Girisi Ac

```bash
sudo blkid /dev/vg_data/lv_app
```

Ornek `fstab` satiri:

```fstab
UUID=<uuid> /srv/app ext4 defaults,noatime,nofail 0 2
```

Uygula:

```bash
echo 'UUID=<uuid> /srv/app ext4 defaults,noatime,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a
df -hT /srv/app
```

## 4. `fstab` Icin Guvenli Kurallar

- Mümkünse cihaz adi yerine `UUID` kullanin
- Uygulama verisi icin `defaults,noatime` genelde yeterlidir
- Kritik olmayan ek disklerde `nofail` kullanin
- `mount -a` basarisiz ise reboot etmeyin

Riskli mount flag'ler:

- `noexec`: script veya binary calismasi gerekmeyen dizinlerde
- `nodev`: device file gerekmeyen mount'larda
- `nosuid`: suid bit gerekmeyen mount'larda

Ornek: `/tmp` icin `nodev,nosuid,noexec` mantiklidir; database data dir icin genelde degildir.

## 5. Mevcut LVM Volume'u Buyut

Bos alan ayni VG icindeyse:

```bash
sudo vgs
sudo lvextend -L +20G -r /dev/vg_data/lv_app
```

`-r` parametresi filesystem'i de buyutur.

Kontrol:

```bash
sudo lvs
df -hT /srv/app
```

## 6. Kök Disk Genisletme

Cloud tarafinda disk buyutuldu ama OS görmüyorsa zincir genelde sudur:

1. Disk büyütüldü
2. Partition büyütüldü
3. PV büyütüldü
4. LV büyütüldü
5. Filesystem büyütüldü

Ornek akış:

```bash
lsblk
sudo growpart /dev/sda 3
sudo pvresize /dev/sda3
sudo lvextend -l +100%FREE -r /dev/vg_root/lv_var
```

> Not: `growpart` paketi icin `cloud-guest-utils` gerekebilir.

## 7. Disk ve Log Ayrimi

Ayni volume icinde her seyi tutmak yerine su ayrim daha sagliklidir:

- `/` -> OS
- `/var/lib/docker` -> container storage
- `/var/log` -> log hacmi
- `/srv/app` -> uygulama datasi
- `/var/backups` -> yedek staging alani

Buyuk sistemlerde log veya docker storage'u root filesystem'den ayirmak daha guvenlidir.

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Disk görünürlüğü | `lsblk -f` | Yeni disk / partition görünmeli. |
| PV durumu | `sudo pvs` | Yeni partition PV olarak görünmeli. |
| VG durumu | `sudo vgs` | Beklenen VG ve bos alan görünmeli. |
| LV durumu | `sudo lvs` | LV aktif ve dogru boyutta olmali. |
| Filesystem | `df -hT /srv/app` | Mount edilen filesystem ve boyut beklenen degerde olmali. |
| `fstab` dogrulama | `sudo mount -a` | Hata dönmemeli. |
| Boot kaliciligi | `findmnt /srv/app` | Mount reboot sonrasi da mevcut olmali. |

## 9. No-Go Durumlari

Su durumlarda degisikligi durdurun:

- Hedef diskin hangi sunucuya veya ortama ait oldugu net degilse
- `lsblk` ve `blkid` ciktilari ile cihaz kimligi dogrulanmadiysa
- `fstab` değişikligi sonrası `mount -a` hata veriyorsa
- Yeterli yedek alinmadiysa
