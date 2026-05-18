# Sunucu Güvenliği (Hardening)

Bu bölüm tek bir ürün ya da tek bir ayar seti değil. Amaç, güvenliği bir operasyon modeli olarak kurmak: önce erişimi kapat, sonra host'u sertleştir, sonra değişikliği ve anomaliyi ölç, en son compliance ve fleet tooling katmanına geç.

## Bu Sayfa Ne Zaman Kullanılır

- Yeni bir host production'a çıkmadan önce
- Bir servis internete açılmadan önce
- SSH, firewall, 2FA veya brute-force koruması tasarlanırken
- Dosya bütünlüğü, malware taraması veya host drift incelemesi yapılırken
- Denetim, uyumluluk veya merkezi güvenlik operasyonu istenirken

## Operasyon Modeli

Güvenliği şu sırayla düşün:

1. Erişim yüzeyini daralt.
2. Host varsayılanlarını sertleştir.
3. Değişikliği ve drifti ölç.
4. Fleet veya compliance ihtiyacı varsa merkezi araçlara geç.
5. Incident oluşursa runbook'a dön.

## Varsayılan Yol Haritası

### Aşama 1: Giriş Noktasını Kapat

1. [Temel OS Kurulumu](../how-to/base-os.md)
2. [Kullanıcı Yönetimi](../how-to/user-management.md)
3. [SSH Hardening](ssh.md)
4. [Firewall (UFW)](firewall.md)
5. [Otomatik Güvenlik Güncellemeleri](updates.md)

### Aşama 2: Host Hardening

6. [Kernel Parametreleri](sysctl.md)
7. [2FA](2fa.md)
8. [Fail2ban](fail2ban.md) veya [CrowdSec](crowdsec.md)
9. [/tmp Hardening](tmp-hardening.md)
10. [Dosya Bütünlüğü](fim.md)
11. [Kaynak Kısıtlamaları](resource-limits.md)

### Aşama 3: Uygulama ve Container Katmanı

12. [Şifreler ve Secret Yönetimi](secrets.md)
13. [Docker Hardening](docker.md)
14. [Gereksiz Servisleri Temizle](services.md)
15. [Monitoring](monitoring.md)

### Aşama 4: Sürekli Doğrulama

16. [Lynis](lynis.md)
17. [Bastion Host](bastion.md)
18. [Uyumluluk (OpenSCAP)](compliance.md)
19. [İleri Seviye Güvenlik Araçları](advanced-tools.md)

## Karar Ağacı

| Durum | İlk Durak | Neden |
| :---- | :-------- | :---- |
| Tek host'un dışarı açılması gerekiyor | `ssh.md`, `firewall.md`, `2fa.md` | Erişim yüzeyi önce kapanmalı |
| Brute-force veya bot trafiği artıyor | `fail2ban.md` veya `crowdsec.md` | Otomatik engelleme gerekir |
| Host'ta beklenmeyen değişiklik var | `fim.md`, `lynis.md` | Drift ve ihlal sinyali gerekir |
| Compliance raporu isteniyor | `compliance.md` | Denetçi odaklı çıktı gerekir |
| Çok sayıda sunucu var | `advanced-tools.md` | Merkezi görünürlük gerekir |
| Bir saldırı oldu | [Runbooks](../runbooks/index.md) | Güvenlik sayfası değil müdahale sayfası gerekir |

## Araç Seçimi

| İhtiyaç | En Mantıklı Başlangıç | Not |
| :------ | :-------------------- | :-- |
| Tek sunucuda brute-force engelleme | [Fail2ban](fail2ban.md) | Basit, anlaşılır, hızlı |
| Birden fazla hostta ortak saldırı verisi | [CrowdSec](crowdsec.md) | Daha merkezi ve paylaşımlı yaklaşım |
| Hafif SSH odaklı koruma | [SSHGuard](sshguard.md) | Küçük yüzey, düşük kaynak kullanımı |
| Hızlı host audit'i | [Lynis](lynis.md) | En iyi ilk kontrol |
| Denetçi raporu | [OpenSCAP](compliance.md) | Uyumluluk odaklı |
| Fleet görünürlüğü | [Advanced Tools](advanced-tools.md) | Agent ve central logging gerekir |

## Bu Bölüm Ne Değildir

- Tek seferlik "checklist" değildir.
- Güvenliği tek araçla çözmez.
- Runbook yerine geçmez.
- Compliance raporu yerine geçmez.

## Handbook İçindeki Yeri

- [How-to](../how-to/index.md) host'u ayağa kaldırır.
- Bu sayfa host'u sertleştirir ve ölçer.
- [Troubleshooting](../troubleshooting/index.md) bozulunca triage eder.
- [Runbooks](../runbooks/index.md) incident geldiğinde uygulanır.
- [Cloud Guardrails](../cloud/shared/index.md) fleet ve platform seviyesinde kontrol ekler.

> [!TIP]
> Eğer nereden başlayacağını bilmiyorsan önce `ssh.md`, `firewall.md`, `updates.md` ve `lynis.md` sırasını uygula. Bu dördü en yüksek başlangıç değerini verir.
