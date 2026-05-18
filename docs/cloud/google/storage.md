# Google Persistent Disk

Google Cloud'da Linux sunucu storage tarafının omurgası Persistent Disk'tir. Disk instance'tan bağımsız olarak yönetilebilir, büyütülebilir ve snapshot alınabilir.

## 1. Disk Türleri

Genel kullanım için:

- boot disk
- data disk
- backup staging disk

Disk tipi seçimi iş yüküne göre yapılır:

- standart disk
- balanced disk
- SSD persistent disk

## 2. Disk Oluşturma

```bash
gcloud compute disks create app-data-disk \
  --size 100GB \
  --zone europe-west1-b \
  --type pd-balanced
```

## 3. Disk Attach Etme

```bash
gcloud compute instances attach-disk app-01 \
  --zone europe-west1-b \
  --disk app-data-disk \
  --device-name app-data-disk
```

Instance içinde disk görünürlüğünü kontrol edin:

```bash
lsblk
sudo blkid
ls -l /dev/disk/by-id/google-app-data-disk
```

## 4. Filesystem Oluşturma ve Mount

Disk yeni ise üzerine filesystem kurabilirsiniz:

```bash
sudo mkfs.ext4 /dev/disk/by-id/google-app-data-disk
sudo mkdir -p /srv/app
sudo mount /dev/disk/by-id/google-app-data-disk /srv/app
df -hT /srv/app
```

Kalıcı mount için `fstab` kullanın:

```bash
sudo blkid /dev/disk/by-id/google-app-data-disk
sudo nano /etc/fstab
```

Örnek satır:

```fstab
UUID=<uuid> /srv/app ext4 defaults,noatime,nofail 0 2
```

Sonra:

```bash
sudo mount -a
```

## 5. Disk Resize

Google Persistent Disk büyütmek için önce disk boyutunu artırın:

```bash
gcloud compute disks resize app-data-disk \
  --size 200GB \
  --zone europe-west1-b
```

Host içinde filesystem'i büyütün:

```bash
sudo resize2fs /dev/disk/by-id/google-app-data-disk
df -hT /srv/app
```

`xfs` kullanıyorsanız `xfs_growfs` gerekir.

## 6. Snapshot

Snapshot, geri dönüş için en pratik yöntemlerden biridir.

```bash
gcloud compute disks snapshot app-data-disk \
  --zone europe-west1-b \
  --snapshot-names app-data-disk-20260328
```

Snapshot'tan yeni disk oluşturma:

```bash
gcloud compute disks create app-data-disk-restore \
  --source-snapshot app-data-disk-20260328 \
  --zone europe-west1-b
```

## 7. Operational Notes

- Boot disk ile data disk'i ayırmak daha güvenlidir
- Snapshot almadan destructive işlem yapmayın
- Disk resize sonrası filesystem büyütmeyi unutmayın
- `fstab` değişikliği sonrası reboot etmeyin; önce `mount -a` test edin

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Disk listesi | `gcloud compute disks list` | Disk görünmeli |
| Attach durumu | `lsblk` | Disk host içinde görünmeli |
| Mount durumu | `df -hT /srv/app` | Doğru mount görünmeli |
| Resize sonrası | `sudo resize2fs /dev/disk/by-id/google-app-data-disk` | Hata vermemeli |
| Snapshot listesi | `gcloud compute snapshots list` | Snapshot görünmeli |
| Geri dönüş disk'i | `gcloud compute disks create ... --source-snapshot ...` | Restore disk oluşturulmalı |
