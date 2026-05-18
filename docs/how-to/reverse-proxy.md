# Reverse Proxy

Bu rehber, Nginx ile uygulama upstream'ini dış dünyaya güvenli ve kontrol edilebilir şekilde açmayı anlatır. Reverse proxy sadece trafik yönlendirme değil; header, timeout, websocket, body size ve site yaşam döngüsü yönetimidir.

## 1. Neden Reverse Proxy?

- uygulama portunu public internete açmadan servis etmek
- TLS termination yapmak
- gerçek istemci IP bilgisini upstream'e taşımak
- websocket / streaming trafiğini yönetmek
- timeout ve body size limitlerini merkezi hale getirmek

## 2. Ön Koşullar

- Nginx kurulu ve çalışır durumda
- Uygulama lokal portta ya da unix socket'te dinliyor
- DNS kaydı sunucuya dönüyor

Nginx kurulumu için:

- [Nginx](nginx.md)

## 3. Upstream Header Standardı

Upstream uygulamaya en az şu header'lar geçmelidir:

- `Host`
- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`
- gerekiyorsa `X-Request-Id`

Bu header'lar olmadan uygulama log'larında gerçek istemciyi takip etmek zorlaşır.

## 4. Websocket Desteği

Websocket kullanan uygulamalar için `proxy_http_version 1.1`, `Upgrade` ve `Connection` header'ları gerekir. Yukarıdaki örnekte `Connection "upgrade"` kullanıldı; bu çoğu websocket senaryosunda yeterlidir.

Birden fazla upstream için daha seçici davranmak isterseniz `map` tabanlı yaklaşımı Nginx `http` bloğunda kullanabilirsiniz. Site dosyasını basit tutmak istiyorsanız bu rehberdeki sabit değer yeterlidir.

## 5. Site Konfigürasyonu

`/etc/nginx/sites-available/app.conf`:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        send_timeout 30s;

        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:3000/healthz;
        access_log off;
    }
}
```

Notlar:

- `client_max_body_size`, upload yapan uygulamalarda önemlidir.
- `proxy_read_timeout`, uzun süren request'lerde 504 sorunlarını azaltır.
- `proxy_buffering` API ve HTML uygulamalarında genelde açıktır; streaming uygulamalarında ayrıca değerlendirilir.

## 6. Site Enable Flow

Nginx site'i devreye alma adımı:

```bash
sudo ln -s /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo nginx -t
sudo systemctl reload nginx
```

Kapatma:

```bash
sudo rm /etc/nginx/sites-enabled/app.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Reload ve Restart Farkı

- `reload`: config'i yeniden yükler, mevcut bağlantıları mümkün olduğunca kesmez
- `restart`: Nginx prosesini tamamen yeniden başlatır

Genelde önce `nginx -t`, sonra `reload` kullanın. `restart` sadece gerektiğinde kullanılmalıdır.

## 8. 502, 504, 413 Gibi Hatalar

### 502 Bad Gateway

Genelde upstream çalışmıyordur veya yanlış porta gidiyordur.

Kontrol:

```bash
ss -tulpn | grep 3000
systemctl status app --no-pager
tail -n 50 /var/log/nginx/error.log
```

### 504 Gateway Timeout

Upstream yavaş ya da timeout düşük olabilir.

Kontrol:

```bash
curl -I http://127.0.0.1:3000/healthz
```

### 413 Request Entity Too Large

Upload limiti yetersizdir. `client_max_body_size` artırın.

### 403 / Host Mismatch

`server_name` yanlış olabilir veya uygulama farklı host bekliyordur.

## 9. Unix Socket ile Çalıştırma

Bazı uygulamalar port yerine unix socket kullanır:

```nginx
location / {
    proxy_pass http://unix:/run/app/app.sock;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Bu yöntem, aynı host üzerinde çalışan servislerde temiz bir model olabilir.

## 10. Doğrulama

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://example.com
curl -H 'Host: example.com' http://127.0.0.1/
curl -I http://127.0.0.1/healthz
```

Beklenen:

- `nginx -t` başarılı olmalı
- `curl` uygulama cevabını döndürmeli
- `healthz` endpoint'i 200 dönmeli

Ek kontrol:

```bash
sudo nginx -T | sed -n '1,220p'
```

Bu komut aktif Nginx konfigürasyonunu tek parça görmenizi sağlar.

## 11. Güvenlik Notları

- Public internete uygulama portunu açmayın
- `proxy_set_header Host` ve forward header'ları kaybetmeyin
- Gereksiz `server_tokens` kapatılabilir
- Dosya yükleme yapan app'lerde body size ve timeout'ları bilinçli seçin

## 12. İlgili Rehberler

- [TLS (Let's Encrypt)](tls.md)
- [Nginx](nginx.md)
- [TLS Yenileme Sorunu](../runbooks/tls-renewal.md)
