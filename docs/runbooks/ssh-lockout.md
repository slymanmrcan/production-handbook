# Acil Durum: SSH Erişimi Kesildi (Break Glass)

Sunucuya SSH ile erişemediğinizde uygulayacağınız kurtarma (recovery) protokolü.

> [!WARNING]
> Bu adımlar sunucu sağlayıcınızın yönetim paneline erişim gerektirir.

## Semptomlar

- `Connection refused` (Servis kapalı veya port yanlış)
- `Permission denied (publickey)` (Anahtar yanlış veya silinmiş)
- `Operation timed out` (Firewall engelliyor)

## Yöntem 1: VNC / LISH Console (İnteraktif)

Çoğu sağlayıcı (AWS, DigitalOcean, Hetzner, Linode) web üzerinden doğrudan terminal erişimi sunar.

1.  Panelden sunucuyu seçin.
2.  **Console** veya **VNC** butonuna tıklayın.
3.  Web terminali açılacaktır. Burada ağ bağlantısı gerekmez, doğrudan klavye/ekran bağlı gibidir.
4.  **Kullanıcı Adı:** `root` (veya sudo yetkili kullanıcınız)
5.  **Parola:** Kurulumda belirlediğiniz root parolası.

> [!TIP]
> Root parolası kapalıysa (`PermitRootLogin no`), bu yöntem işe yaramayabilir. Eğer sudo kullanıcınızın parolasını biliyorsanız onunla girin.

## Yöntem 2: Rescue Mode (Kurtarma Modu)

Parolaları bilmiyorsanız veya disk bozulduysa bu yöntemi kullanın.

1.  Panelden sunucuyu **Power Off** yapın.
2.  **Rescue Mode** veya **Boot from ISO** seçeneğini bulun.
3.  Sunucuyu başlatın. Geçici bir işletim sistemi (RAM üzerinden) açılacaktır.
4.  Size geçici bir root parolası verilir, Rescue konsoluna bağlanın.

### Disk Bağlama (Mount)

Kendi sunucu diskinize erişmek için onu bağlamanız (mount) gerekir.

```bash
# Diskleri listele
lsblk
# Genellikle ana disk /dev/sda1 veya /dev/vda1 olur.

# Mount et
mount /dev/sda1 /mnt
```

### Chroot (İçeri Girme)

Artık `/mnt` klasörü sizin sunucunuzun kök dizini. Oraya geçiş yapın:

```bash
# Gerekli sistem klasörlerini bağla (Opsiyonel ama önerilir)
mount -t proc none /mnt/proc
mount -o bind /dev /mnt/dev

# Sisteme gir
chroot /mnt
```

Artık kendi sunucunuzun içindesiniz!

## Çözüm Adımları

İçeri girdikten sonra (Console veya Rescue Chroot):

### A. Firewall'u Kapatmak (Erişimi açmak için)

```bash
ufw disable
# veya
iptables -F
```

### B. SSH Ayarlarını Düzeltmek

Yanlış bir ayar yaptıysanız dosyayı düzenleyin:

```bash
nano /etc/ssh/sshd_config
# PermitRootLogin yes (Geçici olarak açın)
# PasswordAuthentication yes (Geçici olarak açın)
```

### C. Logları Kontrol Etmek

Neden giremediğinizi görmek için:

```bash
journalctl -u ssh -e
tail -f /var/log/auth.log
```

## Çıkış ve Reboot

İşlemler bitince normale dönün.

1.  `exit` (Chroot'tan çık)
2.  `umount /mnt` (Diski ayır)
3.  Panelden Rescue Mode'u kapat ve **Normal Reboot** at.
