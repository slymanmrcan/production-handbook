# Kullanıcı Yönetimi

Sunucuda asla `root` kullanıcısı ile gündelik işlem yapmayın. Her yöneticinin kendi kullanıcı hesabı olmalıdır.

## 0. Yönetici Hesap Standardı (Day 0)

Kullanıcı yönetimi sadece "hesap açma" işi değildir. Production host'ta hangi hesap tiplerinin var olacağı baştan tanımlanmalıdır.

Önerilen model:

- **Root:** SSH kapalı, sadece break-glass veya console erişimi için
- **Named admin user:** Her insan operatör için ayrı hesap
- **Deploy / service user:** Otomasyon veya CI/CD için ayrı hesap
- **Restricted user:** Sudo'suz, sınırlı erişimli hesap

### Neden ortak root yerine named admin?

- Audit izi daha temiz olur
- `sudo` log'larında kimin ne yaptığı görünür
- Bir kişi ayrıldığında sadece onun hesabını kapatırsınız
- Ortak hesap anahtarı döndürme derdi azalır

### İsimlendirme önerisi

İnsan hesapları:

- `ali.ops`
- `ayse.sre`
- `mehmet.dev`

Servis veya deploy hesapları:

- `deployer`
- `backupbot`
- `ci-runner`

### Dedicated Admin User Oluşturma

```bash
sudo adduser aliops
sudo usermod -aG sudo aliops
sudo mkdir -p /home/aliops/.ssh
sudo chmod 700 /home/aliops/.ssh
sudo touch /home/aliops/.ssh/authorized_keys
sudo chmod 600 /home/aliops/.ssh/authorized_keys
sudo chown -R aliops:aliops /home/aliops/.ssh
```

Public key'i ekledikten sonra test edin:

```bash
ssh aliops@SUNUCU_IP
sudo whoami
sudo -l
```

Beklenen:

- SSH login çalışmalı
- `sudo whoami` -> `root`
- Kullanıcı root olmadan adminlik yapabiliyor olmalı

## 1. Kullanıcı İşlemleri (Lifecycle)

### Yeni Kullanıcı Ekleme

Sadece kullanıcı değil, home dizini ve varsayılan kabuğu ile birlikte oluşturur.

```bash
adduser yeni_kullanici
```

### Kullanıcı Silme

Kullanıcıyı ve dosyalarını silmek için:

```bash
deluser --remove-home eski_kullanici
```

Silmeden önce düşünülmesi gerekenler:

- Bu kullanıcı bir service account mu?
- Cron veya systemd unit bu kullanıcı ile mi çalışıyor?
- Home dizininde yedeklenmesi gereken veri var mı?

## 2. Yetkilendirme (Gruplar)

### Sudo (Yönetici) Yetkisi

Bir kullanıcıya `sudo` hakkı vermek için onu `sudo` grubuna ekleyin:

```bash
usermod -aG sudo yeni_kullanici
```

Her kullanıcıya sudo vermek doğru değildir. Sudo; insan operatör, on-call ve platform sorumluları ile sınırlı kalmalıdır.

### Docker Yetkisi

Her seferinde `sudo docker` yazmamak için:

```bash
usermod -aG docker yeni_kullanici
```

> Not: `docker` grubuna girmek pratikte root benzeri yetki verir. Bu gruba kullanıcı eklemek, sıradan bir "konfor ayarı" değildir.

## 3. Hesap Güvenliği

### Hesabı Kilitleme (Lock)

Bir personel ayrıldıysa veya şüpheli işlem varsa hesabı silmeden kilitleyebilirsiniz.

```bash
passwd -l hedef_kullanici
passwd -u hedef_kullanici
```

### Shell Erişimini Kapatma

SSH veya interactive shell istemediğiniz hesaplar için:

```bash
sudo usermod -s /usr/sbin/nologin hedef_kullanici
```

Bu yöntem service account'lar için çok değerlidir.

### Parola Değişimi Zorlama

```bash
chage -d 0 hedef_kullanici
```

### Sadece SSH Key

SSH hardening yaptıysanız (`PasswordAuthentication no`), kullanıcı için key tanımlayın:

```bash
su - yeni_kullanici
mkdir .ssh
chmod 700 .ssh
touch .ssh/authorized_keys
chmod 600 .ssh/authorized_keys
nano .ssh/authorized_keys
```

## 4. Kim Kimdir?

Sunucuda şu an kimlerin olduğunu veya geçmişte kimlerin girdiğini görmek için:

```bash
w
last
lastb
```

Ek faydalı kontroller:

```bash
getent passwd
getent group sudo
sudo journalctl _COMM=sudo --since today
```

## 5. Varsayılan Cloud Kullanıcılarını (opc/ubuntu) Kapatma 🛡️

Oracle Cloud (`opc`), AWS (`ubuntu/ec2-user`) gibi sağlayıcılar varsayılan kullanıcılar verir. Güvenlik için bu kullanıcıyı devre dışı bırakıp kendi standardınızı kullanmalısınız.

### Adım 1: Yeni Admin Oluşturun

Önce kendinize bir kullanıcı açın ve sudo verin.

### Adım 2: Test Edin

Yeni terminal açıp yeni kullanıcı ile giriş yapabildiğinizi ve `sudo` komutu çalıştırabildiğinizi doğrulayın. Test etmeden eski kullanıcıyı kapatmayın.

### Adım 3: SSH Erişimini Kısıtlayın (`AllowUsers`)

`/etc/ssh/sshd_config` içine:

```bash
AllowUsers yeni_kullanici baska_admin
```

Sonra:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

### Adım 4: Varsayılan Kullanıcıyı Kilitleyin

Silmek yerine kilitlemek genelde daha güvenlidir:

```bash
sudo usermod -L opc
sudo usermod -s /usr/sbin/nologin opc
```

Artık `opc` veya `ubuntu` ile giriş yapılamaz.

## 6. Kısıtlı Kullanıcı Oluşturma (Geliştirici) 👨‍💻

Bazen ekibe yeni katılan bir geliştiriciye erişim vermeniz gerekir ama yönetici yetkisi vermek istemezsiniz.

### Adım 1: Kullanıcıyı Oluşturun

```bash
sudo adduser mehmet
```

### Adım 2: SSH İzni Verin

`AllowUsers` kullanıyorsanız bu kullanıcıyı da listeye ekleyin:

```bash
AllowUsers admin_user mehmet
```

Uygula:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

### Adım 3: SSH Anahtarını Ekleyin

Kullanıcıya sadece public key verin; parola auth'a dönmeyin.

### Adım 4: Test

```bash
ssh mehmet@sunucu
sudo apt update
```

Beklenen:

```text
mehmet is not in the sudoers file.
```

Bu hatayı alıyorsanız işlem başarılıdır. Kullanıcı giriş yapabilir ama sistem yönetemez.

## Ek: Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Kullanıcı var mı | `getent passwd aliops` | Kullanıcı kaydı görünmeli |
| Sudo üyeliği | `id aliops` | `sudo` grubu görünmeli |
| Sudo policy | `sudo -l -U aliops` | Beklenen yetki görünmeli |
| SSH key izinleri | `namei -l /home/aliops/.ssh/authorized_keys` | Dizin ve dosya izinleri güvenli olmalı |
| Kilitli hesap durumu | `passwd -S hedef_kullanici` | Hesap durumu okunabilmeli |
| Son girişler | `last | head` | Beklenen kullanıcı hareketleri görünmeli |
