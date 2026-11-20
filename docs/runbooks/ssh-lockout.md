# Acil Durum: SSH Erişimi Kesildi (Break Glass)

Sunucuya SSH ile erişemediğinizde uygulayacağınız kurtarma (recovery) protokolü.

:::caution[Yetkisiz erişim şüphesi]
SSH erişimi beklenmeyen bir değişiklikle kesildiyse önce [Şüpheli Sunucu ve Yetkisiz Erişim](suspected-compromise.md) rehberindeki kanıt koruma adımlarını kullanın.
:::

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
> Konsol girişi yerel kullanıcı kimlik doğrulamasını kullanır. Önceden doğrulanmış bir yönetim hesabıyla giriş yapın.

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

Çalışan sistemin konsolunda aşağıdaki kontrolleri uygulayın. Rescue chroot kullanıyorsanız disk üzerindeki yapılandırmayı düzeltip sözdizimini doğrulayın. Servis ve firewall durumunu normal açılış sonrasında sağlayıcı konsolundan kontrol edin.

### A. Firewall ve SSH Portunu Kontrol Etmek

```bash
sudo ufw status numbered
sudo ss -lntp
```

Engel firewall kuralından kaynaklanıyorsa [UFW erişim kurtarma adımlarını](../security/firewall.md) uygulayın. Bulut firewall kurallarında yönetim IP'nizin aynı porta erişimini doğrulayın.

### B. SSH Ayarlarını Düzeltmek

Son SSH değişikliğini güvenilir sürümle karşılaştırın. Etkin config ve drop-in dosyalarındaki sorunlu değişikliği geri alın. Anahtar veya izin sorunlarını [SSH Hardening](../security/ssh.md) adımlarıyla düzeltin. Yapılandırmayı çalışan sistemde yeniden yüklemeden önce doğrulayın.

```bash
sudo sshd -t && sudo systemctl reload ssh.service
```

Port değiştiyse önce `ssh.socket` kullanımını [SSH Hardening](../security/ssh.md) rehberine göre kontrol edin. Yeni terminalden anahtarla giriş yaparak kurtarma işlemini doğrulayın.

### C. Logları Kontrol Etmek

Neden giremediğinizi görmek için:

```bash
sudo journalctl --utc -u ssh.service --since '30 minutes ago' --no-pager
```

## Çıkış ve Reboot

İşlemler bitince normale dönün.

1.  `exit` (Chroot'tan çık)
2.  `umount /mnt` (Diski ayır)
3.  Panelden Rescue Mode'u kapat ve **Normal Reboot** at.
