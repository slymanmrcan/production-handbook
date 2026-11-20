# SSH Güvenli Port Değiştirme (adim-adim)

Bu rehber, SSH portunu **22**'den **2222**'ye taşırken "içeride kilitli kalmamanız" için en güvenli yöntemi anlatır.

## Hazırlık: Mevcut Durumu Gör

Önce şu an hangi portun dinlediğini ve UFW durumunu kontrol edin:

```bash
sudo ufw status verbose
# Çıktı "Status: active" ise kurallar işliyor demektir.
# "Inactive" ise firewall kapalıdır, yine de aşağıdakileri yapın.

sudo ss -lntp | grep sshd
# Çıktıda ":22" görüyorsanız şu an standart porttasınız. ok.
```

## Adım 1: Firewall Sigortası (UFW)

SSH ayarını değiştirmeden önce, mevcut ve yeni SSH portuna yönetim kaynağınızdan erişimi doğrulayın. Örnekteki IP'yi sabit yönetim veya VPN çıkış adresinizle değiştirin. Mevcut SSH oturumunu ve sağlayıcı konsolunu açık tutun.

1.  **Mevcut portu garantiye al (Sigorta):**

    ```bash
    sudo ufw allow from 203.0.113.10 to any port 22 proto tcp
    ```

2.  **Yeni hedef portu aç:**

    ```bash
    sudo ufw allow from 203.0.113.10 to any port 2222 proto tcp
    ```

3.  **Temel kurallar ve aktifleştirme:** UFW kapalıysa [firewall rehberindeki](firewall.md) adımlarla mevcut kuralları doğrulayıp etkinleştirin.

4.  **Kontrol:**
    ```bash
    sudo ufw status numbered
    # Çıktıda HEM 22/tcp HEM 2222/tcp "ALLOW" olarak görünmeli.
    ```

> [!WARNING] > **AWS, Oracle ve Cloud Kullanıcıları:**
> Sağlayıcı firewall'ında da yönetim IP'nize yeni SSH portu için izin verin.

## Adım 2: Konfigürasyon Değişikliği

Şimdi SSH servisine "Artık 2222'den dinle" diyeceğiz.

Dosyayı açın:

```bash
sudo nano /etc/ssh/sshd_config
```

> [!TIP] > **Port Seçimi:** 2222 çok bilinen bir alternatiftir. Daha az taranan bir port seçmek isteyebilirsiniz (örn: 41922, 52022). Ancak 1024 üstü olmalı.

> [!WARNING] > **RHEL/CentOS/Rocky Linux Kullanıcıları:**
> SELinux, varsayılan olarak SSH'ın port değiştirmesini engeller. Şu komutu çalıştırmalısınız:
>
> ```bash
> sudo semanage port -a -t ssh_port_t -p tcp 2222
> # semanage yoksa: sudo dnf install policycoreutils-python-utils
> ```

Şunları düzenleyin (satırın başında `#` varsa kaldırın):

```ssh
Port 2222
PermitRootLogin no
PasswordAuthentication no
```

Kaydet ve çık (`Ctrl+O`, `Enter`, `Ctrl+X`).

## Adım 3: SSH Socket Activation

