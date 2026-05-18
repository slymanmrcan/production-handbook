# Dosya İzinleri (chmod, chown, umask) 🔐

Linux'ta dosya ve dizin izinleri, sistemin güvenliğinin temelidir. Bu rehber, izinleri nasıl okuyacağınızı, değiştireceğinizi ve yöneteceğinizi anlatır.

---

## 🔍 İzin Yapısı {#izin-yapisi}

### İzin Gösterimi

```bash
ls -l dosya.txt
-rw-r--r-- 1 user group 1234 Jan 22 10:00 dosya.txt
│││││││││  │ │    │     │    │            │
│││││││││  │ │    │     │    │            └─ Dosya adı
│││││││││  │ │    │     │    └─ Tarih
│││││││││  │ │    │     └─ Boyut
│││││││││  │ │    └─ Grup
│││││││││  │ └─ Sahip (owner)
│││││││││  └─ Link sayısı
││││││││└─ Diğer kullanıcılar (others): r-- (okuma)
│││││└─ Grup (group): r-- (okuma)
││└─ Sahip (owner): rw- (okuma + yazma)
└─ Dosya tipi: - (normal dosya)
```

### Dosya Tipleri

| Sembol | Tip               |
| :----- | :---------------- |
| `-`    | Normal dosya      |
| `d`    | Dizin (directory) |
| `l`    | Sembolik link     |
| `c`    | Karakter cihazı   |
| `b`    | Blok cihazı       |
| `s`    | Socket            |
| `p`    | Named pipe        |

### İzin Tipleri

| Sembol | İzin                 | Sayısal | Dosya                 | Dizin                     |
| :----- | :------------------- | :------ | :-------------------- | :------------------------ |
| `r`    | Read (Okuma)         | 4       | Dosya içeriğini okuma | Dizin içeriğini listeleme |
| `w`    | Write (Yazma)        | 2       | Dosyayı değiştirme    | Dosya oluşturma/silme     |
| `x`    | Execute (Çalıştırma) | 1       | Dosyayı çalıştırma    | Dizine girme (cd)         |
| `-`    | İzin yok             | 0       | -                     | -                         |

---

## 👁️ İzinleri Görüntüleme {#izinleri-goruntuleme}

```bash
# Dosya izinlerini göster
ls -l dosya.txt

# Dizin izinlerini göster (dizinin kendisi)
ls -ld /var/www

# Tüm dosyaları göster (gizli dahil)
ls -la

# İnsan okunabilir boyutlarla
ls -lh

# Sayısal izinlerle göster
stat -c "%a %n" dosya.txt
# Çıktı: 644 dosya.txt
```

---

## 🔧 chmod - İzin Değiştirme {#chmod}

### Sayısal Yöntem (Octal)

```bash
# Sayısal izin hesaplama:
# r (4) + w (2) + x (1) = 7 (tüm izinler)
# r (4) + w (2) = 6 (okuma + yazma)
# r (4) + x (1) = 5 (okuma + çalıştırma)
# r (4) = 4 (sadece okuma)

# Örnek: 755
# 7 (rwx) = Sahip: okuma + yazma + çalıştırma
# 5 (r-x) = Grup: okuma + çalıştırma
# 5 (r-x) = Diğerleri: okuma + çalıştırma

chmod 755 script.sh
chmod 644 config.txt
chmod 600 secret.key
chmod 700 private_dir
```

### Sembolik Yöntem

```bash
# Kullanıcı tipleri:
# u = user (sahip)
# g = group (grup)
# o = others (diğerleri)
# a = all (hepsi)

# İşlemler:
# + = izin ekle
# - = izin kaldır
# = = izinleri ayarla (diğerlerini sıfırla)

# Örnekler:
chmod u+x script.sh          # Sahibe çalıştırma izni ekle
chmod g-w file.txt           # Gruptan yazma iznini kaldır
chmod o-r secret.txt         # Diğerlerinden okuma iznini kaldır
chmod a+r public.txt         # Herkese okuma izni ekle
chmod u=rwx,g=rx,o=r file   # İzinleri ayarla (755)
chmod +x script.sh           # Herkese çalıştırma ekle
```

### Recursive (Alt Dizinler Dahil)

```bash
# Tüm dosya ve dizinlere uygula
chmod -R 755 /var/www

# Sadece dizinlere 755
find /var/www -type d -exec chmod 755 {} \;

# Sadece dosyalara 644
find /var/www -type f -exec chmod 644 {} \;
```

### Yaygın İzin Kombinasyonları

| İzin        | Sayısal | Kullanım                                |
| :---------- | :------ | :-------------------------------------- |
| `rwx------` | 700     | Özel dizinler (sadece sahip erişebilir) |
| `rwxr-xr-x` | 755     | Çalıştırılabilir dosyalar, dizinler     |
| `rw-r--r--` | 644     | Normal dosyalar (config, text)          |
| `rw-------` | 600     | Hassas dosyalar (SSH key, şifreler)     |
| `rw-rw-r--` | 664     | Grup ile paylaşılan dosyalar            |
| `rwxrwxrwx` | 777     | **ASLA KULLANMA!** (Güvenlik riski)     |

