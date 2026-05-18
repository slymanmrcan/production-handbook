# Nginx Kurulumu ve Optimizasyonu

Basit bir kurulumun ötesine geçerek, Nginx'i yüksek trafik ve güvenlik için hazırlayacağız.

## 1. Kurulum (Eksiksiz)

Varsayılan repo bazen eski olabilir, ancak kararlılık (stability) için LTS sürümlerde Ubuntu reposunu tercih ediyoruz.

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

## 2. Production "Altın" Konfigürasyon

Varsayılan `nginx.conf` dosyası genellikle çok tutucudur. Aşağıdaki ayarlar performansı artırır ve sunucu kimliğini gizler.

`/etc/nginx/nginx.conf` dosyasını yedekleyin ve aşağıdaki blokları ekleyin/düzenleyin:

```nginx title="/etc/nginx/nginx.conf"
user www-data;
worker_processes auto; # CPU çekirdek sayısı kadar worker
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 2048; # Varsayılan 768'den yükseltin
    multi_accept on;
}

http {
    ##
    # Temel Ayarlar
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off; # Nginx versiyonunu gizle (Güvenlik)

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # Güvenlik Headerları (Global)
    ##
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    ##
    # Gzip Sıkıştırma (Performans)
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6; # 1-9 arası, 6 ideal denge
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    ##
    # Loglama
    ##
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## 3. Konfigürasyon Doğrulama

Her değişiklikten sonra mutlaka sözdizimi (syntax) kontrolü yapın:

```bash
sudo nginx -t
# Output: syntax is ok, test is successful
```

Hatasız ise yeniden başlatın:

```bash
sudo systemctl reload nginx
```

## Doğrulama Soruları

- [ ] `server_tokens off;` ayarı yapıldı mı? (Curl -I ile versiyon görünmemeli)
- [ ] Gzip aktif mi?
- [ ] Worker process sayısı auto mu?
