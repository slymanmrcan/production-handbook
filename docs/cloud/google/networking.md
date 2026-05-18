# Google Cloud Networking

Google Cloud networking modelinde temel kurallar nettir:

- VPC globaldir
- subnet bölgeseldir
- firewall rule instance'a değil network'e uygulanır
- external IP kalıcı olarak reserve edilebilir

Bu bölüm Linux sunucu host etme açısından gerekli minimum ağı anlatır.

## 1. VPC ve Subnet Mantığı

### VPC

VPC, Google Cloud içindeki sanal ağınızın çerçevesidir. Tek VPC içinde farklı region'larda subnet oluşturabilirsiniz.

### Subnet

Subnet bir region'a bağlıdır. Örnek:

- `europe-west1` region
- `europe-west1-b` zone
- `10.10.0.0/24` subnet

Kural:

- VM bir zone'da açılır
- VM o region içindeki subnet'ten IP alır

## 2. Firewall Rule Mantığı

Google Cloud firewall, Linux içindeki UFW'den farklıdır. Bir paket sunucuya ulaşmak için hem cloud firewall hem OS firewall aşamalarını geçebilir.

Önerilen yaklaşım:

- Cloud firewall ile temel girişleri aç
- UFW ile host seviyesinde ikinci katmanı koru

### Örnek ingress rule

SSH, HTTP ve HTTPS için:

- TCP 22 veya özel port
- TCP 80
- TCP 443

`gcloud` ile örnek:

```bash
gcloud compute firewall-rules create allow-ssh-http-https \
  --network default \
  --allow tcp:22,tcp:80,tcp:443 \
  --source-ranges 0.0.0.0/0
```

## 3. Targeting: Tag ve Service Account

Firewall rule'ları tüm network yerine belli VM'lere hedeflemek daha güvenlidir.

İki yöntem vardır:

- network tags
- service accounts

Pratikte basit kurulumlar için tag kullanımı kolaydır:

```bash
gcloud compute firewall-rules create allow-app \
  --network default \
  --allow tcp:80,tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags app-server
```

VM tarafında tag eklemek:

```bash
gcloud compute instances add-tags <INSTANCE_NAME> \
  --zone <ZONE> \
  --tags app-server
```

## 4. Static External IP

Sunucunun public IP'si reboot sonrası değişmesin istiyorsanız reserved address kullanın.

```bash
gcloud compute addresses create app-public-ip --region europe-west1
gcloud compute addresses list
```

Instance'a bağlarken reserve edilmiş address'i atayın veya create sırasında kullanın.

## 5. Route ve Internet Erişimi

Linux host'ta `apt update` çalışmıyorsa sorun her zaman host firewall değildir. Google Cloud tarafında temel kontrol sırası:

1. VPC/subnet doğru mu
2. External IP atanmış mı
3. Firewall rule var mı
4. OS seviyesinde default route ve DNS çalışıyor mu

Instance içinde kontrol:

```bash
ip route
resolvectl status
curl -I https://github.com
ping -c 3 8.8.8.8
```

## 6. Private Instance ve NAT

Public IP vermeden sunucu kullanmak istiyorsanız outbound için Cloud NAT gerekir.

Bu modelde:

- inbound kapalı olur
- outbound kontrollü olur
- bastion veya IAP ile erişim sağlanır

Özellikle database, internal worker ve backup host'lar için uygundur.

## 7. SSH Akışı

Google Cloud tarafında SSH için tipik akış:

- cloud console SSH
- `gcloud compute ssh`
- OS Login

VM tarafında `sshd` ve host firewall yine önemlidir.

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| VPC listesi | `gcloud compute networks list` | Network görünmeli |
| Subnet listesi | `gcloud compute networks subnets list` | Bölgesel subnet görünmeli |
| Firewall rule | `gcloud compute firewall-rules list` | Beklenen ingress rule görünmeli |
| Reserved IP | `gcloud compute addresses list` | `RESERVED` external IP görünmeli |
| Instance tag | `gcloud compute instances describe <INSTANCE_NAME> --zone <ZONE> --format='get(tags.items)'` | Hedef tag görünmeli |
| Host routing | `ip route` | Default route görünmeli |
| DNS | `resolvectl status` | Resolver çalışıyor olmalı |

