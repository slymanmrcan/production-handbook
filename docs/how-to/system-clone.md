# Sistem Klonlama ve Taşıma (Tar Backup)

Sunucunuzun tamamını tek bir sıkıştırılmış dosya (`.tar.gz`) olarak indirip, donanım özellikleri benzer (veya farklı) başka bir sunucuya taşımak için bu yöntemi kullanabilirsiniz.

Bu yöntem "Bare Metal Restore" veya "System Migration" olarak da adlandırılır.

## 1. Yedekleme (Backup)

Tüm dosya sistemini arşivleyeceğiz. Ancak `/proc`, `/sys`, `/tmp` gibi dinamik veya geçici dizinleri hariç tutmamız gerekir.

**Sunucuda root olarak çalıştırın:**

```bash
# 1. Root'a geç
sudo -i

# 2. Arşivi oluştur
# --exclude: Gereksiz dizinleri atla
# --one-file-system: Başka diskleri/bağlantıları dahil etme
# p: İzinleri koru (preserve permissions)
tar -cvpzf /tmp/server-full-backup.tar.gz \
    --exclude=/tmp/server-full-backup.tar.gz \
    --exclude=/proc \
    --exclude=/sys \
    --exclude=/dev \
    --exclude=/run \
    --exclude=/mnt \
    --exclude=/media \
    --exclude=/lost+found \
    --one-file-system \
    /
```

> [!WARNING]
> Bu işlem sunucu disk doluluğuna göre zaman alabilir. Çıktı dosyasının boyutunu `ls -lh /tmp/server-full-backup.tar.gz` ile kontrol edin.

## 2. İndirme (Download)

Oluşan dosyayı kendi bilgisayarınıza veya güvenli bir depolama alanına çekin.

**Kendi bilgisayarınızdan:**

```bash
scp root@sunucu-ip:/tmp/server-full-backup.tar.gz ./yedekler/
```

## 3. Geri Yükleme (Restore)

Bu yedeği yeni bir sunucuya yüklemek için, sunucuyu **Rescue Mode** veya **Live CD/USB** (Ubuntu/Debian installer) ile başlatmanız gerekir.

1.  Yeni diskleri mount edin (Örn: `/mnt/yeni-disk`).
2.  Arşivi açın:

```bash
# Arşivi yeni diske aç
sudo tar -xvpzf server-full-backup.tar.gz -C /mnt/yeni-disk --numeric-owner
```

## 4. Kritik Ayarlar (GRUB & Fstab) 🚨

Dosyaları kopyalamak yetmez. Yeni diskin **UUID**'si (kimliği) eski diskten farklıdır. Bu yüzden sistem açılmaz (boot etmez).

**Chroot (Sanal Kök) Ortamına Geçiş:**

```bash
# Gerekli sistem dizinlerini bağla
for i in /dev /dev/pts /proc /sys /run; do sudo mount -B $i /mnt/yeni-disk$i; done

# Sistemin içine gir
sudo chroot /mnt/yeni-disk
```

**İçeride Yapılacaklar:**

1.  **Fstab Güncelleme:** `/etc/fstab` dosyasındaki eski UUID'leri silip, yeni diskin UUID'sini yazın.
    - Yeni UUID'yi öğrenmek için: `blkid`
2.  **GRUB Yükleme:**
    ```bash
    update-grub
    grub-install /dev/sda  # (Diskiniz /dev/vda veya nvme0n1 de olabilir)
    ```
3.  **Çıkış:**
    ```bash
    exit
    reboot
    ```

Tebrikler! Sunucunuz klonlandı. 🎉
