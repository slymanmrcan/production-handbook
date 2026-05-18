# Oracle Cloud Network (VCN)

OCI'de sunucunun internete cikmasi veya disaridan erisilebilir olmasi sadece Linux firewall'a bagli degildir. En az uc katman birlikte calisir:

1. OCI network yapisi
2. OCI firewall kurallari
3. Instance uzerindeki Linux firewall

Bu sayfa, bu katmanlarin ne yaptigini ve production icin nasil dusunmeniz gerektigini anlatir.

## 1. Temel Model

Bir instance icin genel akış su sekildedir:

- Instance bir `VCN` icinde calisir.
- Instance bir `Subnet` icine atanir.
- Subnet bir `Route Table` kullanir.
- Public subnet icin `Internet Gateway` gerekir.
- Inbound trafik `Security List` veya `NSG` ile izin alir.
- Instance icinde UFW/firewalld/iptables bir ikinci filtre görevi gorur.

Basit bir kural:

- Route table "paket nereye gidecek?" sorusunu yanitlar.
- Security list / NSG "hangi paket izinli?" sorusunu yanitlar.
- UFW "sunucunun icinde hangi port acik?" sorusunu yanitlar.

## 2. VCN ve Subnet Secimi

### Public subnet

Sunucuya dogrudan SSH ile girecekseniz veya web servisi yayinlayacaksaniz public subnet kullanirsiniz.

Gerekenler:

- Instance'a public IP atanmis olmali
- Subnet route table'da `0.0.0.0/0 -> Internet Gateway` olmali
- Ingress kurallarinda ilgili portlar acik olmali

### Private subnet

Veritabani, queue, internal worker veya sadece bastion arkasinda tutulacak sunucular icin kullanilir.

Gerekenler:

- Public IP olmamali
- Internete cikis gerekiyorsa NAT benzeri bir cikis modeli olusturulmalidir
- Inbound trafik sadece gerekli ic kaynaklardan gelmeli

> [!NOTE]
> Bu repo'da varsayilan pratik model: public subnet uzerinde az sayida entry node, private subnet uzerinde veri ve internal servisler.

## 3. Route Table ve Internet Gateway

Route table, subnet icindeki paketlerin dis ağa nasil cikacagini belirler. En kritik kural:

```text
Destination: 0.0.0.0/0
Target Type: Internet Gateway
```

Bu kural yoksa sunucu `apt update`, `curl`, `docker pull` gibi dis isteklerde sorun yasayabilir.

### Kontrol etmeniz gerekenler

1. Internet Gateway `Available` durumda mi?
2. Route table ilgili subnet'e bagli mi?
3. Route table'da `0.0.0.0/0` kuralı var mi?
4. Instance public subnet'te mi?

Listeleme komutlari:

```bash
oci network internet-gateway list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network route-table list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network route-table get --rt-id "$ROUTE_TABLE_ID"
```

## 4. Security List ve NSG Mantigi

OCI'de iki farkli network policy katmani kullanabilirsiniz:

- `Security List`: Subnet seviyesinde calsir
- `NSG` (Network Security Group): Daha ince hedefleme icin VNIC/instance seviyesinde calsir

Pratik fark:

- Security list bir subnet icindeki tum instance'lari etkiler.
- NSG sadece baglandigi kaynaklari etkiler.

Genel tavsiye:

- Kucuk ve net bir kurulumda security list yeterlidir.
- Aynı subnet icinde farkli roller varsa NSG kullanin.

### Hangi portlar gerekir?

Ornek bir web sunucusu icin minimum set:

| Amaç | Protokol | Port | Not |
| :--- | :--- | :--- | :--- |
| SSH | TCP | 22 veya custom | Sadece yonetim IP'lerine acmak daha iyidir |
| HTTP | TCP | 80 | Reverse proxy veya web server |
| HTTPS | TCP | 443 | TLS sonlandirma |

### Stateless / stateful

Mumkun oldugunda stateful kurallari tercih edin. Stateless kural kullanirsaniz donus trafigi icin ek kural gerekebilir.

### Listeleme komutlari

```bash
oci network security-list list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network security-list get --security-list-id "$SECURITY_LIST_ID"
oci network nsg list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network nsg rules list --nsg-id "$NSG_ID" --all
```

## 5. Reserved Public IP

Reserved Public IP, instance tekrar olusturuldugunda ya da VNIC degistiginde sabit kalan IP modelidir. DNS, firewall allowlist ve dis sistem entegrasyonlari icin daha uygundur.

Dogru dusunme sekli:

- Public IP instance'a degil private IP'ye baglanir.
- Instance yeniden kuruldugunda yeni private IP'ye ayni reserved IP tekrar atanabilir.
- Bu, "kalici endpoint" ihtiyaci icin kullanilir.

### Kullanım modeli

1. Reserved IP olustur.
2. Instance'in VNIC'ine bagli private IP'yi bul.
3. Reserved IP'yi o private IP'ye ata.
4. Gerektiginde baska private IP'ye tasi.

CLI ile goruntuleme:

```bash
oci network public-ip list --compartment-id "$C" --lifetime RESERVED --all
oci network public-ip get --public-ip-id "$PUBLIC_IP_ID"
```

CLI ile olusturma:

```bash
oci network public-ip create \
  --compartment-id "$C" \
  --lifetime RESERVED \
  --display-name prod-web-01-ip
```

Baglama / tasima:

```bash
oci network public-ip update \
  --public-ip-id "$PUBLIC_IP_ID" \
  --private-ip-id "$PRIVATE_IP_ID"
```

## 6. SSH ve Uzak Erisim Prensipleri

SSH erisimi icin uc ayri sey dogru olmali:

- OCI security list / NSG'de SSH portu acik olmali
- Instance uzerinde UFW/iptables izin vermeli
- Dogru key pair ile baglaniyor olmalisiniz

Tavsiye edilen model:

- SSH portunu 22'de tutun
- Gerekirse sadece kendi admin IP'nize izin verin
- Root login kapali olsun
- Non-root sudo kullanicisi ile girin

Kontrol komutlari:

```bash
ip addr
ip route
sudo ufw status verbose
ss -tlnp
```

## 7. Sorun Giderme

### `apt update` / `curl` calismiyor

Kontrol sirası:

1. Route table'da `0.0.0.0/0 -> Internet Gateway` var mi?
2. Instance public subnet'te mi?
3. Security list / NSG outbound kurallari engel mi?
4. DNS calisiyor mu?

Hizli test:

```bash
getent hosts github.com
curl -I https://example.com
```

### SSH baglanmiyor

Kontrol sirası:

1. Reserved/public IP dogru mu?
2. Security list / NSG'de port acik mi?
3. Instance icinde UFW portu acik mi?
4. Yanlis subnet'te misiniz?

### IP degisti

Eger kalici endpoint gerekiyorsa reserved public IP kullanin. Ephemeral public IP'ye guvenmeyin.

## 8. Verify Matrix

Bu komutlar network mimarisini dogrulamak icin kullanilir:

```bash
oci network vcn list --compartment-id "$C" --all
oci network subnet list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network route-table list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network internet-gateway list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network security-list list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network nsg list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network public-ip list --compartment-id "$C" --lifetime RESERVED --all
```

Instance icinde:

```bash
ip addr show
ip route show
sudo ufw status verbose
curl -I https://github.com
```

## 9. Minimum Production Check

Bir sunucuyu production'a acmadan once su uc sey tam olmali:

- Public subnet ise route table + gateway dogru olmali
- Security list veya NSG gerekli portlari acmali
- Linux firewall sadece gerekli portlari kabul etmeli
