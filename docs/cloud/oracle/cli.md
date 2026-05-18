# OCI CLI (Command Line Interface)

OCI CLI, panelde tek tek tıklamak yerine altyapı nesnelerini terminalden yönetmek icin kullanilir. Bu dokumanin hedefi "ilk kurulum" degil; tekrarlanabilir, denetlenebilir ve production'a uygun komut kaliplari vermektir.

## 1. Kurulum

OCI CLI Python tabanlidir. Linux'ta en pratik yol resmi kurulum script'ini calistirmaktir:

```bash
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
```

Kurulumdan sonra versiyonu kontrol edin:

```bash
oci --version
```

Eger sistemde birden fazla Python kurulumu varsa, CLI'yi ayri bir profile veya sanal ortama kurup kullanmak daha temizdir. Server yönetimi icin tek onemli nokta: `oci` komutunun PATH icinde olmasi.

## 2. Kimlik Dogrulama ve Config

CLI, API key tabanli calisir. En saglam is akisi su sekildedir:

1. Lokal makinede bir anahtar cifti olusturun.
2. Public key'i OCI kullanicinizin API Keys bolumune ekleyin.
3. CLI config dosyasini olusturun.

Anahtar olusturma:

```bash
ssh-keygen -t ed25519 -a 100 -f ~/.oci/oci_api_key
```

> [!NOTE]
> OCI tarafinda bu anahtar, instance'a SSH ile girmek icin degil, API cagri yetkilendirmesi icindir. SSH anahtari ve OCI API anahtari ayni sey degildir.

Config olusturma:

```bash
oci setup config
```

Komut sizden tipik olarak sunlari ister:

- User OCID
- Tenancy OCID
- Region
- API key dosya yolu
- Key fingerprint

Varsayilan config yolu:

```bash
~/.oci/config
```

Ornek profile kullanimi:

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaa...
fingerprint=aa:bb:cc:dd:ee:ff
key_file=/home/you/.oci/oci_api_key
tenancy=ocid1.tenancy.oc1..aaaa...
region=eu-frankfurt-1
```

Birden fazla ortam icin ayrica profile tutun:

```ini
[prod]
user=ocid1.user.oc1..aaaa...
fingerprint=aa:bb:cc:dd:ee:ff
key_file=/home/you/.oci/prod_api_key
tenancy=ocid1.tenancy.oc1..aaaa...
region=eu-frankfurt-1
```

Kullanim:

```bash
export OCI_CLI_PROFILE=prod
oci iam availability-domain list
```

## 3. OCI CLI Calisma Modeli

Bu repo icin kritik komut kaliplari:

- `--compartment-id`: Neredeyse her listeleme komutunda gerekir.
- `--all`: Sonuclar sayfali ise tum sayfalari toplar.
- `--query`: Gereksiz JSON'u budar, okunabilir cikti verir.
- `--output table`: Insan okumasina uygun format.
- `--from-json file://...`: Uzun veya riskli payload'lari dosyadan okutmak icin.
- `--wait-for-state`: Create/update islemleri icin bekleme.

Kisa ornek:

```bash
oci network subnet list \
  --compartment-id "$C" \
  --all \
  --output table \
  --query 'data[*].{Name:"display-name", State:"lifecycle-state", CIDR:"cidr-block"}'
```

> [!WARNING]
> `update` komutlari cogu OCI kaynak tipinde tam nesne uzerinden calisir. Security list, route table ve NSG rule update ederken "sadece bir kural ekliyorum" diye dusunmeyin; mevcut kurallari ezme riski vardir. Production icin JSON dosyasi ile calisin.

## 4. Gunluk Operasyon Komutlari

### Kaynaklari listeleme

```bash
oci iam compartment list --compartment-id "$TENANCY_OCID" --all
oci iam region-subscription list --tenancy-id "$TENANCY_OCID"
oci compute instance list --compartment-id "$C" --all
oci network vcn list --compartment-id "$C" --all
oci network subnet list --compartment-id "$C" --all
oci network security-list list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci network nsg list --compartment-id "$C" --vcn-id "$VCN_ID" --all
oci bv volume list --compartment-id "$C" --all
oci network public-ip list --compartment-id "$C" --lifetime RESERVED --all
```

