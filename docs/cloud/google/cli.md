# gcloud CLI

`gcloud`, Google Cloud kaynaklarını terminalden yönetmek için kullanılan ana araçtır. Server hosting tarafında özellikle tekrar eden işleri ve ince ayarları hızlandırır.

## 1. Kurulum

Linux üzerinde resmi paket deposu veya tarball ile kurulabilir. En pratik yol çoğu Ubuntu/Debian sistemde apt deposudur.

```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates gnupg curl
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
sudo apt update
sudo apt install -y google-cloud-cli
```

Kontrol:

```bash
gcloud --version
```

## 2. İlk Giriş ve Proje Seçimi

```bash
gcloud auth login
gcloud auth list
gcloud config set project <PROJECT_ID>
gcloud config list
```

Beklenen:

- doğru Google hesabı görünmeli
- doğru `project` seçilmeli
- CLI komutları project context ile çalışmalı

## 3. IAM ve Least Privilege

Production host işlerinde geniş yetkili kullanıcı yerine role tabanlı yaklaşım tercih edin.

Önerilen minimum roller:

- Compute Engine instance yönetimi için dar kapsamlı rol
- Network yönetimi için ayrı rol
- Disk/snapshot yönetimi için ayrı rol

Pratikte sık kullanılan yönetim rolleri:

- `roles/compute.instanceAdmin.v1`
- `roles/compute.networkAdmin`
- `roles/compute.storageAdmin`

Bu rollerin her birini rastgele kullanıcıya vermeyin. Gerekirse service account kullanın.

## 4. Faydalı Komutlar

### Mevcut bağlamı göster

```bash
gcloud config list
gcloud auth list
```

### Compute instance listele

```bash
gcloud compute instances list
```

### Region ve zone'ları gör

```bash
gcloud compute zones list
gcloud compute regions list
```

### Firewall rule'ları gör

```bash
gcloud compute firewall-rules list
```

### External IP address'leri gör

```bash
gcloud compute addresses list
```

## 5. SSH Akışı

Google Cloud'da SSH genelde şu yollarla yönetilir:

- `gcloud compute ssh`
- OS Login
- Metadata SSH keys

Basit senaryoda:

```bash
gcloud compute ssh <INSTANCE_NAME> --zone <ZONE>
```

Bu komut:

- anahtarı yönetebilir,
- firewall ve network doğruysa bağlanabilir,
- local SSH key akışını kolaylaştırır.

## 6. Script ve Automation

Tekrar eden komutları shell script'e veya CI job'a alın.

Örnek:

```bash
gcloud compute instances list --format="table(name,status,zone)"
gcloud compute disks list --format="table(name,sizeGb,zone)"
gcloud compute addresses list --format="table(name,address,status,region)"
```

## 7. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| CLI kurulu mu | `gcloud --version` | Sürüm bilgisi görünmeli |
| Auth aktif mi | `gcloud auth list` | Beklenen hesap aktif olmalı |
| Project seçili mi | `gcloud config get-value project` | Doğru project dönmeli |
| Instance listesi | `gcloud compute instances list` | Yetkili kaynaklar listelenmeli |
| Zone listesi | `gcloud compute zones list --filter="region:europe-west1"` | Kullanılabilir zone'lar görünmeli |

## 8. No-Go Durumları

Şu durumlarda devam etmeyin:

- yanlış project seçildiyse
- yetkiler gereğinden genişse
- billing bağlı değilse
- CLI credential dosyaları paylaşılan bir yerde tutuluyorsa