---

## 👤 chown - Sahiplik Değiştirme {#chown}

### Temel Kullanım

```bash
# Sadece sahip değiştir
chown user dosya.txt

# Sahip ve grup değiştir
chown user:group dosya.txt

# Sadece grup değiştir
chown :group dosya.txt
# veya
chgrp group dosya.txt

# Recursive (alt dizinler dahil)
chown -R user:group /var/www
```

### Pratik Örnekler

```bash
# Web dizinini www-data kullanıcısına ver
sudo chown -R www-data:www-data /var/www/html

# Docker volume'u kullanıcıya ver
sudo chown -R $USER:$USER ~/docker-data

# Kullanıcı home dizinini düzelt
sudo chown -R username:username /home/username

# Mevcut kullanıcıya ver
chown $USER:$USER dosya.txt
```

### Sahipliği Görüntüleme

```bash
# Dosya sahibini göster
ls -l dosya.txt

# Sayısal UID/GID ile göster
ls -n dosya.txt

# Sadece sahip ve grup
stat -c "%U %G" dosya.txt
```

---

## 🎭 umask - Varsayılan İzinler {#umask}

`umask`, yeni oluşturulan dosya ve dizinlerin **varsayılan izinlerini** belirler.

### umask Nasıl Çalışır?

```text
Varsayılan izinler:
- Dosyalar: 666 (rw-rw-rw-)
- Dizinler: 777 (rwxrwxrwx)

umask bu izinlerden ÇIKARILır:

umask 022:
- Dosya: 666 - 022 = 644 (rw-r--r--)
- Dizin: 777 - 022 = 755 (rwxr-xr-x)

umask 077:
- Dosya: 666 - 077 = 600 (rw-------)
- Dizin: 777 - 077 = 700 (rwx------)
```

### umask Kullanımı

```bash
# Mevcut umask'ı göster
umask
# Çıktı: 0022

# Sembolik gösterim
umask -S
# Çıktı: u=rwx,g=rx,o=rx

# umask değiştir (geçici)
umask 077

# Kalıcı yapmak için ~/.bashrc'ye ekle
echo "umask 077" >> ~/.bashrc
```

### Önerilen umask Değerleri

| umask | Dosya | Dizin | Kullanım                        |
| :---- | :---- | :---- | :------------------------------ |
| `022` | 644   | 755   | Varsayılan (Ubuntu/Debian)      |
| `027` | 640   | 750   | Orta güvenlik                   |
| `077` | 600   | 700   | Yüksek güvenlik (özel dosyalar) |
| `002` | 664   | 775   | Grup paylaşımı                  |

---

## 🔒 Özel İzinler (SUID, SGID, Sticky Bit) {#ozel-izinler}

### SUID (Set User ID) - 4000

Dosya, **sahibinin** yetkisiyle çalışır (kullanıcının değil).

```bash
# SUID ekle
chmod u+s /usr/bin/passwd
chmod 4755 /usr/bin/passwd

# Görünüm: -rwsr-xr-x (s harfi)

# Örnek: passwd komutu
ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 68208 /usr/bin/passwd
# Normal kullanıcı çalıştırsa da root yetkisiyle çalışır
```

> [!WARNING] > **Güvenlik Riski:** SUID dosyaları dikkatli kullanılmalı. Yanlış kullanımda privilege escalation riski vardır.

### SGID (Set Group ID) - 2000

**Dosya:** Grubun yetkisiyle çalışır.
**Dizin:** İçinde oluşturulan dosyalar dizinin grubunu alır.

```bash
# SGID ekle
chmod g+s /shared/project
chmod 2775 /shared/project

# Görünüm: drwxrwsr-x (s harfi)

# Kullanım: Paylaşılan proje dizini
mkdir /shared/project
chown :developers /shared/project
chmod 2775 /shared/project

# Artık bu dizinde kim dosya oluşturursa, grup "developers" olur
```

### Sticky Bit - 1000

Sadece **dosya sahibi** ve **root** silebilir (diğerleri silemez).

```bash
# Sticky bit ekle
chmod +t /tmp
chmod 1777 /tmp

# Görünüm: drwxrwxrwt (t harfi)

# Örnek: /tmp dizini
ls -ld /tmp
drwxrwxrwt 10 root root 4096 /tmp
# Herkes dosya oluşturabilir ama sadece sahibi silebilir
```

### Özel İzinleri Kaldırma

```bash
# SUID kaldır
chmod u-s dosya

# SGID kaldır
chmod g-s dosya

# Sticky bit kaldır
chmod -t dizin
```

---