Ubuntu 22.10 ile OpenSSH varsayılan olarak socket activation kullanmaya başladı. Sürüm ve imaja göre mekanizma değişebildiği için mevcut durumu kontrol edin. Ubuntu 24.04, port ayarını SSH yapılandırmasından bir systemd generator ile okur. [Ubuntu OpenSSH socket activation notları](https://discourse.ubuntu.com/t/sshd-now-uses-socket-based-activation-ubuntu-22-10-and-later/30189/1)

```bash
# Socket modunda mısınız kontrol edin
if systemctl is-active --quiet ssh.socket; then
    echo "⚠️  Socket Activation aktif - Aşağıdaki adımları uygulayın"
else
    echo "✅ Klasik mod - Bu adımı atlayıp Adım 4'e geçebilirsiniz"
fi
```

**Eğer Socket Aktifse:**

`systemctl cat ssh.socket` ile mevcut port override'larını kontrol edin. Ubuntu 24.04'te çakışan bir override yoksa `sshd_config` değişikliğini Adım 3'ün sonundaki komutlarla uygulayın. Portu socket drop-in dosyasından yöneten kurulumlarda mevcut ayarı yedekleyin ve aşağıdaki düzenleyiciyi kullanın:

```bash
sudo systemctl edit ssh.socket
```

Açılan boş sayfaya şunları yapıştırın ve kaydedin (`Ctrl+O`, `Enter`, `Ctrl+X`):

```ini
[Socket]
ListenStream=
ListenStream=2222
```

_(Not: İlk satırdaki boş `ListenStream=` varsayılan 22 portunu siler, ikincisi yenisini ekler.)_

Değişikliği uygulayıp servisi yeniden başlatın:

```bash
sudo sshd -t && sudo systemctl daemon-reload && sudo systemctl restart ssh.socket
```

## Adım 4: Test ve Restart

Hatayı restart atmadan önce yakalamalıyız.

1.  **Config syntax testi:**

    ```bash
    sudo sshd -t
    ```

    _(Çıktı yoksa her şey yolunda demektir. Hata varsa düzeltin!)_

2.  **Servis modunda yapılandırmayı yükle:**

    ```bash
    sudo sshd -t && sudo systemctl reload ssh.service
    ```

    Socket modunda dinleyiciyi Adım 3 yönetir. Mevcut oturumu test tamamlanana kadar açık tutun.

3.  **Dinlenen Portu Doğrula:**
    ```bash
    sudo ss -lntp | grep 2222
    # Çıktı: LISTEN ... :2222 ... users:(("sshd")) veya systemd
    ```

## Adım 5: İçeriden Bağlantı Testi (Localhost)

Yeni terminal açmadan önce, sunucunun kendi kendine 2222'den bağlanabildiğini doğrulayın:

```bash
ssh -v -p 2222 localhost
```

_Şifre veya key soruyorsa (veya "Permission denied" diyorsa) port çalışıyor demektir. `-v` ile detayları görebilirsiniz._

## Adım 6: Dışarıdan Bağlantı Testi

1.  Mevcut terminali **KAPATMAYIN**.
2.  **AWS/Cloud Panel Kontrolü:** Security Group ayarlarında tcp/2222 portunu açtığınızdan emin olun.
3.  Bilgisayarınızdan **yeni bir terminal** açın.
4.  Bağlanmayı deneyin:
    ```bash
    ssh -p 2222 kullanici@sunucu-ip
    ```

## Adım 7: Temizlik (Eski Kapıyı Kapat)

Yeni porttan başarıyla giriş yaptıktan sonra eski SSH portuna izin veren kuralları `sudo ufw status numbered` ile belirleyin. Örnekte eklenen yönetim kuralını şöyle kaldırın:

```bash
sudo ufw delete allow from 203.0.113.10 to any port 22 proto tcp
sudo ufw status numbered
```

Eski porta verilen diğer SSH izinlerini de doğrulayıp kaldırın. Sağlayıcı firewall'ındaki eski SSH kuralını gözden geçirin ve yeni porttan tekrar giriş yapın.

## Adım 8: İleri Düzey Hardening (Lynis Önerileri)

Bu ayarlar sadece "puan artırmak" için değildir; sunucunuzun yeteneklerini kısıtlayarak saldırı yüzeyini daraltır.

**Neden Gerekli?**

1.  **TcpForwarding (Tünelleme):** Varsayılan olarak SSH, sunucunuzu bir "Proxy" gibi kullanmaya izin verir. Bir saldırgan şifrenizi ele geçirirse, sizin sunucunuz üzerinden internete çıkıp başka yerlere saldırabilir (IP'nizi kirletir). Bunu kapatıyoruz.
2.  **X11Forwarding:** Sunucuda grafik arayüz (pencere, mouse vs.) kullanmıyorsanız bu özellik gereksiz bir güvenlik riskidir. Kapatıyoruz.
3.  **ClientAlive:** Kullanıcı bilgisayar başından kalktıysa, SSH oturumu sonsuza kadar açık kalmasın, otomatik kapansın istiyoruz.

**Uygulama:**

SSH'da önemli bir kural vardır: **"İlk okunan satır geçerlidir."**
Bu yüzden dosyanın en altına eklemek yerine, mevcut satırları bulup değiştirmek en garantili yöntemdir.

1.  Dosyayı açın: `sudo nano /etc/ssh/sshd_config`
2.  `Ctrl+W` ile aşağıdaki ayarları aratın.
3.  Başlarında `#` varsa silin (yorum satırından çıkartın).
4.  Değerlerini şu şekilde güncelleyin:

```ssh
# Proxy/VPN olarak kullanılmasını engelle
AllowTcpForwarding no
AllowAgentForwarding no
X11Forwarding no

# Boş oturumları at (5 dakika sonra)
ClientAliveInterval 300
ClientAliveCountMax 2

# Giriş denemelerini kısıtla
MaxAuthTries 3
MaxSessions 2
```

_(Eğer dosyada bu satırları bulamazsanız, en alta ekleyebilirsiniz.)_

```ssh
# ==============================================
# LYNIS HARDENING (Level 2)
# ==============================================

# Tünelleme ve Yönlendirmeyi Kapat
# (Saldırgan sunucuyu proxy gibi kullanamasın)
AllowTcpForwarding no
AllowAgentForwarding no
X11Forwarding no

# Boş Duran Bağlantıları Kes
# (2 deneme x 300 saniye = 10 dakika sonra cevap vermeyen client'ı at)
ClientAliveInterval 300
ClientAliveCountMax 2

# Giriş Deneme Haklarını Kısıtla
# (Brute-force saldırıları için ek zorluk)
MaxAuthTries 3
MaxSessions 2

# Log Seviyesini Artır
# (Saldırı analizi için daha fazla detay)
LogLevel VERBOSE

# TCP KeepAlive Kapat
# (Hayalet bağlantıları önler, ClientAlive ile birlikte kullanılır)
TCPKeepAlive no
```

Ayarları uygulayın:

sudo sshd -t && sudo systemctl reload ssh

````

---

## Adım 9: Fail2Ban Hatırlatması 👮‍♂️

Port değiştirdiğiniz için Fail2Ban'ın da haberi olmalı. Yoksa saldırganları eski kapıda arar.

1.  Dosyayı açın: `sudo nano /etc/fail2ban/jail.local`
2.  `[sshd]` bölümünü bulun ve portu güncelleyin:

```ini
[sshd]
enabled = true
port = 2222
````

3.  Fail2Ban'ı yeniden başlatın: `sudo systemctl restart fail2ban`

---

## Adım 10: Acil Durum: Geri Dönüş (Rollback) 🚨

Eğer kendinizi kilitlediyseniz ve **konsol erişiminiz** (VNC/KVM) varsa:

1.  Cloud panelinden VNC/Serial Console açın.
2.  Önceki dinleme portuna [yönetim IP'niz için izin verin](firewall.md). `sshd_config` veya ilgili drop-in dosyasını bilinen çalışan sürüme döndürün. Socket drop-in'i bu işlemde değiştiyse aynı dosyanın yedeğini geri yükleyin veya bu işlem için yeni eklediğiniz özel drop-in'i kaldırın.

```bash
# Socket modunda:
sudo sshd -t && sudo systemctl daemon-reload && sudo systemctl restart ssh.socket
# Servis modunda:
sudo sshd -t && sudo systemctl reload ssh.service
```

Modele uygun komutu seçin. `sudo ss -lntp` ile portu doğrulayın ve ayrı terminalden anahtarla tekrar bağlanın.

---

## 📋 Özet Kontrol Listesi

| Adım | İşlem                        | Durum |
| :--- | :--------------------------- | :---- |
| 1    | UFW'de 22 ve 2222 açık       | ⬜    |
| 2    | `sshd_config` düzenlendi     | ⬜    |
| 3    | Socket ayarı (Ubuntu 22.04+) | ⬜    |
| 4    | `sshd -t` testi başarılı     | ⬜    |
| 5    | Localhost testi başarılı     | ⬜    |
| 6    | Dışarıdan bağlantı başarılı  | ⬜    |
| 7    | Eski port (22) kapatıldı     | ⬜    |
| 8    | Hardening uygulandı          | ⬜    |
| 9    | Fail2Ban güncellendi         | ⬜    |

**Tebrikler! SSH portunuz artık güvenli bir şekilde değiştirildi.** 🎉
