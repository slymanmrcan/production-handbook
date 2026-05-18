# Sertifika Suresi Doldu

Bu runbook, sertifika son kullanma tarihi geçmişse veya tarayıcı / client artık bağlantıyı kabul etmiyorsa uygulanır.

## Etki

- HTTPS bağlantısı hata verir.
- HSTS varsa kullanıcı siteye hiç giremeyebilir.
- API client'lar TLS handshake hatası alabilir.
- Browser "certificate expired" uyarısı gösterir.

## Hızlı Karar

| Durum | Karar |
| :---- | :---- |
| Süre dolmuş ama yenileme mümkün görünüyorsa | Hemen yenile |
| Yenileme başarısız ve süre dolmuşsa | Fallback sertifika veya manuel replacement |
| Public site kritikse | Eskalasyon aç |
| İç sistem ise | Geçici self-signed ile servis içi erişimi geri getir |

## 1. Durumu Doğrula

Sertifikanın gerçekten bitip bitmediğini kontrol et:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer
sudo certbot certificates
```

Beklenen:

- `notAfter` geçmişte olmalı
- Hedef domain sertifikası listelenmeli

## 2. İlk Containment

### Browser / client etkisini azalt

- Önemli müşterilere ve iç ekiplere durum bildirimi geçin.
- Eğer uygulama içinde maintenance page varsa onu aktif edin.
- Yeni deploy yapmayın.
- TLS sorunu çözülmeden cloud/WAF değişikliği yapmayın.

### Nginx / Apache tarafını kilitle

Yenileme sırasında config bozulduysa önce syntax test yapın:

Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

Apache:

```bash
sudo apache2ctl configtest
sudo systemctl status apache2 --no-pager
```

## 3. Yenileme Denemesi

Önce renewal yolunu deneyin:

```bash
sudo certbot renew
```

Belirli sertifikayı yenilemek gerekirse:

```bash
sudo certbot renew --cert-name example.com
```

Sonra servis reload:

Nginx:

```bash
sudo systemctl reload nginx
```

Apache:

```bash
sudo systemctl reload apache2
```

## 4. Manual Replacement Seçenekleri

### A. Geçerli yedek varsa

Önceden alınmış sertifika yedeği, password manager notu veya backup varsa önce onu kullanın.

Kontrol:

```bash
sudo ls -l /etc/letsencrypt/live/example.com/
sudo ls -l /etc/letsencrypt/archive/example.com/
```

Symlink'leri bozmayın; mümkünse certbot üzerinden yeniden üretin. Eğer sadece eski archive varsa ve gerçekten güveniliyorsa, ilgili live path'i doğru sürüme döndürün.

### B. Hızlı geçici çözüm

Kritik iç servisler için kısa ömürlü self-signed sertifika üretilebilir.

```bash
sudo openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /etc/ssl/private/temp.key \
  -out /etc/ssl/certs/temp.crt \
  -days 7 \
  -subj "/CN=example.com"
```

Bu çözüm:

- public browser trafiği için final çözüm değildir
- servis-to-servis veya internal admin erişimi için geçicidir

### C. DNS-01 veya yeni sertifika alma

HTTP-01 challenge çalışmıyorsa, özellikle wildcard gerekiyorsa DNS-01 ile yeni sertifika alın.

## 5. Reload Concern

Sertifika yenilense bile uygulama yeni sertifikayı ancak reload sonrası görür.

Doğrulayın:

```bash
sudo certbot certificates
sudo nginx -t || sudo apache2ctl configtest
```

Reload sonrası servis hata veriyorsa:

- config'te yanlış path olabilir
- permission problemi olabilir
- sertifika chain eksik olabilir

## 6. Chain ve Hostname Mismatch Kontrolü

Sertifika süresi geçmiş olsa bile başka problemler de olabilir. Aşağıdakileri kontrol edin:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

Kontrol listesi:

- `subject` domain ile eşleşiyor mu
- `issuer` beklenen CA mı
- `subjectAltName` hedef hostname'i içeriyor mu
- chain tam geliyor mu

Nginx / Apache vhost içindeki `server_name` ve sertifika domain'i aynı olmalı.

## 7. Escalation Criteria

Şunlardan biri varsa eskalasyon açın:

- HSTS yüzünden public erişim tamamen kesilmişse
- Renew başarısız ve süre dolmuşsa
- Domain DNS erişimi sizde değilse
- Cloud/LB/WAF 80 veya 443 trafiğini engelliyorsa
- Yeni sertifika alırken rate limit'e yaklaşılmışsa

## 8. Doğrulama

Yenileme veya replacement sonrası:

```bash
sudo certbot certificates
sudo openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -dates -subject -issuer
curl -I https://example.com
curl -I http://example.com
```

Beklenen:

- `notAfter` gelecekte olmalı
- HTTP beklenen redirect'i yapmalı
- HTTPS client hatası vermemeli

Ek kontrol:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

## 9. Olay Kaydı

Not edilmesi gerekenler:

- hangi domain etkilendi
- sertifika hangi tarihte bitti
- neden yenilenemedi
- hangi fallback uygulandı
- reload komutu ve sonucu
- kalıcı düzeltme ne olacak

## 10. Kalıcı Düzeltme

Olay kapandıktan sonra şu işleri tamamlayın:

- `certbot renew --dry-run` çıktısını düzeltin
- `certbot.timer` durumunu doğrulayın
- DNS ve firewall check-list ekleyin
- expiry alarmını 30 gün öncesine çekin

## 11. İlgili Dokümanlar

- [TLS (Let's Encrypt)](../how-to/tls.md)
- [TLS Yenileme Sorunu](tls-renewal.md)
