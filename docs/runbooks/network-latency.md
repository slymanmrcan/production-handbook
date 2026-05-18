# Network Latency Spike

Bu runbook, network gecikmesi ve packet loss artisinda uygulanacak teshis ve azaltma akisini standardize eder. Amac "internet yavas" demek yerine hangi hop'ta sorun oldugunu bulmaktir.

## Etki

- Uygulama timeout verir.
- LB healthcheck fail olabilir.
- DB baglantilari yavaslar.
- SSH oturumlari takilabilir.

## Tipik Failure Mode'lar

- Upstream router / provider impairment
- Host NIC saturation
- Packet loss
- MTU mismatch
- DNS degil ama DNS gibi gorunen network timeout
- Cloud security group / NACL / firewall sorunlari
- Ayni hostta CPU pressure veya IO bottleneck

## 1. Hemen Etkiyi Sinirla

- Batch job ve yüksek hacimli trafik üretimini durdur.
- Gerekirse ilgili host veya node'u trafikten çıkar.
- Sorun tek bir servisle sınırlıysa o servisin concurrency'sini düşür.

## 2. Gecikmeyi ve Loss'u Olc

Önce referans veriyi topla:

```bash
date -u
hostname
uptime
ping -c 20 1.1.1.1
ping -c 20 8.8.8.8
mtr -rw example.com
curl -o /dev/null -s -w 'connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n' https://example.com
```

`mtr` yoksa:

```bash
traceroute example.com
```

## 3. Host Tarafini Kontrol Et

Network problemi gibi görünen şey bazen host kaynak problemidir.

```bash
ip -s link
ip route
ss -s
top -b -n1 | head -n 20
journalctl -k --since "30 min ago" --no-pager | rg -i 'link|mtu|reset|timeout|drop'
```

Aranacak işaretler:

- NIC error / drop sayıları
- route değişimi
- aşırı bağlantı sayısı
- kernel log'unda reset veya MTU uyarısı

## 4. Uzak Noktayi Ayir

Kendi host'una mi, yoksa karşı servise mi problem var ayır:

```bash
ping -c 5 127.0.0.1
ping -c 5 <gateway-ip>
ping -c 5 1.1.1.1
curl -fsS http://127.0.0.1/healthz
curl -fsS https://<upstream>/healthz
```

Eger lokal health geçiyor ama disari çıkışta sorun varsa network path'te problem vardır.

## 5. Hızlı Recovery

### Interface reset

```bash
sudo ip link set <iface> down
sudo ip link set <iface> up
```

### Network service restart

```bash
sudo systemctl restart systemd-networkd 2>/dev/null || true
sudo systemctl restart NetworkManager 2>/dev/null || true
```

### Problemli upstream veya route'u bypass et

Eger özel bir route kötüleştiyse geçici olarak çalışır rotaya dönün ve değişikliği kaydedin.

## 6. Dogrulama

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| RTT sabit mi | `ping -c 20 1.1.1.1` | Ortalama gecikme normale dönmeli |
| Route doğru mu | `ip route get 1.1.1.1` | Beklenen gateway görünmeli |
| Packet loss var mı | `mtr -rw example.com` | Loss yüzde düşük olmalı |
| Host yükü normal mi | `uptime` ve `top -b -n1` | CPU spike olmamalı |
| Uygulama cevap veriyor mu | `curl -fsS https://<app>/healthz` | Timeout olmamalı |

## 7. Escalation Kriterleri

- Paket kaybı yüzde 1-2 üzerinde kalıyorsa
- 10 dakikada düzelme yoksa
- Sorun provider / upstream ISP tarafına işaret ediyorsa
- Aynı anda birden fazla host etkileniyorsa
- MTR ilk hop'tan itibaren kötüleşiyorsa

## 8. Evidence Toplama

```bash
mkdir -p /tmp/incident-evidence
date -u > /tmp/incident-evidence/time.txt
hostname > /tmp/incident-evidence/hostname.txt
ip -s link > /tmp/incident-evidence/ip-link.txt
ip route > /tmp/incident-evidence/ip-route.txt
ping -c 20 1.1.1.1 > /tmp/incident-evidence/ping-1.1.1.1.txt
mtr -rw example.com > /tmp/incident-evidence/mtr-example.txt
```
