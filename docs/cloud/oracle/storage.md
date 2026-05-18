# Oracle Block Volume: Ekstra Depolama

Block Volume, boot disk'ten bagimsiz veri alani icin kullanilir. Uygulama verisi, Docker data-root, database dosyalari ve log arşivi gibi kalici veri icin dogru model budur.

Temel prensip:

- Boot volume isletim sistemi icindir.
- Block volume veri icindir.
- Disk bozulursa veya instance yeniden kurulur ise veri katmani ayrik kalir.

## 1. Ne Zaman Block Volume Kullanilir?

Asagidaki senaryolarda ayrik block volume dusunulmelidir:

- Docker image / container data saklama
- PostgreSQL / MySQL / MariaDB data dosyalari
- Uygulama upload klasorleri
- Uzun omurlu log ve backup staging alanlari
- Tek bir boot volume'a sigmayan veri

Boot volume uzerine dogrudan veri koymak hizli baslatir ama operasyonu zorlastirir. Sunucu tekrar kuruldugunda veri tasimasi daha zahmetli olur.

## 2. Volume Olusturma

Panelden olustururken dikkat edilmesi gerekenler:

- Instance ile ayni `Availability Domain` icinde olmalı
- Gerekli kapasiteyi ilk gunden planlayin
- Tum veri icin tek volume veya ayrik volume stratejisi secin

CLI ile listeleme:

```bash
oci bv volume list --compartment-id "$C" --all
oci bv volume get --volume-id "$VOLUME_ID"
```

## 3. Attach Mantigi

Block volume, instance'a baglanir. Iki yaygin attach tipi vardir:

- `Paravirtualized`: Daha basit operasyon, cogu standart Linux kurulumunda yeterli
- `iSCSI`: Ayrik device mantigi, ek baglanti adimlari gerekir

Yeni baslayanlar icin operasyon basitligi nedeniyle paravirtualized genelde yeterlidir. iSCSI gerekiyorsa attachment sonrasinda sunucuda ek connect adimlari calistirilir.

### Attach listesini goruntuleme

```bash
oci compute volume-attachment list --compartment-id "$C" --instance-id "$INSTANCE_ID" --all
```

### Attach islemi

Console'dan attach edebileceginiz gibi CLI da kullanabilirsiniz. Komut tipi attachment tipine gore degisir. En pratik is akisi:

1. Volume'u olustur
2. Instance'a attach et
3. Linux tarafinda disk gorunuyor mu bak
4. Dosya sistemi olustur
5. UUID ile mount et

Paravirtualized attach ornegi:

```bash
oci compute volume-attachment attach-paravirtualized-volume \
  --instance-id "$INSTANCE_ID" \
  --volume-id "$VOLUME_ID"
```

iSCSI attach ornegi:

```bash
oci compute volume-attachment attach-iscsi-volume \
  --instance-id "$INSTANCE_ID" \
  --volume-id "$VOLUME_ID"
```

> [!NOTE]
> iSCSI kullanirsaniz attach sonrasi baglanti komutlarini da calistirmaniz gerekir. Bu komutlar attachment detayinda verilir. Paravirtualized model genelde daha az operasyonel adim ister.

## 4. Diski Goruntuleme ve Hazirlama

Attach tamamlandiktan sonra sunucu icinde disk gorunur:

```bash
lsblk
sudo blkid
```

Diskin adini tahmin etmeyin. `lsblk` ile gercek device adini bulun. OCI tarafinda isimler reboot veya yeniden attach sonrası degisebilir.

> [!WARNING]
> Asagidaki format islemi diskteki tum veriyi siler. Yalnizca yeni volume icin uygulayin.

### ext4 ile formatlama

```bash
sudo mkfs.ext4 -F /dev/sdb
```

### xfs ile formatlama

```bash
sudo mkfs.xfs -f /dev/sdb
```

## 5. Mount ve Kalici Hale Getirme

Mount noktasi olusturun:

```bash
sudo mkdir -p /mnt/data
```

UUID alin:

```bash
sudo blkid -s UUID -o value /dev/sdb
```

`/etc/fstab` icin UUID kullanin:

```ini
UUID=<UUID-BURAYA>  /mnt/data  ext4  defaults,noatime,_netdev,nofail  0  2
```

Parametrelerin anlami:

- `defaults`: standart mount secenekleri
- `noatime`: gereksiz yazma azalir
- `_netdev`: ag baglantisi hazir olmadan mount etme
- `nofail`: boot sirasinda volume yoksa sistemi kilitleme

Test:

```bash
sudo mount -a
df -hT | grep /mnt/data
```

Eger xfs kullandiysaniz fstab satirindaki dosya sistemi tipi `xfs` olmali.

## 6. Erişim ve Yetki

Varsayilan olarak mount edilen klasor root'a aittir. Uygulama kullanicisina yetki verin:

```bash
sudo chown -R deployer:deployer /mnt/data
sudo chmod 750 /mnt/data
```

Docker data-root veya servis kullanicisi icin ayrik grup modeli kuruyorsaniz sahibini o gruba verin.

## 7. Volume Buyutme / Extend

Block volume buyutme iki asamada olur:

1. OCI tarafinda volume kapasitesini artirirsiniz
2. Linux tarafinda filesystem'i buyutursunuz

### OCI tarafi

CLI ile:

```bash
oci bv volume update --volume-id "$VOLUME_ID" --size-in-gbs 100
```

Notlar:

- Sadece artirma yapilir.
- Kucultme yoktur.
- Degisiklikten sonra volume durumunu kontrol edin.

```bash
oci bv volume get --volume-id "$VOLUME_ID"
```

### Linux tarafi

Volume bir partition uzerinde degilse:

```bash
sudo resize2fs /dev/sdb
```

XFS kullanildiysa:

```bash
sudo xfs_growfs /mnt/data
```

Eger arada partition varsa once partition'u buyutmeniz gerekir, sonra filesystem'i genisletirsiniz. Bu durumda tipik akış:

```bash
sudo growpart /dev/sdb 1
sudo resize2fs /dev/sdb1
```

LVM kullaniliyorsa akış farklidir:

```bash
sudo pvresize /dev/sdb
sudo lvextend -r -l +100%FREE /dev/mapper/vg0-data
```

## 8. Backup ve Risk

Volume buyutmeden once backup dusunun. Ozellikle production verisi icin:

- snapshot
- application-level backup
- restore testi

Volume'un buyumesi veri guvenligi anlamina gelmez. Yanlis mount, yanlis fstab veya yanlis filesystem komutu veri kaybina yol acabilir.

## 9. Docker Verisini Ayrik Volume Uzerine Tasima

Docker kullanıyorsaniz `/var/lib/docker` gibi alanlari ayrik volume'a tasimak operasyonu kolaylastirir.

Tipik model:

```bash
sudo mkdir -p /mnt/docker
sudo chown -R root:root /mnt/docker
```

Docker daemon config icinde `data-root` tanimlanir ve sonrasinda servis yeniden baslatilir. Bu repo'daki Docker rehberi ile birlikte uygulayin.

## 10. Verify Matrix

Kurulumdan sonra su kontrolleri yapin:

```bash
lsblk
sudo blkid
df -hT
mount | grep /mnt/data
```

OCI tarafinda:

```bash
oci bv volume list --compartment-id "$C" --all
oci bv volume get --volume-id "$VOLUME_ID"
oci compute volume-attachment list --compartment-id "$C" --instance-id "$INSTANCE_ID" --all
```

Eger buyutme yaptinizsa:

```bash
df -hT | grep /mnt/data
```

Bu ciktida yeni kapasite gorunmelidir.