### Instance uzerinde temel isler

```bash
oci compute instance action --instance-id "$INSTANCE_ID" --action RESET
oci compute instance action --instance-id "$INSTANCE_ID" --action SOFTRESET
oci compute instance action --instance-id "$INSTANCE_ID" --action STOP
oci compute instance action --instance-id "$INSTANCE_ID" --action START
```

### VCN ve firewall kurallari

Security list kuralini dosyadan gondermek daha guvenlidir:

`ingress-443.json`

```json
[
  {
    "description": "HTTPS",
    "protocol": "6",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "tcpOptions": {
      "destinationPortRange": {
        "min": 443,
        "max": 443
      }
    }
  }
]
```

Komut:

```bash
oci network security-list update \
  --security-list-id "$SECURITY_LIST_ID" \
  --ingress-security-rules file://ingress-443.json
```

NSG tarafinda da ayni mantik gecerli:

```bash
oci network nsg rules list --nsg-id "$NSG_ID" --all
```

### Reserved Public IP

Reserved Public IP, instance'a degil ilgili private IP'ye baglanir. Bu sayede instance yeniden kuruldugunda ya da VNIC degistiginde IP'yi yeniden atayabilirsiniz.

Oluşturma:

```bash
oci network public-ip create \
  --compartment-id "$C" \
  --lifetime RESERVED \
  --display-name prod-web-01-ip
```

Mevcut private IP'ye baglama:

```bash
oci network public-ip update \
  --public-ip-id "$PUBLIC_IP_ID" \
  --private-ip-id "$PRIVATE_IP_ID"
```

Durum kontrolu:

```bash
oci network public-ip get --public-ip-id "$PUBLIC_IP_ID"
```

## 5. JSON Icin Pratik Calisma Modeli

Uzun payload'lari komut satirina yazmayin. Dosya kullanin.

Sik kullanilan desen:

`payload.json` icinde security list icin tutmak istediginiz tam ingress rule set'i saklayin:

```bash
oci network security-list update \
  --security-list-id "$SECURITY_LIST_ID" \
  --ingress-security-rules file://payload.json
```

Bu yaklasim su durumlarda daha saglamdir:

- birden fazla ingress/egress kural
- port araliklari
- review edilmesi gereken degisiklikler
- CI/CD ile otomasyon

## 6. Verify Matrix

Asagidaki komutlar, CLI'nin ve bagli olduklari OCI kaynaklarinin calisip calismadigini kontrol etmek icindir:

```bash
oci --version
oci setup config --help
oci iam availability-domain list
oci iam region-subscription list --tenancy-id "$TENANCY_OCID"
oci compute instance list --compartment-id "$C" --all --output table
oci network public-ip list --compartment-id "$C" --lifetime RESERVED --all
```

Lokal config dogrulama:

```bash
test -f ~/.oci/config && echo ok
test -f ~/.oci/oci_api_key && echo ok
ssh-keygen -lf ~/.oci/oci_api_key.pub
```

## 7. Sorun Cozme Notlari

- `NotAuthenticated` alirsaniz fingerprint, public key ve profile alanlarini kontrol edin.
- `Forbidden` alirsaniz compartment veya tenancy seviyesinde yetki eksiktir.
- `BadRequest` alirsaniz JSON payload alan adlari genelde yanlistir.
- Security list veya route table update ettikten sonra degisiklik aninda gorunmeyebilir; CLI ile get/list yaparak dogrulayın.

## 8. Pratik Kural

Bir kaynağı elle degistirmeden once su uc soruyu sorun:

1. Bu kaynak hangi compartment'ta?
2. Bu degisiklik tam nesneyi mi guncelliyor?
3. Geri almak icin hangi `get` veya `list` komutunu calistiracagim?
