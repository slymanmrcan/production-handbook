# Uyumluluk ve Standartlar (OpenSCAP)

Bu sayfa güvenlik hardening rehberinin devamıdır, alternatifi değil. Lynis size "neresi zayıf" sorusunu hızlıca cevaplar; OpenSCAP ise "hangi standarda göre, hangi kontrol geçti/kaldı" sorusunu cevaplar.

## Ne Zaman Kullanılır

- Denetçi veya müşteri belirli bir standarda referans istiyorsa
- CIS, STIG, NIST veya PCI-DSS eşlemesi gerekiyorsa
- Güvenlik durumunu HTML/XML raporla belgelemek istiyorsanız
- Tek host raporundan daha formel bir kanıt seti gerekiyorsa

## Ne İşe Yarar

- Sistemi bir benchmark profil ile karşılaştırır
- Geçen/kalan kontrolleri raporlar
- Bazı profiller için remediation önerir
- Audit çıktısı üretir

## Ne İşe Yaramaz

- Runtime alarm üretmez
- Host'un canlı koruma katmanı değildir
- `ssh`, `firewall` veya `updates` yerine geçmez
- Test etmeden remediation scriptlerini çalıştırmak için uygun değildir

## Lynis ile İlişkisi

| Araç | Rol | Çıktı |
| :--- | :-- | :---- |
| [Lynis](lynis.md) | Hızlı host audit'i | Hardening önerileri |
| OpenSCAP | Compliance raporu | Standarda göre pass/fail |

Lynis ile önce baseline'ı toparla. OpenSCAP ile sonra standarda göre kanıt üret.

## Ubuntu/Debian Kurulum

Paket isimleri sürüme göre değişebilir; önce içerik paketlerini doğrula, sonra kur:

```bash
sudo apt update
apt-cache search openscap | rg 'openscap-scanner|scap-security-guide|libopenscap8'
sudo apt install -y openscap-scanner libopenscap8 scap-security-guide
```

Ubuntu Pro kullanıyorsan `ubuntu-security-guide` da değerlendirilebilir. Ama standart akışta `oscap` ile ilerlemek daha taşınabilirdir.

## Profil Bulma

Önce hangi benchmark dosyasının sistemde olduğunu kontrol et:

```bash
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

Yaygın profil türleri:

- `cis_level1_server`: genel üretim sunucusu için başlangıç profili
- `cis_level2_server`: daha sıkı, ama bazı servisleri bozabilir
- `pci_dss`: ödeme sistemi veya kart verisi içeren ortamlar

## Tarama Akışı

```bash
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
  --results-arf /tmp/results.xml \
  --report /tmp/report.html \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

Bu komut üç şey üretir:

- machine-readable sonuç
- HTML rapor
- kontrol bazlı geçme/kalma listesi

## Rollout Notları

- Önce staging host'ta çalıştır
- Remediation'ı ayrı değişiklik penceresinde uygula
- Özellikle `/tmp`, SSH ve firewall kuralları gibi kontrolleri körlemesine düzeltme
- Raporu compliance evidence olarak sakla

## Verification

```bash
test -f /tmp/results.xml
test -f /tmp/report.html
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
grep -E 'pass|fail' /tmp/results.xml >/dev/null
```

Beklenen sonuç:

- Rapor üretildi
- Profil okunabildi
- Sonuçlar kaydedildi

## Handbook İlişkisi

- [Base OS](../how-to/base-os.md), [SSH](ssh.md), [Firewall](firewall.md) ve [Updates](updates.md) tamamlanmadan scan'e geçme.
- [Lynis](lynis.md) hızlı sağlık kontrolü içindir.
- [Advanced Tools](advanced-tools.md) merkezi uyumluluk operasyonu içindir.
- [Runbooks](../runbooks/index.md) remediation sonrası incident varsa kullanılır.
