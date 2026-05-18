# Ağ ve Bağlantı Komutları

Port, route, DNS ve dış bağlantı sorunlarında ilk bakılacak komutlar.

## Hızlı Triyaj

Sorun host'ta mı, DNS'te mi, firewall'da mı, karşı tarafta mı?

```bash
ip a
ip route
ss -lntup
ss -plant
resolvectl status
ping -c 3 1.1.1.1
curl -I https://example.com
```

- `ip a` IP var mı, `ip route` gateway doğru mu gösterir.
- `ss -lntup` hangi servis hangi portu dinliyor, hemen söyler.
- `ping` ICMP izinliyse link sağlığını, `curl` ise gerçek HTTP yolunu test eder.

## Port ve Servis Kontrolü

Dinleyen servis, açık port ve process mapping için.

```bash
sudo lsof -iTCP -sTCP:LISTEN -nP
nc -zv 127.0.0.1 22
nc -zv example.com 443
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

- `nc -zv` port açık mı hızlıca doğrular.
- `openssl s_client` TLS zinciri, SNI ve sertifika el sıkışmasını görür.
- `lsof` ile PID ve binary eşleşmesini incele.

## DNS ve Route

İsim çözümleme ve yol analizi için.

```bash
dig example.com +short
dig example.com +trace
nslookup example.com
traceroute example.com
mtr -rw example.com
ip route get 1.1.1.1
```

- `dig +short` hızlı doğrulama, `+trace` ise DNS zincirini anlatır.
- `ip route get` gerçek çıkış yolunu ve source IP'yi gösterir.
- `mtr` ve `traceroute` gecikme ve atlama analizi için kullanılır.

## Firewall ve Filtreleme

Yalnızca neyi kontrol ettiğini bilerek incele.

```bash
sudo ufw status verbose
sudo nft list ruleset
sudo iptables -S
sudo iptables -L -n -v
```

- Ubuntu/Debian'da `ufw` üst katman; gerçek kural seti `nft` veya `iptables` olabilir.
- Kuralları okurken önce varsayılan policy'ye bak.

## Paket ve Trafik Yakalama

Kısa ve filtreli kullan.

```bash
sudo tcpdump -i any -nn host 10.0.0.10 and port 443 -c 50
sudo tcpdump -i eth0 -nn port 53 -c 20
```

- `tcpdump` çok güçlüdür; kısa capture ve dar filtre kullan.
- Sensitif payload'ları istemeden görmek mümkün olduğu için kaydı sınırlı tut.

## Doğrulama

Firewall, DNS veya route değişikliği sonrası:

```bash
ss -lntup
ip route
dig example.com +short
curl -fsS https://example.com/health
```

## Yüksek Riskli Komutlar

```bash
ip link set eth0 down
ip addr flush dev eth0
nft flush ruleset
iptables -F
ufw reset
curl -k https://example.com
```

- `ip link set down` uzaktaysan erişimi kesebilir.
- `nft flush ruleset` ve `iptables -F` tüm firewall'u bir anda boşaltır.
- `curl -k` sertifika hatasını gizler; test için bile dikkatli kullan.
