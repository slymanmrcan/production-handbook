# Ag ve Port Kontrolleri

Bu rehber, sunucuda acik portlari, dinleyen servisleri ve dis erisimi operasyonel olarak dogrulamak icin kullanilir. Amaç sadece "port acik" demek degil; hangi servis niye acik, kim erisiyor ve firewall bunu gercekten koruyor mu sorularina cevap vermektir.

## Kapsam

Bu sayfa su durumlarda kullanilir:

- yeni host teslim alindiginda
- bir servis 502/timeout verdiginde
- firewall veya load balancer degisikligi sonrasi
- beklenmeyen bir port goruldugunde

## Politika

- Her acik portun sahibi belli olmali.
- Public port sayisi minimumda tutulmali.
- "Portu degistirmek" guvenlik degil, sadece gürultu azaltmadir.
- Firewall, servis ve remote reachability birlikte dogrulanmali.

## Beklenen Port Tablosu

Tipik bir web sunucusunda asgari konvansiyon su olabilir:

| Port | Amac | Erişim |
| :--- | :--- | :--- |
| `22/tcp` | SSH | sadece admin IP'leri |
| `80/tcp` | HTTP redirect | public |
| `443/tcp` | HTTPS | public |
| `9100/tcp` | node_exporter | sadece monitoring veya localhost |
| `3000/tcp` | app admin / local proxy | genelde localhost |

## Yerel Dinleme Kontrolu

Sunucunun kendi ustunde hangi servislerin dinledigini gor:

```bash
ss -lntup
ss -lntp '( sport = :443 )'
lsof -iTCP -sTCP:LISTEN -nP
```

`ss` modern ve hizlidir; `lsof` ise process adini goruntulemek icin faydalidir.

## Firewall ve Kural Seti

UFW kullaniyorsan once policy'yi, sonra izinleri incele:

```bash
sudo ufw status verbose
sudo ufw app list
```

Nftables kullanan hostlarda gercek durum:

```bash
sudo nft list ruleset
```

Eger iptables hala kullaniliyorsa:

```bash
sudo iptables -S
sudo iptables -L -n -v
```

## Remote Dogrulama

Yerel `ss` tek basina yeterli degildir. Disaridan da test et:

```bash
nc -zv 127.0.0.1 443
nc -zv <server-ip> 443
curl -fsS https://<domain>/healthz
openssl s_client -connect <domain>:443 -servername <domain> </dev/null
```

Bu testler port, TCP baglanti, TLS ve HTTP katmanini ayri ayri gorur.

## Sorun Ayirma

- `ss` portu gosteriyor ama disardan ulasilmiyorsa firewall, security group veya LB tarafini kontrol et.
- Disardan erisiliyor ama servis cevap vermiyorsa uygulama veya upstream kontrolu yap.
- Bir port beklenmedik sekilde aciksa once process sahibi bul, sonra gerekiyorsa kapat.

## Port Acan Servisi Bulma

Belirli bir portun sahibini bulmak icin:

```bash
ss -lntp '( sport = :443 )'
sudo lsof -iTCP:443 -sTCP:LISTEN -nP
ps -fp <PID>
systemctl status <service> --no-pager -l
```

## Ornek Firewall Uygulamasi

Yeni host'ta minimum izin modeli:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

SSH portu custom ise `OpenSSH` yerine net port numarasini kullan.

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Yerel dinleme gorunuyor mu | `ss -lntup` | Beklenen servisler gorunmeli |
| Port sahibi belli mi | `ss -lntp '( sport = :443 )'` | Dogru PID/service gorunmeli |
| Firewall aktif mi | `sudo ufw status verbose` | `active` ve beklenen policy olmali |
| Kurallar gercekten uygulanmis mi | `sudo nft list ruleset` | Beklenen kural seti gorunmeli |
| Dis erisim calisiyor mu | `nc -zv <server-ip> 443` | TCP baglantisi basarili olmali |
| HTTP/TLS saglam mi | `curl -fsS https://<domain>/healthz` ve `openssl s_client ...` | HTTP ve sertifika beklenen sekilde calismali |

## Common Mistakes

- Sadece `ss` bakip firewall'u kontrol etmemek
- `curl` basarili diye TLS'i dogrulamayi atlamak
- UFW aktif degilken kural yazmak
- Beklenmeyen portu kapatmak yerine sadece restart atmak
- `0.0.0.0` dinleyen admin portlarini fark etmemek
- Portu degistirip guvenligi cozdum sanmak
