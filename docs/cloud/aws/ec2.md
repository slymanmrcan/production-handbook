# AWS EC2: Linux Sunucu Kurulumu

EC2, AWS üzerinde Linux sunucu çalıştırdığınız katmandır. Küçük production ortamda doğru kararlar baştan verilmezse sonradan ağ, disk ve maliyet tarafı büyür.

## 0. Başlangıç Varsayımları

Bu rehber şu modeli baz alır:

- Ubuntu LTS çalışan tek bir EC2 instance
- Public subnet içinde public erişim
- SSH key tabanlı giriş
- IAM instance role varsa role kullanımı
- EBS gp3 root volume
- Gerekirse Elastic IP ile sabit endpoint
- İlk boot'ta user data ile hafif hazırlık

## 1. Launch Öncesi Kararlar

### AMI Seçimi

Genel öneri:

- Ubuntu Server 24.04 LTS
- Gerekirse 22.04 LTS

Neden:

- Uzun destek
- Dokümantasyon bol
- Paket uyumluluğu iyi

### Instance Type

Küçük prod için tipik başlangıç:

- `t3.micro` / `t3.small`
- CPU burst ihtiyacına göre `t3a` da değerlendirilir

Uygulamanız hafifse gereksiz büyük instance açmayın. CPU credit davranışını mutlaka izleyin.

### Key Pair

Ed25519 veya RSA key pair oluşturun. Private key'i lokalinizde saklayın.

```bash
chmod 400 aws-prod.pem
ssh -i aws-prod.pem ubuntu@<public-ip>
```

### IAM Role

Sunucu içeriden AWS servisine erişecekse instance profile role verin:

- S3 yedek yükleme
- CloudWatch log gönderme
- Systems Manager erişimi

Access key'i instance içine yazmayın.

### Metadata Options

Mümkünse IMDSv2 zorunlu yapın. Bu, metadata servisinin güvenli kullanımını artırır.

## 2. Launch Instance Ayarları

### Name and Tags

Sadece isim değil, operasyon etiketi kullanın:

- `Name`
- `Env`
- `Role`
- `Owner`

Örnek:

- `prod-web-01`
- `staging-api-01`

### Network Settings

- Doğru VPC seçin
- Public subnet seçin
- Auto-assign public IP açık olabilir ama üretimde sabit endpoint için Elastic IP tercih edin
- Security Group'u bilinçli oluşturun

### Storage

Root volume için öneri:

- `gp3`
- Encryption açık
- İhtiyaca göre 20-30 GB

Data disk ayrı olacaksa root volume'u aşırı büyütmeyin.

### User Data

İlk boot'ta hafif hazırlık için user data kullanılabilir:

```bash
#!/bin/bash
set -euo pipefail
apt update
apt full-upgrade -y
apt install -y fail2ban ufw curl git
```

Kritik sır:

- önce güvenli bir boot
- sonra uygulama deploy
- sonra trafik açma

## 3. İlk Giriş Sonrası Yapılacaklar

Instance ayağa kalkınca kontrol listesi:

```bash
ssh -i aws-prod.pem ubuntu@<public-ip>
hostnamectl
lsblk
cloud-init status --long
sudo ss -tulpn
```

Önerilen ilk işler:

1. `deployer` user oluştur
2. root SSH ve password auth kapat
3. `ufw` ile yalnızca gereken portları bırak
4. `fail2ban` kur
5. Docker gerekiyorsa ayrı kurulum yap
6. Gerekli data diskleri bağla

## 4. Root Volume ve Delete on Termination

Küçük prod'da en sık hata:

- root volume'deki veriyi kalıcı sanmak
- `Delete on termination` davranışını okumamak

Pratik kural:

- OS root volume'u çoğu zaman instance ile birlikte silinebilir
- Uygulama verisi için ayrı EBS volume kullanın
- Veriyi silinmeyecek disklerde tutun

## 5. Elastic IP ile Endpoint Sabitleme

Public IP stop/start sırasında değişebilir. Production DNS kaydı sabit kalacaksa Elastic IP kullanın.

### Model

- DNS `A` kaydı -> Elastic IP
- Elastic IP -> EC2 instance

### Kontrol

```bash
aws ec2 describe-addresses --output table
```

## 6. EC2 Sonrası Güvenlik Baseline

### Security Group

- SSH: sadece kendi IP'niz
- HTTP/HTTPS: gerekiyorsa açık
- DB portu: public açmayın

### Instance İçinde

- UFW
- SSH hardening
- non-root deploy user
- automatic updates
- minimum servis

### IMDS Kontrolü

Metadata erişiminin çalıştığını ama gereksiz açık olmadığını doğrulayın:

```bash
TOKEN=$(curl -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 60" -s http://169.254.169.254/latest/api/token)
curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id
```

## 7. Sık Yapılan Hatalar

- Security Group açıp UFW'yi unutmak
- UFW açıp SG'de portu kapalı bırakmak
- Public IP ile production endpoint kurup Elastic IP kullanmamak
- Root volume içine veri yazıp daha sonra backup planı olmadan silmek
- IAM role yerine access key'i instance içine gömmek

## 8. Operasyonel Notlar

- `stop` ve `terminate` aynı şey değildir
- `stop` sonrası public IP değişebilir
- `terminate` root volume'u silebilir
- CPU burst instance'larda credit kullanımını izleyin
- `t3.micro` ile production çalışmak mümkündür ama yük profilini bilin

## 9. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Instance durumu | `aws ec2 describe-instance-status --instance-ids <id> --include-all-instances` | `ok` durumları dönmeli |
| SSH erişimi | `ssh -i aws-prod.pem ubuntu@<public-ip>` | Giriş başarılı olmalı |
| Cloud-init | `cloud-init status --long` | `status: done` görünmeli |
| Disk görünürlüğü | `lsblk` | Root volume ve ek diskler görünmeli |
| Dinleyen servisler | `sudo ss -tulpn` | Beklenen portlar görünmeli |
| Elastic IP | `aws ec2 describe-addresses --output table` | IP instance'a bağlı görünmeli |

## 10. Sonraki Adımlar

- [AWS Concepts](concepts.md)
- [AWS Networking](networking.md)
- [AWS Storage](storage.md)
- [AWS CLI](cli.md)
