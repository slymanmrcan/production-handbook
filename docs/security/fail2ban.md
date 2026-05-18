# Fail2ban ile Aktif Koruma

**Fail2ban**, sunucunuzdaki log dosyalarını sürekli okuyan bir "Güvenlik Bekçisi"dir.

> [!CAUTION] > **Çakışma Uyarısı:** Eğer sunucunuzda **CrowdSec** yüklü ise Fail2ban kurmayın! İki araç aynı anda çalışırsa Firewall kuralları (iptables/nftables) birbirine girer ve sunucuyu kilitleyebilir.
> Modern ve daha performanslı bir alternatif için [CrowdSec](crowdsec.md) rehberine bakın.

## Sık Sorulan Sorular (Önce Burayı Okuyun!)

### 1. Sadece SSH'ı mı korur?

**HAYIR.** Fail2ban, log üreten **her şeyi** koruyabilir.

- **SSH:** Yanlış şifre deneyenleri banlar.
- **Nginx/Apache:** 403/404 hatalarını çok alanları veya botları banlar.
- **WordPress:** `/wp-login.php` sayfasına saldıranları banlar.

### 2. Kurdum ve "Active" yazıyor, koruyor mu?

**HAYIR, henüz değil!**

- Fail2ban kurulduğunda varsayılan olarak sadece **22. Portu** dinler.
- Biz SSH portunu **2222** yaptığımız için, şu an Fail2ban "havaya bakıyor". Saldırgan 2222'den girip denerse Fail2ban bunu **GÖRMEZ**.
- **Bu yüzden konfigürasyon yapmamız ŞARTTIR.**

---

## 1. Kurulum ve Kontrol

Önce paketi kurun ve servisin durumuna bakın:

```bash
sudo apt update
sudo apt install -y fail2ban
sudo systemctl status fail2ban --no-pager
```

Eğer "active (running)" değilse servisi başlatın:

```bash
sudo systemctl enable --now fail2ban
```

> [!TIP] > **Neden `--no-pager`?** > `systemctl` normalde çıktı uzunsa (less) içine girer. `--no-pager` eklerseniz çıktıyı ekrana basar ve terminale geri döner.
> Diğer yararlı parametreler:
>
> - `systemctl status fail2ban -l`: Satırları kesmeden (truncate) tüm hatayı gösterir.
> - `systemctl status fail2ban -n 50`: Son 10 satır yerine son 50 satırı gösterir.

## 2. Konfigürasyon Mantığı (Nasıl Ayarlayacağız?)

Fail2ban'in ayar dosyasını (`jail.conf`) **ASLA değiştirmeyin**. Çünkü güncelleme gelince dosya sıfırlanır, ayarlarınız gider.

Bunun yerine **"Parçalı Yönetim"** (Modular) yapısını kullanacağız.

### Neden `jail.d` kullanıyoruz?

Tüm ayarları tek bir devasa dosyaya (`jail.local`) yazmak eski bir yöntemdir. Yönetmesi zordur.
Biz `/etc/fail2ban/jail.d/` klasörü altına her servis için ayrı bir dosya koyacağız.

- `sshd.local`: Sadece SSH ayarları.
- `nginx.local`: Sadece Nginx ayarları.
- `whitelist.local`: Sadece güvenli IP listesi.

Bu sayede bir şeyi kapatmak isterseniz, o dosyayı silmeniz yeterlidir.

### Gelecek için Örnekler (Future Proof)

`/etc/fail2ban/jail.d/` altına şu dosyaları oluşturabilirsiniz:

**1. Nginx Proxy Manager (`jail.d/npm.local`):**

```ini
[npm-proxy]
enabled = true
port = 80,443
filter = nginx-proxy-manager
logpath = /data/logs/proxy-host-*.log
maxretry = 3
```

**2. PostgreSQL (`jail.d/postgresql.local`):**

```ini
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-*-main.log
maxretry = 5
```

**3. MySQL (`jail.d/mysql.local`):**

```ini
[mysqld-auth]
enabled = true
port = 3306
logpath = /var/log/mysql/error.log
maxretry = 5
```

Her servis için ayrı dosya açmak, yönetimi çocuk oyuncağı yapar.

## 3. SSH Koruması (Jail Oluşturma)

Hadi ilk parçamızı (modülümüzü) oluşturalım. SSH servisini koruyacak ayarları yapıyoruz.
Dosya yoksa oluşacaktır, korkmayın.

```bash
sudo nano /etc/fail2ban/jail.d/sshd.local
```

Dosyanın içine aşağıdaki ayarları yapıştırın. Port kısmının sizin kullandığınız portla (**2222**) aynı olduğundan emin olun.

````ini
```ini
[sshd]
enabled = true
backend = systemd
port = 2222
maxretry = 5
findtime = 10m
bantime = 1h
# Public Key hatalarını yakalamak için agresif mod şarttır:
mode = aggressive
````

## 4. İleri Düzey Kavramlar (Filtreler ve Eylemler)

Fail2ban'in nasıl çalıştığını anlamak için iki kavramı bilmek gerekir:

### Filtreler (Filters)

Log dosyasında "neyin saldırı olduğunu" anlayan Regex kurallarıdır. `/etc/fail2ban/filter.d/` altında dururlar. Örn: `sshd.conf` içinde "Failed password" yazısını arayan kurallar vardır. Genelde bunlara dokunmanız gerekmez.

### Eylemler (Actions)

Bir IP banlanınca ne olacak?

- **action\_:** Sadece Firewall (iptables/ufw) kuralı ekler (Varsayılan).
- **action_mw:** Banlar ve `destemail` adresine mail atar.
- **action_mwl:** Banlar, mail atar ve mailin içine logları da ekler.

> [!NOTE]
> Mail almak isterseniz sunucuda `sendmail` veya `postfix` kurulu olmalıdır. Günümüzde sunucudan mail atmak zor olduğu için (SPAM riski), genelde Slack/Discord webhook'ları tercih edilir.

## 5. Whitelist (Kendini Banlamamak)

Eğer sabit bir IP adresiniz varsa, kendinizi güvenli listeye ekleyebilirsiniz.

```bash
sudo nano /etc/fail2ban/jail.d/whitelist.local
```

En üste IP adresinizi ekleyin (birden fazla IP varsa boşlukla ayırın):

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 192.168.1.50/32
```

