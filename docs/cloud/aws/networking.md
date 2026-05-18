# AWS Ağ Mimarisi ve Güvenlik

AWS network tarafında doğru model kurulmazsa server çalışır gibi görünür ama dışarıdan erişim, güvenlik ve maliyet tarafı sürpriz üretir.

## 1. Basit Ağ Modeli

Küçük production server için tipik akış:

```text
Internet
  -> Internet Gateway
    -> Route Table
      -> Public Subnet
        -> EC2
          -> Security Group
          -> UFW
```

Private servisler için:

```text
Internet
  -> Internet Gateway
    -> Public Subnet
      -> NAT Gateway
        -> Private Subnet
          -> App/DB
```

## 2. VPC, Subnet ve Route Table

### VPC

VPC, AWS içindeki izole ağ alanınızdır. Küçük prod için genelde bir VPC yeterlidir.

### Subnet

Subnet, VPC içindeki ağ bölümüdür.

- Public subnet: internetten erişim alan instance'lar
- Private subnet: doğrudan internetten erişmeyen servisler

### Route Table

Subnet'in internet trafiği ne yapacağını route table belirler.

Public subnet için tipik kural:

- `0.0.0.0/0 -> Internet Gateway`

## 3. Internet Gateway

Internet Gateway olmadan public subnet public değildir.

Kontrol etmeniz gereken şey:

- IGW VPC'ye bağlı mı?
- Route table içinde default route IGW'ye gidiyor mu?

## 4. Security Group ve NACL

### Security Group

- Instance seviyesinde çalışır
- Stateful'dur
- Küçük prod için ana firewall katmanıdır

### NACL

- Subnet seviyesinde çalışır
- Stateless'tır
- Daha kaba ve kuralları daha mekaniktir

### Ne kullanmalı?

Pratik öneri:

- Günlük erişim kontrolü için Security Group
- Subnet çapında ek sınır gerekiyorsa NACL

### Fark Tablosu

| Özellik | Security Group | NACL |
| :------ | :------------- | :--- |
| Seviye | Instance | Subnet |
| Davranış | Stateful | Stateless |
| Varsayılan | Deny | Allow/Rule bazlı |
| Kullanım | Ana güvenlik | Ek network kontrolü |

## 5. SSH, HTTP ve HTTPS Kuralları

Küçük prod için inbound örneği:

| Port | Kaynak | Neden |
| :--- | :----- | :---- |
| 22 veya özel SSH portu | Sadece kendi IP'niz | Yönetim erişimi |
| 80 | 0.0.0.0/0 | HTTP -> HTTPS redirect veya public site |
| 443 | 0.0.0.0/0 | TLS web trafiği |

SSH için `0.0.0.0/0` kullanmayın. Mümkünse My IP veya ofis çıkışı gibi dar kaynak bırakın.

## 6. Elastic IP

Elastic IP, sabit public IPv4 adresidir.

### Ne İçin Kullanılır?

- DNS A kaydını sabit tutmak
- Stop/start sonrası IP değişiminden kaçınmak
- Public endpoint'i öngörülebilir hale getirmek

### Dikkat

- Bağlı olmayan EIP maliyet oluşturabilir
- Instance terminate olduğunda EIP boşa düşebilir
- Region dışına taşınmaz

Kontrol:

```bash
aws ec2 describe-addresses --output table
```

## 7. Public vs Private Subnet

### Public Subnet

- Route table içinde IGW default route vardır
- Instance public IP alabilir
- SSH ve web endpoint'leri burada olabilir

### Private Subnet

- Doğrudan internetten erişim yoktur
- NAT veya bastion ile dışarı çıkar
- DB ve iç servisler için daha uygundur

Küçük production server tek instance ise public subnet ile başlayabilirsiniz. DB veya ikinci katman geldiğinde private subnet planlayın.

## 8. Neden SG ve UFW İkisi Birlikte?

AWS katmanı dış firewall'dır. Instance içindeki UFW ikinci güvenlik katmanıdır.

- SG dışarıdan gelen trafiği daha instance'a gelmeden keser
- UFW sunucu içinde son filtre olur
- İkisinin de kuralı dokümante edilmelidir

## 9. CLI ile Ağ Kontrolü

```bash
aws ec2 describe-vpcs --output table
aws ec2 describe-subnets --output table
aws ec2 describe-route-tables --output table
aws ec2 describe-internet-gateways --output table
aws ec2 describe-security-groups --output table
aws ec2 describe-network-acls --output table
```

### İpucu

İki farklı SG arasında kaynak çaprazlama yapıyorsanız hangi instance'ın hangi SG'yi kullandığını net adlandırın.

## 10. Küçük Prod İçin Önerilen Kural Seti

- SSH sadece sizin IP'nizden
- HTTP/HTTPS public
- DB public değil
- ICMP gerekiyorsa bilinçli açık
- Outbound genelde açık bırakılır
- SG rule'ları tag'lenirse bakım kolaylaşır

## 11. Sık Hatalar

- Route table'da IGW olmasına rağmen subnet association unutmak
- SG'de port açık, instance içinde servis kapalı
- NACL yüzünden 80 açılıp response paketinin dönmemesi
- Public IP ile çalışıp Elastic IP bağlamamak
- Private subnet'teki instance için NAT olmadan update beklemek

## 12. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| VPC listesi | `aws ec2 describe-vpcs --output table` | VPC görünmeli |
| Subnet listesi | `aws ec2 describe-subnets --output table` | Public subnet görünmeli |
| Route table | `aws ec2 describe-route-tables --output table` | Default route IGW'ye dönmeli |
| IGW bağlı mı | `aws ec2 describe-internet-gateways --output table` | IGW VPC'ye bağlı görünmeli |
| Security Group | `aws ec2 describe-security-groups --output table` | Beklenen inbound kurallar görünmeli |
| NACL | `aws ec2 describe-network-acls --output table` | Subnet NACL'i görünmeli |
| Elastic IP | `aws ec2 describe-addresses --output table` | EIP association görünmeli |
| Instance içinde portlar | `sudo ss -tulpn` | Beklenen servisler görünmeli |

## 13. Sonraki Adımlar

- [AWS Concepts](concepts.md)
- [AWS EC2](ec2.md)
- [AWS Storage](storage.md)
