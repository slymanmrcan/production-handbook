# Docker Gateway Mimarisi 🛡️

Bu bölüm, güvenlik duvarını (UFW) delmeden ve portları dış dünyaya saçmadan Docker konteynerlerinin nasıl yönetileceğini anlatır.

## Sorun: "Port 3434 Açtım, Hacklendim"

Docker, ağ kurallarını yönetmek için `iptables` ile doğrudan konuşur. Siz UFW ile "her şeyi kapat" deseniz bile, `docker-compose.yml` dosyasında şu satırı yazdığınız an o port tüm dünyaya açılır:

```yaml
ports:
  - "3000:3000" # ❌ TEHLİKELİ: UFW'yi bypass eder ve tüm dünyaya açılır!
```

## Çözüm: Gateway (Kapı) Modeli

Tüm trafiği tek bir güvenli kapıdan (Port 80/443) içeri alıp, içeride dağıtma yöntemidir.

### 🔥 Kritik Eksikler ve Çözümleri

Aşağıdaki 3 kuralı uygulamadan Docker sunucusu kurmayın.

#### 1. NPM Admin Paneli (Port 81) Dünyaya Kapatılmalı!

Nginx Proxy Manager kurarken Port 81'i (Admin) dışarı açmak büyük risktir.

**Yanlış:**

```yaml
ports:
  - "81:81" # ❌ Admin paneli 0.0.0.0 üzerinden dünyaya açık!
```

**Doğru:**
Admin paneline sadece sunucu içinden (localhost) erişilmeli. Erişmek için SSH Tunnel kullanın.

```yaml
ports:
  - "127.0.0.1:81:81" # ✅ Sadece localhost erişebilir
```

**Nasıl Erişirim? (SSH Tunnel)**
Bilgisayarınızdan terminali açın:

```bash
ssh -L 81:localhost:81 user@sunucu-ip
```

Tarayıcınızda: `http://localhost:81`

#### 2. Localhost Binding (NPM Kullanmayanlar İçin)

Eğer NPM kullanmıyorsanız, portu sadece sunucu içinden erişilebilir yapın ve Nginx'i buna göre ayarlayın.

```yaml
ports:
  - "127.0.0.1:3000:3000" # ✅ Sadece sunucu içinden erişilebilir
```

#### 3. Docker'ın UFW'yi Bypass Etmesini Engelleme

Docker'ın güvenlik duvarınızı delmesini kökten çözmek için `/etc/docker/daemon.json` dosyasına şunu ekleyin:

```json
{
  "iptables": false
}
```

Ardından `sudo systemctl restart docker`.

> ⚠️ **Dikkat:** Bu ayar sonrası container'lar internete çıkamayabilir. Gelişmiş kullanıcılar içindir.

---

## 🏗️ Tam Örnek: NPM + App + Database

Aşağıdaki örnekte:

1.  **NPM:** Dışarıya tek çıkış noktası. Admin paneli güvenli.
2.  **App:** Dışarıya kapalı, sadece NPM ve DB ile konuşur.
3.  **DB:** Dışarıya kapalı, sadece App ile konuşur.

`docker-compose.yml`:

```yaml
version: "3.8"

services:
  # 1. Nginx Proxy Manager (Gateway)
  npm:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80" # HTTP (Açık)
      - "443:443" # HTTPS (Açık)
      - "127.0.0.1:81:81" # Admin (Sadece Localhost)
    volumes:
      - npm_data:/data
      - npm_ssl:/etc/letsencrypt
    networks:
      - frontend # App ile konuşacak
      # Database ağına bağlanmasına gerek YOK

  # 2. Uygulama (Port YOK)
  app:
    image: node:18-alpine
    restart: unless-stopped
    expose:
      - "3000" # Port mapping yok, sadece expose
    networks:
      - frontend # NPM ile konuşur
      - backend # DB ile konuşur
    environment:
      DATABASE_URL: postgres://user:secret@db:5432/mydb

  # 3. Veritabanı (İzole)
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    expose:
      - "5432"
    networks:
      - backend # Sadece App ile konuşur. NPM burayı görmez.
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_pass
    secrets:
      - db_pass

networks:
  frontend:
    driver: bridge # NPM <-> App
  backend:
    driver: bridge # App <-> DB
    internal: true # 🔒 İnternete çıkış YOK (Güvenli)

volumes:
  npm_data:
  npm_ssl:
  db_data:

secrets:
  db_pass:
    file: ./secrets/db_password.txt
```

---

## 🌐 Farklı `docker-compose.yml` Dosyaları (External Network)

NPM ana klasörde, uygulamanız başka klasörde ise birbirlerini nasıl bulurlar? **External Network** ile.

1.  **Network'ü elle oluşturun:**

    ```bash
    docker network create gateway-net
    ```

2.  **NPM Compose:**

    ```yaml
    services:
      npm:
        networks:
          - gateway-net
    networks:
      gateway-net:
        external: true # Var olanı kullan
    ```

3.  **App Compose:**
    `yaml
    services:
      app:
        networks:
          - gateway-net
    networks:
      gateway-net:
        external: true # Var olanı kullan
    `
    Artık NPM üzerinden `http://app:3000` şeklinde erişebilirsiniz.

---

## ✅ Doğrulama: Portlar Gerçekten Kapalı mı?

Kurulumu yaptınız, peki güvenli mi? Test edin.

```bash
# 1. Dışarıdan port taraması (Kendi bilgisayarınızdan)
nmap -p 81,3000,5432 sunucu-ip
# Beklenen: "filtered" veya "closed"

# 2. Sunucu içinden kontrol
sudo netstat -tlnp | grep docker
# 81 ve 3000 portları "127.0.0.1" IP'sine mi bağlı? (0.0.0.0 OLMAMALI)

# 3. Network İzolasyon Testi
docker exec -it npm ping db
# Beklenen: "bad address" veya timeout (NPM, DB'ye erişememeli!)
```

## 🔒 SSL Sertifikası (Let's Encrypt)

NPM arayüzünden (localhost:81) kolayca SSL alabilirsiniz:

1.  **Proxy Host** eklerken **SSL** sekmesine gidin.
2.  **Request a new SSL Certificate** seçin.
3.  **Force SSL** ve **HTTP/2** aktif edin.
4.  Domain'in sunucu IP'sine yönlendiğinden emin olun.
