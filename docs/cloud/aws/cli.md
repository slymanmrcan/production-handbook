# AWS CLI (Command Line Interface)

AWS Console iyi bir başlangıçtır ama operasyon işi genelde CLI ile yürür. Küçük production server'larda hızlı, tekrar edilebilir ve scriptlenebilir olan araç AWS CLI'dır.

## 0. Güvenlik Varsayımları

Bu rehber şu prensiple çalışır:

- Root hesabı CLI için kullanılmaz
- Günlük kullanım için ayrı IAM user veya IAM Identity Center kullanılır
- Uzun ömürlü key yerine mümkünse kısa ömürlü session/role tercih edilir
- Her hesap için ayrı profile kullanılır

## 1. Kurulum

Ubuntu/Debian üzerinde temel kurulum:

```bash
sudo apt update
sudo apt install -y unzip curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Doğrulama:

```bash
aws --version
command -v aws
```

## 2. Kimlik Doğrulama Yöntemi

### Seçenek A: IAM User + Access Key

Küçük ekiplerde ve kişisel otomasyonda halen kullanılan modeldir. Ama yetkiyi dar tutun.

### Seçenek B: IAM Identity Center / SSO

Kurumsal kullanımda daha doğru tercihtir. Kısa ömürlü oturum sağlar, key sızıntısı riskini azaltır.

### Seçenek C: EC2 Instance Role

Sunucu içinden AWS servisine erişecekseniz en doğru model budur. Access key gömmeyin.

## 3. `aws configure` ile Profil Oluşturma

Birden fazla hesap veya ortam varsa profile isim verin:

```bash
aws configure --profile prod
```

Gireceğiniz alanlar:

- AWS Access Key ID
- AWS Secret Access Key
- Default region name
- Default output format

Örnek:

```bash
aws configure set region eu-central-1 --profile prod
aws configure set output json --profile prod
```

### SSO Kullanıyorsanız

```bash
aws configure sso --profile prod-sso
aws sso login --profile prod-sso
```

## 4. Credential Zinciri

AWS CLI credential ararken sırayla şunlara bakar:

1. Komut içindeki `--profile`
2. Environment variable
3. Shared credentials/config file
4. Instance metadata role

En temiz kullanım:

- Lokal terminalde profile bazlı çalışma
- EC2 içinde role bazlı çalışma

### Kontrol Komutları

```bash
aws configure list
aws configure list-profiles
aws sts get-caller-identity
```

Beklenen:

- Doğru hesap ID'si dönmeli
- Kullanılan profil görünmeli
- Region beklediğiniz region olmalı

## 5. IAM Least Privilege Pratiği

CLI kullanıcınıza her yetkiyi vermeyin. Gereken minimum servisleri açın.

Örnek yaklaşım:

- Sadece EC2 okuma/yazma gerekiyorsa `ec2:*` yerine gereken aksiyonları verin
- S3 yedek yükleme gerekiyorsa sadece ilgili bucket'a yetki verin
- IAM policy'leri role veya gruba bağlayın

### Sunucu İçinden S3 Kullanıyorsanız

EC2 instance profile rolüyle çalıştırın:

```bash
aws sts get-caller-identity
aws s3 ls s3://<bucket-adı>
```

Access key'i dosyaya gömmek yerine role kullandığınızı doğrulayın.

## 6. Faydalı Çıktı Formatları

```bash
aws ec2 describe-instances --output table
aws ec2 describe-volumes --output json
aws ec2 describe-security-groups --output table
```

`--query` kullanarak çıktıyı sadeleştirin:

```bash
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress}' \
  --output table
```

## 7. Sık Kullanılan Komutlar

### Instance Listeleme

```bash
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].{Name:Tags[?Key==`Name`].Value | [0],ID:InstanceId,IP:PublicIpAddress,State:State.Name}' \
  --output table
```

### Security Group Listeleme

```bash
aws ec2 describe-security-groups --output table
```

### Volume Listeleme

```bash
aws ec2 describe-volumes --output table
```

### Snapshot Listeleme

```bash
aws ec2 describe-snapshots --owner-ids self --output table
```

### Elastic IP Listeleme

```bash
aws ec2 describe-addresses --output table
```

## 8. Profil Yönetimi

Farklı ortamlar için ayrı profil kullanın:

```bash
aws configure --profile dev
aws configure --profile prod
aws configure --profile staging
```

Kullanım:

```bash
aws ec2 describe-instances --profile prod --region eu-central-1
```

Profile içinde region sabitlemek iyi pratiktir ama komutta açıkça yazmak da sorunları azaltır.

## 9. Hata Ayıklama

### Kimlik Hatası

```bash
aws sts get-caller-identity --debug
```

### Yanlış Region

```bash
aws configure list
aws ec2 describe-instances --region eu-central-1
```

### Access Key Sorunu

```bash
aws configure list
env | grep ^AWS_
```

## 10. Küçük Prod İçin Operasyon Kuralları

- CLI anahtarlarını paylaşmayın
- Tek profile değil, ortam bazlı profile geçin
- Scriptlerde hardcode region kullanacaksanız bunu bilinçli yapın
- Instance role varsa onu tercih edin
- Günlük iş için root hesabını CLI'ya bağlamayın

## 11. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| CLI kurulu mu | `aws --version` | `aws-cli/2.x` görünmeli |
| Profil var mı | `aws configure list-profiles` | Beklenen profile listelenmeli |
| Kimlik doğru mu | `aws sts get-caller-identity --profile prod` | Beklenen account/principal dönmeli |
| Region doğru mu | `aws configure list --profile prod` | Bölge görünmeli |
| EC2 listeleme | `aws ec2 describe-instances --profile prod --output table` | Instance listesi gelmeli |
| S3 erişimi | `aws s3 ls --profile prod` | Beklenen bucket'lar görünmeli |

## 12. Sonraki Adımlar

- [AWS Concepts](concepts.md)
- [AWS EC2](ec2.md)
- [AWS Networking](networking.md)
- [AWS Storage](storage.md)
