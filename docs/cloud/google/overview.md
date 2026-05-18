# Google Cloud Genel Bakış

Google Cloud Platform (GCP), Linux sunucu barındırma ve ağ yönetimi tarafında olgun bir altyapı sağlar. Bu rehber, özellikle küçük ve orta ölçekli production sunucuları için Compute Engine tabanlı yaklaşımı merkeze alır.

## Neden Google Cloud?

- **Compute Engine:** Klasik IaaS modeli ile tam kontrol sağlar.
- **Global VPC:** VPC ağı globaldir; subnet'ler bölgeseldir.
- **Sağlam networking modeli:** Firewall rule, tag ve service account hedefleme mantığı nettir.
- **Persistent Disk:** Diskleri instance'tan bağımsız olarak büyütmek ve snapshot almak kolaydır.
- **Static IP:** Reserved external IP ile kalıcı public address kullanabilirsiniz.

## Google Cloud'da Temel Karar Noktaları

### Project

GCP'de her kaynak bir **project** içine konur. Production için tipik yaklaşım:

- `prod` project
- `staging` project
- `dev` project

Bir project içinde IAM, billing, quota ve resource görünürlüğü birlikte yönetilir.

### Billing

Billing aktif değilse Compute Engine ve ilgili servisler çalışmaz.

Kontrol edilmesi gerekenler:

- Billing account project'e bağlı mı?
- Budget ve alert tanımlı mı?
- Quota limiti sunucu kurulumunu engelliyor mu?

### Region ve Zone

- **Region:** `europe-west1`, `europe-central2` gibi bölgesel alan
- **Zone:** `europe-west1-b` gibi tek bir fiziksel konum

Kural:

- VPC global olabilir
- Subnet bölgesel olur
- VM instance bir zone seçer
- Persistent Disk genelde aynı region içinde yönetilir

## Linux Sunucu İçin Önerilen Başlangıç Modeli

1. Project oluştur
2. Billing bağla
3. IAM'de en az yetkili kullanıcı / service account hazırla
4. VPC ve subnet tasarla
5. Firewall rule oluştur
6. Static external IP reserve et
7. Compute Engine instance aç
8. SSH key ile giriş yap
9. Persistent Disk ve snapshot stratejisini kur

## Hangi Servisler Bu Rehberde Yok?

Bu bölüm deliberately dar tutulur. Managed Kubernetes, Cloud Run veya serverless uygulama modelleri ayrı rehberdir. Buradaki odak:

- Linux VM
- network
- disk
- SSH
- operasyonel doğrulama

## Hızlı Başlangıç

- [GCP CLI](cli.md)
- [GCP Networking](networking.md)
- [GCP Compute Engine](compute.md)
- [GCP Storage](storage.md)

## Verify Matrix

| Kontrol | Komut / Adım | Beklenen Sonuç |
| :------ | :----------- | :------------- |
| Project aktif mi | `gcloud config get-value project` | Doğru project dönmeli |
| Billing bağlı mı | `gcloud beta billing projects describe $(gcloud config get-value project)` | Billing state görünmeli |
| Region seçimi | `gcloud compute zones list --filter="region:europe-west1"` | Kullanılacak zone'lar görünmeli |
| IAM erişimi | `gcloud auth list` | Beklenen hesap aktif olmalı |
| Kaynaklar listeleniyor mu | `gcloud compute instances list` | Yetkiniz olan VM'ler görünmeli |

