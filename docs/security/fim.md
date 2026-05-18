# Dosya Butunluk Takibi (AIDE)

AIDE, sistemdeki kritik dosyalarin baslangic durumunu baz alir ve sonradan olan degisiklikleri raporlar. Bu bir prevention araci degil, drift ve compromise tespit aracidir.

## Kapsam

- `/etc` altindaki kritik konfigurasyonlar
- `systemd` unit dosyalari ve drop-in'ler
- `sshd_config`, `sudoers`, firewall config
- kabuk scriptleri, admin automation, authorized_keys
- boot ve security ile ilgili dosyalar

## Ne Zaman Kullanilir

- yeni hardening baseline tamamlandiginda
- incident sonrasi dosya degisikligini anlamak icin
- buyuk config rollout veya paket upgrade oncesi/sonrasi
- rootkit veya yetkisiz degisim suphelerinde

## Ne Degildir

- Canli saldiriyi engellemez
- Davranis analizi yapmaz
- Log toplama araci degildir

## Onkosullar

- Sistem "temiz" iken ilk baseline alinmis olmali
- Saat senkronu calismali
- AIDE veritabani off-host kopyaya alinmali
- Değişen dizinler icin gürültü politikasi tanimlanmali

## Ilk Baseline

```bash
sudo apt update
sudo apt install -y aide
sudo aide --init
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

Ilk init'ten sonra veritabaniyi güvenli yerde sakla:

```bash
sudo install -d -m 0750 /var/backups/aide
sudo cp /var/lib/aide/aide.db /var/backups/aide/aide.db.$(date +%F)
```

## Gürültü Kontrolu

Volatil dizinleri izlemek yerine genelde disarida birakmak daha sagliklidir:

```text
!/proc/
!/sys/
!/dev/
!/run/
!/tmp/
!/var/cache/apt/archives/
!/var/lib/apt/lists/
```

Log dizinlerini izleyeceksen rotation-aware bir kural kullaniyor ol; aksi halde her rotasyon false positive uretir. Loglari izlememek çoğu hostta daha dogru tercihtir.

## Isletim Akisi

Gunluk kullanımda akış şudur:

1. `aide --check` ile drift var mi bak.
2. Degisim beklenen bir maintenance ise raporu incele.
3. Yetkili degisiklikse baseline'i yenile.
4. Yeni veritabaniyi eski ile degistir.

Kontrol:

```bash
sudo aide --check
```

Yetkili degisiklikten sonra:

```bash
sudo aide --update
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Rollback ve Break-Glass

- Yeni versiyonlar icin eski veritabaniyi sakla.
- Saldiri suphesi varsa mevcut veritabanina güvenme; off-host baseline ile yeniden kur.
- Beklenen config degisiklikleri icin change window ac ve sonra baseline'i yenile.

Eger bir upgrade sonrasinda çok fazla fark gorursen, once farkin beklenen olup olmadigini doğrula; körlemesine `--update` calistirma.

## Otomasyon

Ubuntu/Debian paketleri çoğu zaman AIDE kontrolunu cron ile calistirir. Bunu hostta dogrula:

```bash
test -x /etc/cron.daily/aide
```

Gerekirse elle calistir:

```bash
sudo /etc/cron.daily/aide
```

## Verification Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| AIDE kurulu mu | `aide --version` | Surum bilgisi donmeli |
| Baseline mevcut mu | `ls -l /var/lib/aide/aide.db` | DB dosyasi gorunmeli |
| Drift kontrolu calisiyor mu | `sudo aide --check` | Beklenmeyen degisimler listelenmeli veya temiz cikmali |
| Update akisi calisiyor mu | `sudo aide --update` | Yeni `aide.db.new` uretilmeli |
| Cron tetigi var mi | `test -x /etc/cron.daily/aide` | Calistirilabilir olmalı |

