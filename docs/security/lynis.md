# Lynis (Güvenlik Denetimi)

Lynis hızlı bir yerel audit aracıdır. Host'u kapatmaz, bloklamaz, alarm üretmez; sadece mevcut hardening seviyesini ve dikkat edilmesi gereken noktaları gösterir.

## Ne Zaman Kullanılır

- İlk hardening sonrası
- Büyük bir değişiklikten önce ve sonra
- Aylık güvenlik drift kontrolünde
- Compliance aracına geçmeden önce ilk sinyal olarak

## Ne İşe Yarar

- Hardening index üretir
- Zayıf ayarları ve eksik bileşenleri listeler
- Log, firewall, SSH, kernel ve servis bazlı uyarılar verir
- Tek host'ta hızlı bir sağlık fotoğrafı sağlar

## Ne İşe Yaramaz

- Malware'i aktif olarak engellemez
- Runtime alarm platformu değildir
- Compliance raporu yerine geçmez
- Sorunu çözmez, sadece gösterecek sinyal üretir

## Kurulum

```bash
sudo apt update
sudo apt install -y lynis
```

## Çalıştırma

En temiz başlangıç komutu:

```bash
sudo lynis audit system -Q
```

İnceleme ve debug için:

```bash
sudo lynis audit system --verbose
sudo lynis audit system --log-file=/tmp/lynis.log
```

## Sonuç Nasıl Okunur

- `Hardening Index` trend göstergesidir, tek başına pass/fail değildir
- Düşük puan, doğrudan riskli alanlara işaret eder
- Yüksek puan, her şey tamam demek değildir; yine de servis ve runbook kontrolleri gerekir

## Yaygın Uyarılar

### Malware scanner not found

Lynis yerel antivirus veya rootkit tarayıcısı bulamamış demektir.

- Bu hata değil, eksik bir sinyaldir
- İlgili sayfa: [Malware & Rootkit](malware.md)
- Tek host için ilk aşamada kabul edilebilir, ama kayıt altına alınmalı

### Firewall not active

Firewall servisinin çalışmadığını ya da algılanmadığını söyler.

- UFW veya nftables durumunu doğrula
- Docker ortamında raw ruleset'i ayrıca kontrol et

### Old version / update available

Ubuntu deposundaki sürüm geride kalabilir.

- Bu bir güvenlik açığı değil, sürüm farkıdır
- Önce distro paketini kullan
- Vendor repo kullanacaksan bunu ayrı bakım kararı olarak ele al

### Banner / issue file

SSH banner'ı gereksiz bilgi sızdırıyor olabilir.

- `/etc/issue.net` ve ilgili login banner ayarlarını kontrol et
- Public host'larda versiyon bilgisi mümkün olduğunca minimal olmalı

## Rollout Notları

- Lynis'i root ile çalıştır
- Cron yerine önce manuel ve kontrol edilebilir çalıştır
- Raporu bir çıktı dosyasında sakla
- Her büyük hardening değişikliğinden sonra yeniden çalıştır

## Verification

```bash
sudo lynis audit system -Q
test -f /var/log/lynis.log
grep -E 'Hardening index|warnings|suggestions' /var/log/lynis.log >/dev/null
```

Beklenen sonuç:

- Audit tamamlanmalı
- Rapor üretilebilmeli
- Yeni kritik bulgular okunabilir olmalı

## Handbook İlişkisi

- [Security roadmap](index.md) içinde sürekli doğrulama katmanıdır.
- [OpenSCAP](compliance.md) ile standart bazlı rapora geçmeden önce ilk adımdır.
- [Advanced Tools](advanced-tools.md) ile fleet seviyesine taşınabilir.
- [Runbooks](../runbooks/index.md) olay anında müdahale için kullanılır, Lynis'in yerini almaz.
