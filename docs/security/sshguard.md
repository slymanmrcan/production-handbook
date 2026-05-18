# SSHGuard

SSHGuard, log uzerinden tekrar eden brute-force desenlerini okuyup firewall backend'i ile gecici ban uygulayan hafif bir koruma katmanidir. SSH hardening'in yerini almaz; onu tamamlar.

## Kapsam

- SSH brute-force ve benzeri tekrarli login denemeleri
- UFW veya nftables kullanan Ubuntu/Debian hostlar
- Az kaynak tuketen, basit ban politikasi gereken sistemler

## Ne Zaman Kullanilir

- SSH portu acik ama agir bir anti-bruteforce aracina ihtiyac yoksa
- Duz regex tabanli jail yonetimi yerine daha sade bir cozum istiyorsan
- Gomulu, kucuk VPS veya tek host ortaminda calisiyorsan

## Ne Degildir

- WAF degildir
- SIEM degildir
- SSH sertlestirmenin alternatifi degildir
- Karmaşık uygulama-level kurallar icin dogru arac degildir

## Onkosullar

- UFW veya nftables aktif bir firewall modeli
- SSH loglarinin journal veya syslog uzerinden okunabilir olmasi
- Management subnet veya bastion IP'si icin allowlist
- SSH key-based girisin zaten calisiyor olmasi

## Tasarim Prensibi

SSHGuard tek basina "güvenlik" saglamaz; sadece tekrar eden kume davranisi gorunce firewall kurali ekler. Bu nedenle:

- Once SSH hardening yap
- Sonra SSHGuard'i ekle
- En son whitelist ve rollback yolunu doğrula

## Kurulum

```bash
sudo apt update
sudo apt install -y sshguard
```

Servis ve config yerini hostta dogrula:

```bash
systemctl cat sshguard
ls /etc/sshguard 2>/dev/null
ls /usr/lib/*/ssh_guard 2>/dev/null
```

## Yapilandirma

Ubuntu/Debian build'lerinde config genellikle `/etc/sshguard/sshguard.conf` altindadir. Backend helper yolu distroya gore degisebilir; aktif sistemde dogrula.

Ornek:

```bash
# /etc/sshguard/sshguard.conf
BACKEND="/usr/lib/x86_64-linux-gnu/ssh_guard/sshg-fw-ufw"
THRESHOLD=30
BLOCK_TIME=600
WHITELIST_FILE="/etc/sshguard/whitelist"
```

Whitelist dosyasi:

```text
127.0.0.0/8
10.0.0.0/8
192.168.1.0/24
203.0.113.15
```

Notlar:

- Backend yolu UFW yerine nftables olabilir; helper'in varligini kontrol etmeden service'i acma.
- `BLOCK_TIME`'i test ortaminda kisa, production'da daha uzun sec.
- Whitelist'i mutlaka management subnet'e gore doldur.

## Uygulama

```bash
sudo install -d -m 0755 /etc/sshguard
sudo editor /etc/sshguard/sshguard.conf
sudo editor /etc/sshguard/whitelist
sudo systemctl enable --now sshguard
sudo systemctl restart sshguard
```

Firewall tarafinda management erisimi zaten acik olmalidir:

```bash
sudo ufw allow from <mgmt-subnet> to any port 22 proto tcp
sudo ufw status numbered
```

## Riskler ve Tuzaklar

- Whitelist olmadan kendi IP'ni banlayabilirsin.
- Backend helper yolu yanlis ise servis baslar gibi gorunup rule uygulayamayabilir.
- SSHGuard, log pattern'ini gormezse hicbir sey yapmaz.
- Sadece SSH degil, diger servisler icin de log kaynagi tutarliligi gerekir.

## Break-Glass ve Rollback

Olay aninda en kolay geri donus:

```bash
sudo systemctl stop sshguard
```

Eger ban firewall kurallari ile kaldiysa:

```bash
sudo ufw status numbered
sudo ufw delete <kural-numarasi>
sudo ufw reload
```

`ufw` yerine `nftables` kullaniyorsan ilgili temporary deny kurallarini sil ve firewall'u reload et. Console erişimi olmadan production'da deneme yapma.

## Verification Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Servis ayakta mi | `systemctl is-active sshguard` | `active` |
| Loglar geliyor mu | `journalctl -u sshguard -b -n 50 --no-pager` | Ban ve izleme kayitlari gorunmeli |
| Firewall backend aktif mi | `sudo ufw status numbered` veya `sudo nft list ruleset` | Kurallar gorunmeli |
| Whitelist calisiyor mu | `journalctl -u sshguard -b | rg -i whitelist` | Allowlisted IP'ler ban yememeli |
| Test ban calisiyor mu | Test host'tan hatali SSH denemesi | Geçici blok uygulanmali |

