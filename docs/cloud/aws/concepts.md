# AWS Temelleri ve Sunucu Mimarisi

AWS tarafinda küçük bir production server kuracaksaniz önce isimleri degil, yapiyi anlamalısınız. Bu sayfa o temel modeli verir.

## 1. Bu Rehberin Varsayımları

Bu bölüm şu modeli baz alır:

- Tek veya az sayıda Linux sunucu
- Bir public EC2 instance
- Bir veya daha fazla EBS volume
- Güvenlik için Security Group + gerektiğinde NACL
- Sabit endpoint için Elastic IP
- IAM tarafında least privilege

Root hesabı günlük kullanım için değildir. CLI ve konsol erişimi için ayrı IAM user veya mümkünse IAM Identity Center kullanın; EC2 içinde ise erişim rolünü tercih edin.

## 2. AWS Temel Bileşenleri

| Bileşen | Ne İşe Yarar | Küçük Prod İçin Not |
| :------ | :----------- | :------------------ |
| **Account** | Fatura ve kaynak sınırı. | Tek hesapla başlamak mümkündür ama ortamları ayırmak idealdir. |
| **IAM** | Kim ne yapabilir. | Least privilege zorunludur. Root'a access key vermeyin. |
| **Region** | Fiziksel bölge. | Kullanıcıya en yakın ve servislerin bulunduğu bölgeyi seçin. |
| **AZ** | Region içindeki veri merkezi. | EC2 ve EBS aynı AZ'de olmak zorundadır. |
| **VPC** | İzole ağ alanı. | Her şeyin içinde olduğu özel ağ. |
| **Subnet** | VPC içindeki ağ segmenti. | Public subnet internetten erişilen EC2 için kullanılır. |
| **Route Table** | Trafiğin nereye gideceğini söyler. | Public subnet için `0.0.0.0/0 -> IGW` gerekir. |
| **Internet Gateway** | İnternet çıkışı/girişi sağlar. | IGW olmadan public subnet public olmaz. |
| **Security Group** | Instance seviyesinde stateful firewall. | Küçük prod için ana koruma katmanı. |
| **Network ACL** | Subnet seviyesinde stateless firewall. | Özel gereksinim yoksa basit bırakın. |
| **EC2** | Sanal Linux sunucu. | SSH, Nginx, Docker ve uygulama burada çalışır. |
| **EBS** | Kalıcı blok disk. | Uygulama verisi, DB ve loglar için kullanılır. |
| **Elastic IP** | Sabit public IPv4. | Üretimde endpoint stabilitesi için tercih edilir. |

## 3. IAM Least Privilege

En güvenli model şu sıradadır:

1. Root hesabı sadece emergency için sakla.
2. Günlük kullanım için IAM user veya IAM Identity Center kullan.
3. Console ve CLI erişimlerini ayrıştır.
4. EC2 üzerinde AWS erişimi gerekiyorsa access key yerine instance role kullan.

### Root İçin Minimum Kural

- MFA açık olmalı
- Access key olmamalı
- Root sadece hesap yönetimi için kullanılmalı

### IAM User İçin Minimum Kural

- Sadece gerekli servisler için politika verin
- Yetkiyi kullanıcıya doğrudan değil grup/policy üzerinden verin
- CLI kullanıyorsanız ayrı profile tanımlayın

### Instance Role Neden Önemli?

EC2 içinde `aws s3 cp`, `aws logs put-log-events` gibi komutlar gerekiyorsa uzun ömürlü key gömmeyin. Instance profile role verin.

## 4. Region ve AZ Seçimi

Region seçimi sonrası dikkate alınacaklar:

- Trafiğe yakın bölge seçin
- Aynı region içinde birden fazla AZ kullanmak iyi ama küçük tek sunucuda ilk hedef bu değildir
- EC2 ve EBS aynı AZ'de olmalıdır

Küçük bir production server için pratik karar:

- Tek sunucu, tek AZ
- Uygulama kritikse snapshot ve backup ile koruma
- İleride private subnet/NAT yapısına geçiş planı

## 5. Ağ Modeli

Küçük prod için tipik public sunucu modeli:

