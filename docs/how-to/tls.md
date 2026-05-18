# TLS (Let's Encrypt)

Bu rehber, Nginx arkasındaki Linux sunucuda Let's Encrypt sertifikası kurmayı, yenilemeyi ve doğrulamayı anlatır. TLS sadece sertifika almak değildir; DNS, firewall, Nginx ve renewal döngüsünün birlikte çalışması gerekir.

## 1. Ön Koşullar

- DNS kaydı sunucunun public IP'sine dönmeli
- 80 ve 443 portları erişilebilir olmalı
- Nginx çalışıyor olmalı
- `server_name` doğru olmalı

Reverse proxy kurulumu için:

- [Reverse Proxy](reverse-proxy.md)

## 2. Kurulum

Ubuntu/Debian üzerinde Nginx plugin ile kurulum:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

Sertifika alma:

```bash
sudo certbot --nginx --redirect -d example.com -d www.example.com
```

`--redirect` HTTP'den HTTPS'ye kalıcı yönlendirme ekler. Eğer yönlendirmeyi manuel yönetmek istiyorsanız bu flag'i kullanmayın.

Wildcard gerekiyorsa farklı yol gerekir:

- HTTP challenge wildcard vermez
- DNS challenge gerekir

## 3. Sertifika Dosyaları

Certbot sonrası tipik yollar:

- `/etc/letsencrypt/live/example.com/fullchain.pem`
- `/etc/letsencrypt/live/example.com/privkey.pem`

Nginx config bu dosyaları kullanmalıdır.

## 4. Nginx ile TLS Akışı

Certbot Nginx konfigürasyonunu otomatik günceller. Hedef akış şu olmalıdır:

1. DNS doğru IP'ye dönsün
2. Nginx 80 portunda cevap versin
3. Certbot sertifikayı alsın
4. 80 trafiği 443'e yönlensin
5. 443 üzerinden uygulama çalışsın

## 5. Otomatik Yenileme

Certbot genelde timer ile gelir:

```bash
systemctl status certbot.timer
systemctl list-timers | grep certbot
```

Renewal test:

```bash
sudo certbot renew --dry-run
```

Gerçek sertifikaları elle yenilemek yerine dry-run başarısını düzenli kontrol edin.

## 6. Doğrulama

Sertifikanın geçerlilik tarihlerini kontrol edin:

```bash
sudo certbot certificates
sudo openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -dates
```

HTTP'den HTTPS yönlendirmesini doğrulayın:

```bash
curl -I http://example.com
curl -I https://example.com
```

Beklenen:

- HTTP 301/308 ile HTTPS'ye gitmeli
- HTTPS 200 veya uygulama beklenen yanıtı dönmeli

Ek TLS kontrolü:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

## 7. Sık Görülen Hatalar

### DNS yanlış IP'ye gidiyor

`certbot` HTTP challenge aşamasında başarısız olur. Önce DNS kaydını düzeltin.

### Port 80 kapalı

Firewall, cloud security group veya Nginx dinleme ayarı kontrol edilir.

### `server_name` yanlış

Nginx konfigürasyonundaki domain adı ile sertifika alma sırasında kullanılan domain aynı olmalı.

### Nginx config bozuk

Certbot yeni config yazarken Nginx testten geçemezse işlem başarısız olur.

Kontrol:

```bash
sudo nginx -t
sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log
```

### Rate limit

Sık deneme yapmayın. Özellikle aynı hatalı domain ile tekrar tekrar sertifika denemek rate limit tetikleyebilir.

## 8. Runbook Bağlantısı

Sertifika yenileme sorunlarında detaylı müdahale için:

- [TLS Yenileme Sorunu](../runbooks/tls-renewal.md)

Bu iki belge birlikte kullanılmalı:

- bu sayfa kurulum ve normal işletim içindir
- runbook hata anındaki müdahale içindir

## 9. Operasyon Notları

- Sertifika süresini sadece dashboard ile değil timer ile de takip edin
- Proaktif alarmınız varsa 30 gün kala uyarı üretin
- Tek host üzerinde birden fazla domain varsa SAN kaydı olarak yönetin
- wildcard gerekiyorsa DNS challenge planlayın

## 10. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Certbot kurulu mu | `certbot --version` | Versiyon dönmeli |
| Timer aktif mi | `systemctl status certbot.timer` | `active (waiting)` olmalı |
| Dry-run geçiyor mu | `sudo certbot renew --dry-run` | Hata vermemeli |
| Sertifika mevcut mu | `sudo certbot certificates` | Domain listelenmeli |
| HTTPS çalışıyor mu | `curl -I https://example.com` | 200/301 beklenen yanıt dönmeli |
| Nginx config temiz mi | `sudo nginx -t` | `syntax is ok` ve `test is successful` olmalı |
| Tarihler doğru mu | `sudo openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -dates` | `notAfter` gelecekte olmalı |

## 11. Kurulumdan Sonra Ne Yapılır?

1. Timer'ı bırakın.
2. 30 gün kala alarm ekleyin.
3. `certbot renew --dry-run` çıktısını periyodik kontrol edin.
4. Yenileme bozulursa [runbook](../runbooks/tls-renewal.md) ile müdahale edin.
