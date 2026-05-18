# Netplan, DNS ve Ag Temeli

Bir sunucunun "calişiyor" olmasi yetmez. IP, gateway, DNS ve interface davranisi **tahmin edilebilir** olmali.

Bu rehber Ubuntu/Debian tabanli sunucularda:

- static IP tanimlama,
- default route ayarlama,
- DNS resolver standardi kurma,
- NIC ve route dogrulama

icin kullanilir.

## 1. Mevcut Durumu Cikar

Degisiklik yapmadan once mevcut network state'i kaydedin:

```bash
ip -br link
ip -br addr
ip route
resolvectl status
ls -1 /etc/netplan
```

Uzak sunucuda calisiyorsaniz mevcut netplan dosyasini mutlaka yedekleyin:

```bash
sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak 2>/dev/null || true
sudo cp /etc/netplan/01-netcfg.yaml /etc/netplan/01-netcfg.yaml.bak 2>/dev/null || true
```

## 2. Static IP Tanimla

Ornek senaryo:

- Interface: `ens18`
- IP: `192.0.2.10/24`
- Gateway: `192.0.2.1`
- DNS: `1.1.1.1`, `8.8.8.8`
- Search domain: `corp.local`

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens18:
      dhcp4: false
      addresses:
        - 192.0.2.10/24
      routes:
        - to: default
          via: 192.0.2.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
        search:
          - corp.local
```

Uygulama sirasinda **`netplan try`** kullanin. Uzak baglantida bu hayat kurtarir:

```bash
sudo netplan generate
sudo netplan try
```

Her sey dogruysa kalici uygula:

```bash
sudo netplan apply
```

## 3. DHCP'den Static'e Gecerken Cloud-Init Kontrolu

Bazi cloud imajlari network konfigürasyonunu `cloud-init` ile tekrar yazar. Static config sizde kalici olmuyorsa network yönetimini kapatin:

```bash
printf 'network: {config: disabled}\n' | sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
```

Sonrasinda netplan dosyanizi yeniden yazip sistemi reboot edin:

```bash
sudo netplan generate
sudo reboot
```

> Not: Bu adimi sadece cloud-init'in network konfigünü override ettigini dogruladiysaniz uygulayin.

## 4. DNS Resolver Standardi

`/etc/resolv.conf` dosyasini elle duzenlemek dogru yaklaşim degildir. Ubuntu 20.04+ sistemlerde dogru kontrol noktasi genelde `systemd-resolved` + netplan ikilisidir.

Resolver durumunu inceleyin:

```bash
resolvectl status
readlink -f /etc/resolv.conf
```

Beklenen durum:

- `/etc/resolv.conf` -> `/run/systemd/resolve/...`
- DNS server'lar netplan tanimindan geliyor olmali
- Search domain gerekmiyorsa bos birakilmali

DNS sorgusunu dogrudan test edin:

```bash
resolvectl query example.com
dig example.com @1.1.1.1 +short
```

## 5. Route ve NIC Dogrulama

Temel kontroller:

```bash
ip -br addr show ens18
ip route
ip route get 1.1.1.1
ping -c 3 192.0.2.1
ping -c 3 1.1.1.1
ping -c 3 example.com
```

Beklenen:

- Interface `UP` olmali
- IP dogru subnet'te olmali
- `default via` kaydi görünmeli
- Gateway ping dönmeli
- IP ile internet ve DNS ile isim çözümleme birlikte calismali

## 6. Sik Yapilan Hatalar

### Yanlis Interface Adi

`eth0` varsayimi yapmayin. Gercek isim `ens18`, `ens3`, `enp1s0` gibi olabilir.

```bash
ip -br link
```

### Ayni Anda Birden Fazla Netplan Dosyasi

Birden fazla dosya birbirini override edebilir:

```bash
grep -R "dhcp4\\|addresses\\|gateway4\\|routes" /etc/netplan
```

### Sadece DNS Calisiyor, Route Bozuk

Bu durumda `ping example.com` basarisiz olabilir ama `resolvectl query` calisir. Sorun DNS degil, route/gateway tarafindadir.

## 7. Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Interface durumu | `ip -br addr` | Dogru interface `UP` olmali ve static IP görünmeli. |
| Default route | `ip route | grep default` | Tek ve dogru gateway kaydi görünmeli. |
| Resolver | `resolvectl status` | Beklenen DNS server'lar görünmeli. |
| Gateway erişimi | `ping -c 3 <gateway-ip>` | Paket kaybi olmamali. |
| Internet erişimi | `ping -c 3 1.1.1.1` | Cikis var olmali. |
| DNS çözümleme | `resolvectl query example.com` | IP çözülmeli. |

## 8. Break-Glass Geri Donus

Static config sonrası baglanti koptuysa out-of-band console ile eski dosyayi geri alin:

```bash
sudo mv /etc/netplan/01-netcfg.yaml.bak /etc/netplan/01-netcfg.yaml
sudo netplan apply
```

Cloud provider console erişiminiz yoksa uzak sunucuda plansiz network değişikligi yapmayin.
