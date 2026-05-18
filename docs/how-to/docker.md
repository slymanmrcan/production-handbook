# Docker Kurulumu ve Konfigürasyonu

Sunucularımızda uygulamaları izole etmek ve kolay yönetmek için **Docker** ve **Docker Compose** kullanıyoruz.

## 1. Kurulum (Resmi Yöntem - Production Grade) 🏭

Prodüksiyon ortamları için en güvenli ve güncel yöntem, Docker'ın kendi `apt` deposunu kullanmaktır.

### 1.1. Kritik Güvenlik Uyarısı (Firewall) 🛡️

> [!WARNING] > **Docker ve UFW Çatışması:**
> Docker, container'ları dışarı açarken (binding ports) `iptables` kurallarını doğrudan değiştirir ve UFW'yi **BYPASS EDER**.
> Yani `ufw status` çıktısında port kapalı görünse bile, Docker container'ınız tüm dünyaya açık olabilir!
> **Çözüm:** Bu rehberin ilerleyen kısımlarında veya [Firewall Rehberi](../security/firewall.md)'nde bahsedilen `ufw-docker` aracını mutlaka kullanın.

### 1.2. Eski Sürümleri Temizle 🧹

Sistemde kurulu (Ubuntu ile gelen) eski veya çakışan paketler varsa temizleyelim:

```bash
sudo apt remove docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc
# "Package not found" derse sorun yok, devam edin.
```

### 1.3. Docker Deposunu (Repository) Ekleme

1.  Gerekli sertifika araçlarını kurun:

    ```bash
    sudo apt update
    sudo apt install -y ca-certificates curl
    ```

2.  Docker'ın resmi GPG anahtarını indirin ve güvenli klasöre kaydedin:

    ```bash
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    ```

3.  Depoyu kaynak listenize (`sources.list`) ekleyin:

    ```bash
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

4.  Paket listesini güncelleyin:
    ```bash
    sudo apt update
    ```

### 1.4. Docker Engine Kurulumu 📦

Artık en güncel sürümü kurabiliriz:

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

> [!NOTE]
> Eski `docker-compose` (Python tabanlı) yerine artık `docker-compose-plugin` (Go tabanlı, `docker compose` komutu) kullanıyoruz.

### 1.5. Doğrulama (Test) 🧪

Her şeyin doğru kurulduğunu basit bir imaj çalıştırarak görelim:

```bash
sudo docker run hello-world
```

_(Ekrana "Hello from Docker!" yazan bir mesaj geldiyse kurulum başarılıdır.)_

### 1.6. Sudo'suz Kullanım (Opsiyonel ama Önerilen)

Her komutun başına `sudo` yazmak yorucudur. Mevcut kullanıcınızı `docker` grubuna ekleyin:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Artık `sudo` olmadan deneyin:

```bash
docker version
```

## 2. Docker Storage (Kritik)

Varsayılan olarak Docker, tüm imajları ve volume'leri `/var/lib/docker` altında tutar. Bu klasör "Boot Volume" üzerindedir. Eğer bu disk dolarsa sunucu çöker. Eğer sunucu bozulursa verileriniz gider.

Bu yüzden Docker verilerini harici **Block Volume**'e taşımalıyız.

> [!IMPORTANT]
> Önce [Oracle Block Volume](../cloud/oracle/storage.md) rehberindeki adımları tamamlayıp diski `/mnt/blockvolume` altına mount ettiğinizden emin olun.

### Data Root Değiştirme Adımları

1.  **Klasörü Hazırla:**

    ```bash
    # Harici diskte docker için bir klasör aç
    sudo mkdir -p /mnt/blockvolume/docker-data
    ```

2.  **Konfigürasyon Dosyasını Düzenle:**
    `/etc/docker/daemon.json` dosyasını oluşturun veya düzenleyin:

    ```bash
    sudo nano /etc/docker/daemon.json
    ```

    İçeriği şu şekilde olmalıdır:

    ```json
    {
      "data-root": "/mnt/blockvolume/docker-data",
      "log-driver": "json-file",
      "log-opts": {
        "max-size": "10m",
        "max-file": "3"
      }
    }
    ```

    _(Not: Log ayarlarını da ekledik ki loglar diski doldurmasın)_

3.  **Docker'ı Yeniden Başlat:**

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    ```

4.  **Doğrulama:**
    ```bash
    docker info | grep "Docker Root Dir"
    ```
    Çıktıda `/mnt/blockvolume/docker-data` görüyorsanız işlem başarılıdır! 🎉

## 3. Temel Komutlar

```bash
# Arkaplanda çalıştır
docker compose up -d

# Logları izle
docker compose logs -f

# Tüm sistemi temizle (Kullanılmayan imajlar, containerlar)
docker system prune -a
```

## 4. Docker Compose Mantığı (Neden Kullanıyoruz?)

Eğer Docker'ı "elle" (`docker run ...`) kullanıyorsanız, muhtemelen şöyle uzun komutlar yazıyorsunuzdur:

```bash
docker run -d --name web -p 80:80 -v ./html:/usr/share/nginx/html --restart always nginx:alpine
```

Bu yöntem yorucudur ve hataya açıktır. Yarın bu komutu hatırlayabilecek misiniz? Muhtemelen hayır.

### Compose: Sizin "Manifesto"nuzdur 📜

Docker Compose, **"Benim sunucumda ne çalışmalı?"** sorusunun yazılı cevabıdır (`docker-compose.yml`).

> **Analoji:**
>
> - **Docker Run:** Garsona sözlü olarak "Bana hamburger getir, soğansız olsun, yanında kola olsun, buzlu olsun..." demek gibidir.
> - **Docker Compose:** Masaya "Menü"yü bırakıp "Bunu getir" (`docker compose up -d`) demek gibidir. Mutfak ne yapacağını zaten menüden okur.

### Dockerfile vs Docker Compose: Fark Nedir?

Bu ikisi karıştırılır ama görevleri farklıdır:

1.  **Dockerfile (Tarif):** "Bu yemeğin içinde ne var?"
    - _Ubuntu üzerine Python kur, kodlarımı kopyala, kütüphaneleri yükle._
    - Sonuç: Bir **Image (Kalıp)** çıkar.
2.  **Docker Compose (Servis):** "Bu yemek nasıl servis edilecek?"
    - _Oluşan Image'ı al, 80 portunu aç, şu veritabanına bağla, şu diski kullan._
    - Sonuç: Çalışan bir **Container** çıkar.

### Soru: Compose, Dockerfile'ı Nasıl Kullanır? (`image` vs `build`)

Compose dosyasında iki yöntem kullanabilirsiniz:

**Yöntem 1: Hazır Kullan (Image)**
İnternetten (Docker Hub) hazır paket indirir.

```yaml
services:
  web:
    image: nginx:latest # Hazır indir
    ports:
      - "80:80"
```

**Yöntem 2: Kendin Pişir (Build) 👨‍🍳**
Sizin sorduğunuz senaryo budur. `build: .` dediğinizde Compose şunları yapar:

1.  Klasördeki `Dockerfile`'ı okur.
2.  Ondan bir Image oluşturur (Build eder).
3.  Sonra o Image'ı çalıştırır.

```yaml
services:
  api:
    build: . # Buradaki Dockerfile'a bak ve build et!
    ports:
      - "5000:5000"
    volumes:
      - .:/app
```

Böylece `docker build ...` komutuyla uğraşmadan, tek bir `docker compose up -d --build` komutuyla hem kodunuzu derler hem sunucuyu ayağa kaldırırsınız.
