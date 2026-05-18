# /tmp Hardening

Bu sayfa world-writable temp alanlarinda kod calistirmayi zorlastirmak icin kullanilir. Hedef `noexec`, `nosuid` ve `nodev` ile gecici alanin zararli binary/script calistirma alanina donusmesini engellemektir.

## Kapsam

- `/tmp` ve gerekirse `/var/tmp`
- Ubuntu/Debian hostlar
- Interaktif admin ve automation isleri olan makineler

## Ne Zaman Kullanilir

- Sunucuya local code execution riskini azaltmak istiyorsan
- Temp dizinlerinden calisan exploit veya dropper davranisini zorlastirmak istiyorsan
- Baseline hardening asamasinda mount policy tanimliyorsan

## Ne Zaman Dikkatli Olunmali

- Bazı installer veya vendor scriptler `/tmp` icinde executable payload bekleyebilir
- RAM'i kucuk hostlarda `tmpfs` boyutu bilincli secilmeli
- Canli remote erişim varken mount degisikligi yapmadan once break-glass planı hazır olmali

## Onkosullar

- Console veya alternatif SSH session
- `/tmp`'yi kullanan kritik uygulamaları önceden bilmek
- Fstab degisiklikleri icin yedek

## Mevcut Durumu Kontrol Et

```bash
findmnt /tmp
findmnt /var/tmp
mount | rg ' /tmp | /var/tmp '
```

## Uygulama Seçenekleri

### Secenek 1: `tmpfs` ile /tmp

Yeterli RAM varsa en basit ve temiz model budur:

```bash
sudo cp /etc/fstab /etc/fstab.bak
sudo editor /etc/fstab
```

Ornek satir:

```fstab
tmpfs /tmp tmpfs rw,nosuid,nodev,noexec,relatime,size=1G 0 0
```

### Secenek 2: Mevcut Disk Mount'u uzerinde mount option

Eger `/tmp` ayri bir filesystem ise, sadece mount option ekle:

```fstab
UUID=<uuid> /tmp ext4 rw,nosuid,nodev,noexec,relatime 0 2
```

Bu ikinci model, `tmpfs`'e gore daha az RAM tuketir ve bazen uzun temp kullanan islerde daha uyumludur.

## /var/tmp Hakkinda

`/var/tmp` rebootlar arasinda saklanabilen temp alanidir. Bunu da sertlestirebilirsin, ama her hostta ayni seyi yapma. Önce uygulamanin bu alani kullanip kullanmadigini dogrula.

## Degisikligi Uygula

```bash
sudo mount -a
sudo findmnt /tmp
```

Eger mevcut mount zaten varsa ve sadece option degistirdinse:

```bash
sudo mount -o remount /tmp
```

## Riskler ve Tuzaklar

- `noexec` uygulandiktan sonra temp'ten calisan installer bozulabilir.
- `nosuid` ve `nodev` genelde güvenlidir, ama eski tool'lar sorun cikarabilir.
- `tmpfs` boyutu yanlis secilirse OOM veya temp fill yaşanabilir.
- Root shell dahi olsa mount option'lari dikkatsiz degistirme.

## Break-Glass ve Geri Alma

Kritik bir maintenance gerekiyorsa gecici olarak geri al:

```bash
sudo mount -o remount,exec /tmp
```

Isin bittiginde ayni degisiklikleri geri kapat:

```bash
sudo mount -o remount,noexec,nosuid,nodev /tmp
sudo findmnt /tmp
```

Eger fstab degisikligi yaptiysan ve sistem bozulduysa, console uzerinden `/etc/fstab` yedegini geri koy:

```bash
sudo cp /etc/fstab.bak /etc/fstab
sudo mount -a
```

## Verification Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Mount optionlar aktif mi | `findmnt -no OPTIONS /tmp` | `noexec,nosuid,nodev` gorunmeli |
| Çalisabilir script engelleniyor mu | `echo 'echo ok' >/tmp/test.sh && chmod +x /tmp/test.sh && /tmp/test.sh` | `Permission denied` veya benzeri hata |
| Mount dogru yeniden yüklendi mi | `sudo mount -a` | Hata olmamali |
| Fstab yedegi var mi | `ls -l /etc/fstab.bak` | Yedek dosya gorunmeli |
| Sistem hala usable mi | `systemctl --failed` | Yeni failure olmamali |