## 📝 ACL (Gelişmiş İzinler) {#acl}

ACL (Access Control List), standart izinlerden daha detaylı kontrol sağlar.

### ACL Kurulumu

```bash
# ACL araçlarını kur
sudo apt install acl

# Dosya sisteminde ACL aktif mi kontrol et
mount | grep acl
```

### ACL Kullanımı

```bash
# ACL'leri görüntüle
getfacl dosya.txt

# Belirli kullanıcıya izin ver
setfacl -m u:username:rwx dosya.txt

# Belirli gruba izin ver
setfacl -m g:groupname:rx dosya.txt

# ACL kaldır
setfacl -x u:username dosya.txt

# Tüm ACL'leri kaldır
setfacl -b dosya.txt

# Recursive ACL
setfacl -R -m u:username:rwx /dizin

# Varsayılan ACL (yeni dosyalar için)
setfacl -d -m u:username:rwx /dizin
```

---

## 🛠️ Pratik Örnekler {#pratik-ornekler}

### 1. Web Sunucusu Dizini

```bash
# Nginx/Apache için
sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo find /var/www/html -type f -exec chmod 644 {} \;
```

### 2. SSH Key İzinleri

```bash
# SSH dizini
chmod 700 ~/.ssh

# Private key
chmod 600 ~/.ssh/id_rsa

# Public key
chmod 644 ~/.ssh/id_rsa.pub

# authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Script Çalıştırılabilir Yapma

```bash
# Script'e çalıştırma izni ver
chmod +x script.sh

# Sadece sahip çalıştırabilsin
chmod 700 script.sh

# Herkes çalıştırabilsin
chmod 755 script.sh
```

### 4. Paylaşılan Proje Dizini

```bash
# Grup ile paylaşılan dizin
sudo mkdir /shared/project
sudo chown :developers /shared/project
sudo chmod 2775 /shared/project
sudo setfacl -d -m g:developers:rwx /shared/project
```

### 5. Docker Volume İzinleri

```bash
# Docker volume'u kullanıcıya ver
sudo chown -R $USER:$USER ~/docker-volumes

# Container içindeki UID ile eşleştir
sudo chown -R 1000:1000 ~/docker-volumes/app
```

### 6. Log Dosyası İzinleri

```bash
# Log dosyası (sadece root yazabilir, herkes okuyabilir)
sudo chmod 644 /var/log/myapp.log
sudo chown root:adm /var/log/myapp.log

# Hassas log (sadece root)
sudo chmod 600 /var/log/auth.log
```

### 7. Güvenli Config Dosyası

```bash
# Config dosyası (sadece sahip okuyabilir)
chmod 600 ~/.config/app/secrets.conf
chown $USER:$USER ~/.config/app/secrets.conf
```

---

## 🔍 Troubleshooting

### İzin Hatası: "Permission denied"

```bash
# Dosya izinlerini kontrol et
ls -l dosya.txt

# Sahipliği kontrol et
stat dosya.txt

# Üst dizin izinlerini kontrol et
ls -ld $(dirname dosya.txt)

# Çözüm: İzin ver
chmod +r dosya.txt  # Okuma
chmod +w dosya.txt  # Yazma
chmod +x dosya.txt  # Çalıştırma
```

### Script Çalışmıyor

```bash
# Çalıştırma izni var mı?
ls -l script.sh

# Çözüm:
chmod +x script.sh

# Shebang var mı?
head -1 script.sh
# #!/bin/bash olmalı
```

### Web Dosyaları 403 Forbidden

```bash
# Nginx/Apache kullanıcısı erişebiliyor mu?
sudo -u www-data ls /var/www/html

# Çözüm:
sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo find /var/www/html -type f -exec chmod 644 {} \;
```

---

## 📚 Hızlı Referans

### chmod Cheat Sheet

```bash
chmod 777  # rwxrwxrwx - ASLA KULLANMA!
chmod 755  # rwxr-xr-x - Dizinler, scriptler
chmod 700  # rwx------ - Özel dizinler
chmod 644  # rw-r--r-- - Normal dosyalar
chmod 600  # rw------- - Hassas dosyalar
chmod 555  # r-xr-xr-x - Read-only çalıştırılabilir
chmod 444  # r--r--r-- - Read-only
```

### chown Cheat Sheet

```bash
chown user file              # Sadece sahip
chown user:group file        # Sahip ve grup
chown :group file            # Sadece grup
chown -R user:group dir      # Recursive
chown --reference=ref file   # Başka dosyadan kopyala
```

---

## 📖 Referanslar

- [chmod man page](https://man7.org/linux/man-pages/man1/chmod.1.html)
- [chown man page](https://man7.org/linux/man-pages/man1/chown.1.html)
- [umask man page](https://man7.org/linux/man-pages/man2/umask.2.html)
- [ACL Guide](https://wiki.archlinux.org/title/Access_Control_Lists)
