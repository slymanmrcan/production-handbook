# SSH 2FA (TOTP)

Bu sayfa SSH oturumlarına ikinci faktör eklemek için kullanilir. Amaç, bir SSH anahtari veya sifresi ele gecse bile tek basina girisi yeterli olmaktan cikarmaktir.

## Kapsam

- SSH ile interaktif admin girişi olan hostlar
- Internet'e acik veya bastion arkasindan yonetilen sunucular
- Non-root admin hesabiyla yonetilen Ubuntu/Debian makineler

## Ne Zaman Kullanilir

- SSH anahtari ile giris zaten varsa ve ek kimlik dogrulama istiyorsan
- Tek bir key sızıntısının tam yetki vermesini istemiyorsan
- Prod hostlara uzaktan erisim yapiyorsan

## Kullanma Durumu

- Tamamen non-interaktif servis hesaplari
- Sadece automated CI/CD pull kullanimi
- Console veya provider recovery yolu olmayan hostlar

## Onkosullar

- Calisan bir SSH oturumu veya provider console erişimi
- Gerekirse geri almak icin `root` veya `sudo` yetkisi
- Saat senkronu calisiyor olmasi
- Once key-based login'in test edilmis olmasi

## Rollout Prensibi

1. Mevcut calisan oturumu kapatma.
2. Ilk olarak kullanici bazinda TOTP secret olustur.
3. SSH config'i bir drop-in dosyasina al.
4. `sshd -t` ile syntax kontrolu yap.
5. Yeni bir terminalden girisi test et.
6. Her sey calisiyorsa servisi reload et.

## Kullanici Secret Olusturma

Paket:

```bash
sudo apt update
sudo apt install -y libpam-google-authenticator
```

Kendi admin kullanicinla secret olustur:

```bash
google-authenticator
```

Interaktif sorularda pratik cevaplar:

- Time-based token: `y`
- Secret ve recovery code'lari kaydet: `evet`
- Ayni token'in tekrar kullanimini engelle: `y`
- Time skew window'u buyutme: `n`
- Rate limiting: `y`

## SSHD ve PAM Yapilandirmasi

`/etc/ssh/sshd_config.d/50-2fa.conf` gibi bir drop-in kullanmak rollback icin daha temizdir:

```nginx
UsePAM yes
KbdInteractiveAuthentication yes
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
```

PAM tarafinda ilgili satiri aktif et:

```pam
# /etc/pam.d/sshd
auth required pam_google_authenticator.so
```

Notlar:

- Bu ayar, SSHD tarafinda kbd-interactive akisini zorlar.
- Eski OpenSSH surumlerinde `ChallengeResponseAuthentication yes` kullanilmis olabilir.
- Ilk rollout'ta eski password login'e bel baglama; once key + TOTP akisini dogrula.

## Uygulama

```bash
sudo cp /etc/pam.d/sshd /etc/pam.d/sshd.bak
sudo install -d -m 0755 /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/50-2fa.conf >/dev/null <<'EOF'
UsePAM yes
KbdInteractiveAuthentication yes
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
EOF
sudo sshd -t
sudo systemctl reload ssh
```

`reload` tercih edilir; gereksiz restart, aktif oturumu kesmez.

## Riskler ve Tuzaklar

- Secret olusturmadan PAM'i acarsan kilitlenme riski artar.
- Tek terminalde test edip diger oturumu kapatma.
- Saat kaymasi 2FA kodunu gecersiz kilabilir.
- `PasswordAuthentication no` legacy baglantilari keser.
- Root ile dogrudan SSH girişi yerine admin user ve `sudo` modeli tercih et.

## Break-Glass ve Rollback

Elinde her zaman en az bir geri donus yolu bulunsun:

- Provider serial/console erişimi
- Acik kalan calisan SSH oturumu
- Known-good admin key

Geri alma:

```bash
sudo rm -f /etc/ssh/sshd_config.d/50-2fa.conf
sudo mv /etc/pam.d/sshd.bak /etc/pam.d/sshd
sudo sshd -t
sudo systemctl reload ssh
```

Eger kendi oturumunu kilitlediysen, console uzerinden yukaridaki rollback'i uygula. `restart` yerine once `sshd -t`, sonra `reload`.

## Verification Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| SSHD config parse oluyor mu | `sudo sshd -t` | Hata olmamali |
| Aktif policy gorunuyor mu | `sshd -T | rg 'usepam|kbdinteractiveauthentication|passwordauthentication|authenticationmethods'` | Kural seti gorunmeli |
| Servis reload oldu mu | `systemctl status ssh --no-pager -l` | `active (running)` |
| Ikinci terminalden giris calisiyor mu | `ssh -vvv kullanici@sunucu` | Key + TOTP akisi gorunmeli |
| Log kaydi geliyor mu | `journalctl -u ssh -b -n 100 --no-pager` | Yetkilendirme denemeleri gorunmeli |
| Saat senkron mu | `timedatectl status` | NTP senkronu gorunmeli |