## 6. Aktifleştirme ve Kontrol

Ayarları geçerli kılmak için servisi yeniden başlatın:

```bash
# Konfigürasyonda hata var mı kontrol et
sudo fail2ban-client -t

# Servisi yeniden başlat
sudo systemctl restart fail2ban
```

### Durum Sorgulama

```bash
# Genel durum (Hangi hapishaneler aktif?)
sudo fail2ban-client status
# Çıktı: Jail list: sshd

# SSH Jail detayları (Kimler banlanmış?)
sudo fail2ban-client status sshd
```

### Derinlemesine Kontrol (Firewall Seviyesi)

Fail2ban gerçekten iş yapıyor mu? Bunu firewall kurallarına bakarak görebilirsiniz. `iptables` komutu, UFW kullansanız bile arka plandaki kuralları gösterir:

```bash
sudo iptables -S | grep f2b
```

Çıktıda şuna benzer satırlar görmelisiniz:

```
-N f2b-sshd
-A INPUT -p tcp -m multiport --dports 2222 -j f2b-sshd
-A f2b-sshd -s 1.2.3.4/32 -j REJECT --reject-with icmp-port-unreachable
```

_(Son satırdaki `1.2.3.4` banlanmış bir saldırgandır)._

## 7. Test Etme (Ban Testi)

Ayarlarınızın çalışıp çalışmadığını test etmek için en güvenli yöntem şudur:

1.  **Farklı Bir Bağlantı Bulun:** Telefonunuzun mobil internetini (Hotspot) kullanın.
2.  **Hatalı Giriş Yapın:** Mobil internet üzerinden terminal açın (Termius vb.) ve sunucunuza **yanlış şifre** ile bağlanmayı deneyin.
    ```bash
    ssh kullanıcı@sunucu-ip -p 2222
    ```
3.  **Tekrarlayın:** 5-6 kez hızlıca yanlış şifre girin.
4.  **Banlanma:** Bir süre sonra cevap gelmemeye başlayacak veya "Connection Refused" alacaksınız.
5.  **Ban Kaldırma (Unban):**
    Şimdi çalışan (Wi-Fi) bağlantınızdan sunucuya dönün ve o banlanan (mobil) IP'yi affedin:

    ```bash
    sudo fail2ban-client set sshd unbanip <MOBIL_IP_ADRESINIZ>
    ```

## 8. Sorun Giderme (Troubleshooting)

İşler ters gittiğinde kontrol etmeniz gerekenler:

### Hata: "Failed to access socket"

Komutu yazdınız ve şu hatayı aldınız:

```
ERROR Failed to access socket path: /var/run/fail2ban/fail2ban.sock. Is fail2ban running?
```

**Anlamı:** Fail2ban servisi çökmüş (Running değil).
**Çözümü:**

1.  Servisi başlatmayı deneyin: `sudo systemctl restart fail2ban`
2.  Eğer başlamıyorsa, konfigürasyon dosyanızda **yazım hatası** vardır.
3.  Hatayı bulmak için: `sudo fail2ban-client -t`
4.  Veya detaylı log için: `journalctl -u fail2ban.service -e`

### Uyarı: "Wrong value for 'maxretry'"

`fail2ban-client -t` yaptıysanız ve bu uyarıyı görüyorsanız, dosyada bir şeyi yanlış yazdınız.

- **Yanlış:** Dosyanın en başına `[sshd]` etiketi koymayı unutmuş olabilirsiniz.
- **Yanlış:** Satırbaşlarında gereksiz boşluk bırakmış olabilirsiniz.
- **Doğru:** Her blok mutlaka `[köşeli parantez]` ile başlamalıdır.

### Hata: Dosya Yanlış Yerde

Dosyalar mutlaka `/etc/fail2ban/jail.d/` klasöründe olmalıdır.
Eğer yanlışlıkla `/etc/fail2ban/sshd.local` (bir üst klasör) oluşturduysanız silin:

```bash
sudo rm /etc/fail2ban/sshd.local
```

### Sorun: "Test Ediyorum Banlamıyor"

Terminalden "Permission denied (publickey)" hatası alıyorsunuz ama Fail2ban saymıyor mu?
**Sebep:** Fail2ban varsayılan olarak "Wrong Password" hatalarına bakar. Public Key hataları daha sessizdir.
**Çözüm:** Konfigürasyon dosyanıza (`sshd.local`) şu satırı ekleyin:

```ini
mode = aggressive
```

### Sorun: "iptables Listesinde Göremiyorum"

Eğer `iptables -S` boş dönüyorsa, sunucunuz `nftables` kullanıyor olabilir. Şunu deneyin:

```bash
sudo nft list ruleset | grep -i fail2ban
```