```text
Internet
  -> Internet Gateway
    -> Public Subnet
      -> EC2
        -> Security Group
        -> UFW / application firewall
```

Private subnet modeli ise:

```text
Internet
  -> Internet Gateway
    -> Public Subnet (bastion / NAT)
      -> Private Subnet
        -> App / DB instances
```

Basit sunucularda çoğu zaman public subnet yeterlidir. DB veya hassas servisler için private subnet planlayın.

## 6. Security Group ve NACL Farkı

| Özellik | Security Group | Network ACL |
| :------ | :------------- | :---------- |
| Seviye | Instance | Subnet |
| Durum | Stateful | Stateless |
| Varsayılan | Her şey kapalı | Rule bazlı |
| Kullanım | Küçük prod için ana kontrol | Ek sınır veya compliance |
| Yönetim | Bir instance'a bağlanır | Bir subnet'e bağlanır |

Pratikte:

- SSH, HTTP, HTTPS ve benzeri erişim kararını SG ile verin
- NACL'i ancak subnet seviyesinde ekstra engel istiyorsanız kullanın
- İki farklı firewall katmanı varsa çakışmayı dokumente edin

## 7. Elastic IP

Elastic IP, AWS tarafında size atanmış sabit public IPv4 adresidir.

### Ne Zaman Kullanılır?

- Production endpoint sabit kalmalıysa
- DNS kaydını IP değişmeden tutmak istiyorsanız
- Instance stop/start sonrası adres değişmesini istemiyorsanız

### Dikkat Edilecekler

- Elastic IP instance'a bağlı değilse ücret doğurabilir
- Instance terminate edilirse EIP boşta kalabilir
- Birden fazla public endpoint yerine tek sabit IP seçmek genelde daha temizdir

### Kullanım Modeli

- DNS A kaydı -> Elastic IP
- Elastic IP -> EC2 instance

## 8. Küçük Prod İçin Önerilen Baseline

| Katman | Öneri |
| :----- | :---- |
| IAM | Root MFA, named IAM user, instance role |
| Network | Public subnet + IGW + SG |
| Endpoint | Elastic IP + DNS |
| Compute | Ubuntu LTS EC2 |
| Disk | gp3 EBS, encryption açık |
| Access | SSH key + `deployer` user |
| Hardening | UFW, fail2ban, minimum inbound ports |

## 9. Sık Hata Noktaları

- Public subnet var sanıp route table'da IGW olmadığını fark etmemek
- SG'de port açıp instance içinde SSH'ın gerçekten o portu dinlediğini kontrol etmemek
- EBS volume'u farklı AZ'de oluşturmaya çalışmak
- IAM key'i root veya paylaşılan hesapta tutmak
- Elastic IP yerine rastgele public IP ile production çalıştırmak

## 10. Verify Matrix

| Kontrol | Komut / Konsol | Beklenen Sonuç |
| :------ | :-------------- | :------------- |
| IAM kimliği | `aws sts get-caller-identity` | Doğru hesap ve principal dönmeli |
| VPC varlığı | `aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output table` | VPC listesi görünmeli |
| Subnet durumu | `aws ec2 describe-subnets --query 'Subnets[*].{SubnetId:SubnetId,AZ:AvailabilityZone,PublicIp:MapPublicIpOnLaunch}' --output table` | Public subnet ayarı görünmeli |
| Route table | `aws ec2 describe-route-tables --query 'RouteTables[*].Routes' --output table` | `0.0.0.0/0 -> igw-...` yolu görünmeli |
| SG kuralları | `aws ec2 describe-security-groups --query 'SecurityGroups[*].IpPermissions' --output table` | Beklenen inbound kurallar görünmeli |
| Elastic IP | `aws ec2 describe-addresses --output table` | EIP adresi ve association görünmeli |
| Instance sağlık | `aws ec2 describe-instance-status --instance-ids <id> --include-all-instances` | `ok` durumları görünmeli |

## 11. Sonraki Adımlar

- [AWS CLI](cli.md)
- [AWS EC2](ec2.md)
- [AWS Ağ Mimarisi](networking.md)
- [AWS EBS](storage.md)
