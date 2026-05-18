# Google Compute Engine

Compute Engine, Google Cloud üzerinde klasik Linux VM kurulumunun ana servisidir. Bu sayfa küçük production sunucuları için pratik bir başlangıç verir.

## 1. Instance Planlama

Kurulumdan önce şu kararları verin:

- machine type
- zone
- boot disk boyutu
- public veya private networking
- SSH erişim modeli

Öneri:

- düşük trafik host için küçük bir machine type
- production için SSD tabanlı boot disk
- kritik servisler için reserved static IP

## 2. Instance Oluşturma

Örnek komut:

```bash
gcloud compute instances create app-01 \
  --zone europe-west1-b \
  --machine-type e2-medium \
  --image-family debian-12 \
  --image-project debian-cloud \
  --boot-disk-size 30GB \
  --tags app-server
```

Ubuntu isterseniz image project farklıdır, ama mantık aynıdır.

## 3. SSH ile İlk Giriş

```bash
gcloud compute ssh app-01 --zone europe-west1-b
```

Bu akışın düzgün çalışması için:

- firewall SSH portunu açmış olmalı
- OS firewall SSH'ı engellememeli
- metadata / SSH key akışı uygun olmalı

İlk girişte yapmanız gerekenler:

1. `hostnamectl`
2. `timedatectl`
3. `locale`
4. `apt update && apt full-upgrade -y`
5. non-root sudo user doğrulaması

## 4. Uygulama Servisi İçin Temel Host Hazırlığı

Instance açıldıktan sonra tipik host hazırlığı:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ufw curl git
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 5. Metadata ve Startup Script

Basit bootstrap için startup script kullanabilirsiniz.

```bash
gcloud compute instances add-metadata app-01 \
  --zone europe-west1-b \
  --metadata-from-file startup-script=./startup.sh
```

Başlangıç scripti şunları yapabilir:

- package update
- logging agent setup
- host timezone/locale
- app user yaratma

## 6. Stop / Start / Reboot

```bash
gcloud compute instances stop app-01 --zone europe-west1-b
gcloud compute instances start app-01 --zone europe-west1-b
gcloud compute instances reset app-01 --zone europe-west1-b
```

`reset` daha serttir; kısa bir reboot gibi düşünün.

## 7. Serial Console ve Troubleshooting

SSH bozulursa serial console devreye girer.

```bash
gcloud compute instances get-serial-port-output app-01 --zone europe-west1-b
```

Bu çıktı:

- boot hataları
- network init problemleri
- disk mount sorunları
- cloud-init hataları

gibi durumlarda değerlidir.

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Instance oluştu mu | `gcloud compute instances list` | `app-01` görünmeli |
| SSH çalışıyor mu | `gcloud compute ssh app-01 --zone europe-west1-b` | Giriş yapılabilmeli |
| Restart mümkün mü | `gcloud compute instances reset app-01 --zone europe-west1-b` | Instance yeniden ayağa kalkmalı |
| Host kontrolü | `hostnamectl` | Beklenen hostname görünmeli |
| Cloud-init logu | `cloud-init status --long` | `done` veya beklenen state görünmeli |

