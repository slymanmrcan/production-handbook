# TLS Yenileme Sorunu

Bu runbook, Let’s Encrypt / certbot yenilemesi bozulduğunda veya otomatik yenileme beklenmedik şekilde başarısız olduğunda uygulanır.

## Etki

- Sertifika süresi dolmaya yaklaşıyor olabilir.
- `certbot renew` veya `certbot renew --dry-run` başarısız olabilir.
- Nginx veya Apache reload sonrası hizmet veremeyebilir.
- Browser warning, HSTS hatası veya handshake problemi oluşabilir.

## Hızlı Karar

| Durum | Karar |
| :---- | :---- |
| Sertifika 30 günden fazla geçerliyse | Triage et, hemen panik yapma |
| Sertifika 7 günden az kaldıysa | Öncelik ver, containment uygula |
| Otomatik yenileme başarısız ve üretim etkilense | Manual retry + reload kontrolü |
| DNS / firewall / webserver config kırık ise | Önce root cause, sonra certbot |

## 1. Etkilenen Kapsamı Belirle

İlgili domainleri ve host'u not edin:

```bash
hostname
date
sudo certbot certificates
```

Sertifika süresini kontrol edin:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer
```

Beklenen:

- `notAfter` tarihi gelecekte olmalı
- `subject` ve `issuer` beklenen domain/CA ile eşleşmeli

## 2. İlk Containment

Yenileme nedenini bulana kadar değişkenleri küçültün:

- Yeni deploy yapmayın.
- Nginx/Apache config değişikliği yapmayın.
- DNS kaydını değiştirmeyin.
- Certbot logunu ve mevcut sertifika yolunu sabitleyin.

Log toplayın:

```bash
sudo tail -n 100 /var/log/letsencrypt/letsencrypt.log
sudo journalctl -u certbot --since "24 hours ago" --no-pager
```

## 3. Ön Kontroller

### Timer aktif mi?

```bash
systemctl status certbot.timer
systemctl list-timers | grep certbot
```

Beklenen:

- `active (waiting)` olmalı
- Son çalışma zamanı mantıklı olmalı

### Port 80 erişilebilir mi?

HTTP-01 challenge için gerekli olabilir:

```bash
ss -tlnp | grep -E ':(80|443)\s'
ufw status verbose
```

Cloud firewall veya security group varsa onları da kontrol edin.

### DNS doğru IP'ye mi gidiyor?

```bash
dig +short example.com
dig +short www.example.com
curl -I http://example.com
```

Beklenen:

- DNS public IP'yi göstermeli
- `http://example.com` doğru host'a gitmeli

### Nginx / Apache config sağlam mı?

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

## 4. Yenileme Akışı

### Dry-run ile test et

Önce staging senaryosunu simüle edin:

```bash
sudo certbot renew --dry-run
```

Dry-run başarısızsa hata sınıfını ayırın:

- DNS yanlış
- Port 80 kapalı
- Web server config bozuk
- Challenge path erişilemiyor
- Rate limit / temporary failure

### Gerçek yenileme

```bash
sudo certbot renew
```

Birden fazla sertifika varsa sadece sorunlu olanı yenilemeyi deneyebilirsiniz:

```bash
sudo certbot renew --cert-name example.com
```

### Reload concern

Certbot sertifikayı yenilese bile servis reload etmezse yeni sertifika devreye girmez.

Nginx:

```bash
sudo systemctl reload nginx
sudo nginx -t
```

Apache:

```bash
sudo systemctl reload apache2
sudo apache2ctl configtest
```

Reload sonrası servis kapanıyorsa `restart` yerine `reload` kullanıp config problemi var mı bakın. Eğer config yeni sertifika yolunu yanlış referanslıyorsa reload yerine önce düzeltin.

## 5. Manuel Fallback

### A. Geçerli sertifika yedeği varsa

Önce `archive` veya backup altındaki son geçerli sertifikayı kontrol edin:

```bash
sudo ls -l /etc/letsencrypt/live/example.com/
sudo ls -l /etc/letsencrypt/archive/example.com/
```

Gerekirse son geçerli sürümü geri bağlayın. Hedef dosyalar genelde şunlardır:

- `fullchain.pem`
- `privkey.pem`

Bu dosyaları elle değiştirmek yerine symlink yapısını bozmayın. Sorun varsa daha güvenli yol yeni sertifika almaktır.

### B. Yeni certbot çalışmıyorsa ama internete açık DNS var

HTTP-01 geçmiyorsa DNS-01'e geçiş planlayın. Bu, özellikle wildcard gerekiyorsa doğru yoldur.

### C. Public site yerine geçici internal erişim gerekiyorsa

Sadece servis içi veya operasyon erişimi için geçici self-signed sertifika kullanabilirsiniz. Bu, public kullanıcı için final çözüm değildir.

```bash
sudo openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /etc/ssl/private/temp.key \
  -out /etc/ssl/certs/temp.crt \
  -days 7 \
  -subj "/CN=example.com"
```

Sonra Nginx/Apache'yi geçici olarak bu dosyalara yönlendirin ve asıl sertifika tekrar alınana kadar düşük riskli erişim sağlayın.

## 6. Sık Kırılan Noktalar

### DNS yanlış IP

```bash
dig +short example.com
```

### 80 portu kapalı

```bash
ufw status verbose
ss -tlnp | grep ':80 '
```

### `server_name` yanlış

Nginx:

```bash
grep -R "server_name" /etc/nginx/sites-enabled /etc/nginx/conf.d
```

### Nginx config bozuk

```bash
sudo nginx -t
sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log
```

### Certbot timer çalışmıyor

```bash
systemctl status certbot.timer
systemctl enable --now certbot.timer
```

## 7. Escalation Criteria

Aşağıdakilerden biri varsa escalation açın:

- Sertifika 24 saatten az sürede bitecek ve renewal başarısız
- DNS değişikliği sizde değilse ve domain owner erişimi gerekiyorsa
- Firewall / load balancer / WAF katmanı port 80 erişimini engelliyorsa
- Reload sonrası Nginx/Apache çökmeye başladıysa
- Hangi sertifikanın hangi vhost'a bağlı olduğu belirsizse

## 8. Doğrulama

Yenileme sonrası şunlar doğrulanmalı:

```bash
sudo certbot certificates
sudo openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -dates -subject -issuer
curl -I http://example.com
curl -I https://example.com
```

Beklenen:

- `notAfter` gelecekte olmalı
- HTTP 301/308 ile HTTPS'ye gitmeli
- HTTPS beklenen yanıtı dönmeli

Ek kontrol:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

## 9. Kanıt Topla

Olay kaydına şu bilgileri ekleyin:

- etkilenen domain
- sertifika expiry zamanı
- certbot hata özeti
- DNS durumu
- reload komutu ve sonucu
- manuel fallback yapıldıysa ne yapıldığı

## 10. İlgili Dokümanlar

- [TLS (Let's Encrypt)](../how-to/tls.md)
- [Sertifika Suresi Doldu](cert-expired.md)
