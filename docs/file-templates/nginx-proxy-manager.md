# Nginx Proxy Manager (Production Ready) 🌐

**Nginx Proxy Manager (NPM)**, SSL sertifikalarını otomatik yöneten (Let's Encrypt) ve web arayüzü (UI) üzerinden host eklemenizi sağlayan popüler bir araçtır.

## ⚖️ Hangi Kurulum Yöntemini Seçmeliyim?

| Seçenek                        | Ne Zaman Kullanılır                   | Avantaj                           | Dezavantaj            |
| :----------------------------- | :------------------------------------ | :-------------------------------- | :-------------------- |
| **🔗 Mevcut Postgres/MariaDB** | Sunucuda zaten DB varsa               | Kaynak tasarrufu, tek DB yönetimi | Network ayarı gerekir |
| **🐬 Yeni MariaDB**            | Sıfırdan kurulum, 2GB+ RAM            | Hızlı, güvenilir                  | Ekstra container      |
| **🐘 Yeni PostgreSQL**         | Postgres ekosistemi tercih ediliyorsa | Modern, güçlü                     | Ekstra container      |
| **🍃 SQLite**                  | Küçük VPS (<512MB RAM)                | Çok hafif, kolay                  | Düşük performans      |

> [!TIP] > **Önerimiz:** Eğer sunucunuzda **zaten çalışan bir Postgres veya MariaDB** varsa, "Mevcut DB'ye Bağlanma" bölümüne geçin. Yeni container kurmaya gerek yok!

---

## 🔗 Seçenek 1: Mevcut Postgres/MariaDB'ye Bağlanma (Önerilen)

Eğer sunucunuzda zaten çalışan bir veritabanı container'ı varsa (örneğin `postgres` veya `mariadb`), NPM için yeni bir DB kurmak yerine mevcut DB'nizi kullanın. Bu hem **RAM tasarrufu** sağlar hem de **yönetimi kolaylaştırır**.

### A. Mevcut PostgreSQL'e Bağlanma

#### Adım 1: Container Bilgilerinizi Kontrol Edin

```bash
# Postgres container'ınızın adını ve network'ünü öğrenin
docker ps | grep postgres
docker inspect <container_adi> | grep -A 10 Networks
```

**Örnek Çıktı:**

```
CONTAINER ID   IMAGE                PORTS                      NAMES
bd35f4d5f95b   postgres:16-alpine   0.0.0.0:15432->5432/tcp   postgres
```

> [!IMPORTANT]
>
> - **Container Adı:** `postgres` (compose dosyasında kullanacağız)
> - **Internal Port:** `5432` (container'lar arası iletişim)
> - **External Port:** `15432` (sadece dışarıdan bağlantı için, NPM'de KULLANMAYACAĞIZ)

#### Adım 2: NPM İçin Database Oluşturun

```bash
# Postgres container'ına bağlanın
docker exec -it postgres psql -U postgres

# NPM için database ve kullanıcı oluşturun
CREATE DATABASE npm_db;
CREATE USER npm_user WITH ENCRYPTED PASSWORD 'GucluSifre123!';
GRANT ALL PRIVILEGES ON DATABASE npm_db TO npm_user;

# Postgres 15+ için ek izin
\c npm_db
GRANT ALL ON SCHEMA public TO npm_user;
\q
```

#### Adım 3: Network'ü Öğrenin

```bash
docker inspect postgres | grep -A 5 '"Networks"'
```

**Örnek Çıktı:**

```json
"Networks": {
    "postgres_default": {
        "IPAddress": "172.18.0.2"
    }
}
```

Network adını not edin (örn: `postgres_default`).

#### Adım 4: NPM Docker Compose Dosyası

`~/npm/docker-compose.yml` oluşturun:

```yaml
version: "3.8"

services:
  app:
    image: "jc21/nginx-proxy-manager:latest"
    container_name: npm_app
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    environment:
      # Mevcut Postgres'e bağlanma
      DB_POSTGRES_HOST: "postgres" # ← Container adınız
      DB_POSTGRES_PORT: 5432 # ← Internal port (15432 DEĞİL!)
      DB_POSTGRES_USER: "npm_user"
      DB_POSTGRES_PASSWORD: "GucluSifre123!"
      DB_POSTGRES_NAME: "npm_db"
      DISABLE_IPV6: "true"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - npm_public
      - postgres_default # ← Postgres'in network'ü (Adım 3'ten)

# Kendi DB container'ımız YOK!

networks:
  npm_public:
    external: true
  postgres_default:
    external: true # ← Postgres'in mevcut network'ü
```

#### Adım 5: Public Network Oluşturun

```bash
docker network create npm_public
```

#### Adım 6: NPM'i Başlatın

```bash
cd ~/npm
docker compose up -d
```

#### Adım 7: Test Edin

```bash
docker logs npm_app -f
```

**Başarılı Çıktı:**

```
[INFO] Database connection established
[INFO] Migrations completed successfully
```

**Hata Alırsanız:**

```bash
# Network bağlantısını test edin
docker exec npm_app ping postgres

# Network'ü kontrol edin
docker network inspect postgres_default
```

---

### B. Mevcut MariaDB'ye Bağlanma

Eğer MariaDB kullanıyorsanız, yukarıdaki adımlar neredeyse aynı:

**Compose Dosyası Farkı:**

```yaml
environment:
  # MariaDB için
  DB_MYSQL_HOST: "mariadb" # ← Container adınız
  DB_MYSQL_PORT: 3306
  DB_MYSQL_USER: "npm_user"
  DB_MYSQL_PASSWORD: "GucluSifre123!"
  DB_MYSQL_NAME: "npm_db"
```

**Database Oluşturma:**

```bash
docker exec -it mariadb mysql -u root -p

CREATE DATABASE npm_db;
CREATE USER 'npm_user'@'%' IDENTIFIED BY 'GucluSifre123!';
GRANT ALL PRIVILEGES ON npm_db.* TO 'npm_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

---

## 🐬 Seçenek 2: Yeni MariaDB Kurulumu

Eğer sunucunuzda en az 2GB RAM varsa bunu kullanın.

`/opt/npm` dizininde şu yapıyı kurun:

```text
npm/
├── docker-compose.yml
├── .env
├── data/                 # NPM Konfigürasyonları
├── letsencrypt/          # SSL Sertifikaları
└── mysql/                # MariaDB Veritabanı Dosyaları
```

> [!WARNING] > **SQLite vs MariaDB:** İnternetteki standart örneklerde `mysql` klasörü veya servisi göremezsiniz çünkü onlar basit SQLite kullanır. Biz prodüksiyon performansı için **MariaDB** kullanıyoruz. Eğer `mysql` klasörü oluşturduysanız aşağıdaki **prodüksiyon** compose dosyasını kullanmalısınız.

---

## 🐳 1. MariaDB Docker Compose

`/opt/npm` dizininde şu yapıyı kurun:

```text
npm/
├── docker-compose.yml
├── .env
├── data/
├── letsencrypt/
└── mysql/  <-- MariaDB kullanacaksanız bu klasör şart!
```

`docker-compose.yml` içeriği:

`docker-compose.yml` içeriği:

```yaml
version: "3.8"

services:
  app:
    image: "jc21/nginx-proxy-manager:latest"
    container_name: npm_app
    restart: always
    ports:
      # HTTP ve HTTPS Portları (Dünyaya Açık)
      - "80:80"
      - "81:81" # Admin UI (DİKKAT: Firewall ile Kısıtlayın!)
      - "443:443"
    environment:
      # MariaDB Bağlantı Bilgileri
      DB_MYSQL_HOST: "db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "npm_password" # .env'den almak daha güvenlidir
      DB_MYSQL_NAME: "npm"
      # IPv6'yı kapat (Bazen sorun çıkarır)
      DISABLE_IPV6: "true"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    depends_on:
      - db
    networks:
      - npm_public # Uygulamalarla konuşacağı ağ
      - npm_internal # Veritabanı ile konuşacağı ağ

  db:
    image: "jc21/mariadb-aria:latest" # NPM için optimize edilmiş imaj
    container_name: npm_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: "npm_root_password"
      MYSQL_DATABASE: "npm"
      MYSQL_USER: "npm"
      MYSQL_PASSWORD: "npm_password"
    volumes:
      - ./mysql:/var/lib/mysql
    networks:
      - npm_internal

networks:
  npm_public:
    external: true # Önceden yaratılmış olmalı ki diğer app'ler bağlansın
  npm_internal:
    internal: true # Dışarıya kapalı
```

---

## 🍃 Seçenek 2: SQLite (Hafif Sürüm)

Eğer ekstra veritabanı container'ı ile uğraşmak istemiyorsanız (veya RAM kısıtlıysa) bunu kullanın.

**Klasör Yapısı:**

```text
npm/
├── docker-compose.yml
├── data/
└── letsencrypt/
# mysql klasörüne gerek yok!
```

**`docker-compose.yml` (SQLite):**

```yaml
version: "3.8"

services:
  app:
    image: "jc21/nginx-proxy-manager:latest"
    container_name: npm_app
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    environment:
      # Veritabanı ayarı YOK (Otomatik SQLite kullanır)
      DISABLE_IPV6: "true"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - npm_public

networks:
  npm_public:
    external: true
```

````

---

## 🐘 Seçenek 3: PostgreSQL (Unified Stack)

Eğer sisteminizdeki diğer uygulamalar zaten PostgreSQL kullanıyorsa, NPM için de Postgres kullanarak tek bir veritabanı teknolojisine odaklanabilirsiniz.

**Klasör Yapısı:**
```text
npm/
├── docker-compose.yml
├── data/
├── letsencrypt/
└── postgres/
````

**`docker-compose.yml` (PostgreSQL):**

```yaml
version: "3.8"

services:
  app:
    image: "jc21/nginx-proxy-manager:latest"
    container_name: npm_app
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    environment:
      # Postgres Bağlantı Bilgileri
      DB_POSTGRES_HOST: "db"
      DB_POSTGRES_PORT: 5432
      DB_POSTGRES_USER: "npm"
      DB_POSTGRES_PASSWORD: "npm_password"
      DB_POSTGRES_NAME: "npm"
      DISABLE_IPV6: "true"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    depends_on:
      - db
    networks:
      - npm_public
      - npm_internal

  db:
    image: postgres:15-alpine
    container_name: npm_db
    restart: always
    environment:
      POSTGRES_USER: "npm"
      POSTGRES_PASSWORD: "npm_password"
      POSTGRES_DB: "npm"
    volumes:
      - ./postgres:/var/lib/postgresql/data
    networks:
      - npm_internal

networks:
  npm_public:
    external: true
  npm_internal:
    internal: true
```

---

## 🔌 Ağ (Network) Yapılandırması 🕸️

Kullanıcı sordu: _"Niye 2 tane network var? Hepsine aynı networkü versek olmaz mı?"_

**Cevap:** Olur ama **güvenli olmaz**. İki farklı ağ kullanmamızın sebebi "Sorumluluk Ayrımıdır":

1.  **`npm_public` (Trafik Polisi Ağı):**
    - Bu ağ "Halka Açık" kapıdır. NPM, ziyaretçileri karşılar ve arkadaki Web Sitesine yönlendirir.
    - Web sitenizi bu ağa bağlamanız şarttır.
2.  **`npm_internal` (Özel Kasa Dairesi):**
    - Bu ağ NPM ile kendi veritabanı (MariaDB) arasındadır.
    - Bunu ayırmazsak, web sitenizdeki bir açıktan sızan hacker, NPM'in veritabanına doğrudan erişebilir. Biz bunu engelliyoruz.

### Nasıl Bağlanır?

1.  Önce genel amacı ağı oluşturun:

NPM'in diğer container'lara (örneğin az önceki Redis veya Postgres UI gibi) ulaşabilmesi için **ortak bir ağa** ihtiyacı vardır.

1.  Önce ağı oluşturun:

    ```bash
    docker network create npm_public
    ```

2.  Kendi uygulamanızı (örneğin bir Web Sitesi) bu ağa dahil edin:

    ```yaml
    # Web Sitesi Compose Dosyası
    services:
      my-website:
        image: nginx
        networks:
          - default
          - npm_public # <-- Buraya dahil oldu

    networks:
      npm_public:
        external: true
    ```

3.  NPM Arayüzü'nde "Forward Hostname / IP" kısmına container adını yazın: `my-website` (Port: 80).

---

## 🔗 Var Olan PostgreSQL'e Bağlanma (Önerilen)

Eğer sunucunuzda zaten çalışan bir PostgreSQL container'ınız varsa (örneğin `production_postgres`), NPM için yeni bir veritabanı container'ı kurmak yerine mevcut Postgres'inizi kullanabilirsiniz. Bu hem kaynak tasarrufu sağlar hem de yönetimi kolaylaştırır.

### Adım 1: NPM İçin Veritabanı Oluşturun

Mevcut Postgres container'ınıza bağlanıp NPM için özel bir database oluşturun:

```bash
# Postgres container'ına bağlan
docker exec -it production_postgres psql -U postgres

# NPM için database ve kullanıcı oluştur
CREATE DATABASE npm_db;
CREATE USER npm_user WITH ENCRYPTED PASSWORD 'GucluBirSifre123!';
GRANT ALL PRIVILEGES ON DATABASE npm_db TO npm_user;

# Postgres 15+ için ek izin gerekebilir
\c npm_db
GRANT ALL ON SCHEMA public TO npm_user;

# Çıkış
\q
```

### Adım 2: Network Bağlantısını Kontrol Edin

NPM ve Postgres'in **aynı Docker network'ünde** olması gerekir. Postgres'inizin hangi network'te olduğunu kontrol edin:

```bash
docker inspect production_postgres | grep -A 10 Networks
```

Çıktı örneği:

```json
"Networks": {
    "backend_net": {
        "IPAddress": "172.18.0.2",
        ...
    }
}
```

Eğer Postgres'iniz `backend_net` gibi özel bir network'teyse, bu network'ü NPM compose dosyasına eklemeniz gerekir.

### Adım 3: NPM Docker Compose Dosyası (Harici DB)

NPM klasörünüzde (`~/npm/`) şu `docker-compose.yml` dosyasını oluşturun:

```yaml
version: "3.8"

services:
  app:
    image: "jc21/nginx-proxy-manager:latest"
    container_name: npm_app
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    environment:
      # Mevcut Postgres'e bağlanma ayarları
      DB_POSTGRES_HOST: "production_postgres" # Container adı
      DB_POSTGRES_PORT: 5432
      DB_POSTGRES_USER: "npm_user"
      DB_POSTGRES_PASSWORD: "GucluBirSifre123!"
      DB_POSTGRES_NAME: "npm_db"
      DISABLE_IPV6: "true"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - npm_public # Dış dünyaya açık (web trafiği için)
      - backend_net # Postgres'in olduğu network

# Kendi DB servisimiz YOK (mevcut Postgres'i kullanıyoruz)

networks:
  npm_public:
    external: true
  backend_net:
    external: true # Postgres'in network'ü
```

### Adım 4: Network'leri Oluşturun (Yoksa)

```bash
# NPM için public network
docker network create npm_public

# Backend network zaten varsa bu adımı atlayın
# Yoksa oluşturun:
docker network create backend_net
```

### Adım 5: Postgres'i Aynı Network'e Ekleyin

Eğer Postgres container'ınız `backend_net`'te değilse, ona bağlayın:

```bash
docker network connect backend_net production_postgres
```

### Adım 6: NPM'i Başlatın

```bash
cd ~/npm
docker compose up -d
```

### Adım 7: Bağlantıyı Test Edin

NPM loglarını kontrol edin:

```bash
docker logs npm_app -f
```

Başarılı bağlantı mesajı:

```text
[INFO] Database connection established
[INFO] Migrations completed successfully
```

Hata alırsanız:

```bash
# Postgres'ten NPM'e erişim var mı?
docker exec npm_app ping production_postgres

# Network bağlantısını kontrol et
docker network inspect backend_net
```

### Önemli Notlar

> [!WARNING] > **Güvenlik:** `DB_POSTGRES_PASSWORD` gibi hassas bilgileri `.env` dosyasında tutun:
>
> ```bash
> # .env dosyası
> POSTGRES_PASSWORD=GucluBirSifre123!
> ```
>
> Sonra compose dosyasında:
>
> ```yaml
> environment:
>   DB_POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
> ```

> [!TIP] > **Yedekleme:** NPM'in veritabanı çok küçüktür (birkaç MB). Postgres yedeklerinize `npm_db` database'ini de dahil etmeyi unutmayın:
>
> ```bash
> docker exec production_postgres pg_dump -U postgres npm_db > npm_backup.sql
> ```

---

## 🛡️ Güvenlik Uyarısı: Port 81

`81` portu NPM'in yönetim panelidir. Varsayılan kullanıcı şifresi: `admin@example.com` / `changeme`.

**Kesinlikle Yapılması Gerekenler:**

1.  İlk girişte şifreyi değiştirin.
2.  Mümkünse `81` portunu **Firewall (UFW)** ile dış dünyaya kapatın, sadece kendi IP'nize veya VPN IP'nize açın.

```bash
# Sadece yönetim IP'sine izin ver
sudo ufw allow form 1.2.3.4 to any port 81
sudo ufw deny 81
```
