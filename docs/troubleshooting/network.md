# Network Forensics

Bu sayfa DNS, route, firewall, packet loss ve latency ayrıştırma akışı içindir. Eğer ana belirti CPU, RAM veya disk baskısıysa önce [Performans Forensics](performance.md) sayfasına git.

## Sorunu Sınıflandır

- DNS çözülmüyor
- Host dışarı çıkamıyor
- Servis portu dinlemiyor
- Latency ve packet loss artıyor
- TLS handshake veya proxy path bozulmuş

İlk soru: kırılma noktasını host içinde mi, ağ yolunda mı, karşı tarafta mı görüyoruz?

## İlk Triyaj

```bash
ip a
ip route
ss -tulpn
resolvectl status
ping -c 3 1.1.1.1
curl -I https://example.com
```

Bu komutlar sana şunları söyler:

- interface ayakta mı
- default route doğru mu
- port dinleniyor mu
- DNS resolver çalışıyor mu
- dışa çıkış mümkün mü

## DNS Sorunları

```bash
dig example.com +short
dig example.com +trace
nslookup example.com
resolvectl flush-caches
```

Karar:

- `+short` dönmüyorsa resolver zincirini incele
- `+trace` root seviyede kopuyorsa upstream DNS sorunu var
- cache temizliği sonrası düzeliyorsa local resolver problemidir

## Route ve Path

```bash
ip route get 1.1.1.1
mtr -rw example.com
traceroute example.com
```

Aranacak sinyaller:

- yanlış gateway
- ilk hop'ta loss
- orta hop'ta başlayan latency
- provider tarafında packet drop

## Firewall ve Portlar

```bash
sudo ufw status verbose
sudo nft list ruleset
sudo ss -tulpn
sudo lsof -iTCP -sTCP:LISTEN -nP
```

Karar:

- port dinlemiyor mu, yoksa firewall mu düşürüyor
- dışarıdan erişim var mı ama lokal loopback çalışıyor mu
- beklenmeyen servis ayağa kalkmış mı

## Packet Capture

```bash
sudo tcpdump -i any -nn port 443 -c 50
sudo tcpdump -i eth0 -nn port 53 -c 20
sudo tcpdump -i eth0 -nn host <target-ip> and port 80 -c 50
```

Capture dar tutulmalı. Hedefin paket içeriği değil, davranış paterni olduğunu unutma.

## Güvenli Recovery

- Yanlış interface'i aşağı indirme
- Firewall flush etmeden önce erişim yolunu doğrula
- `curl -k` ile sertifika hatasını gizleme
- `systemctl restart NetworkManager` veya `systemd-networkd` komutunu yalnızca etkisini biliyorsan kullan

## Doğrulama

```bash
ss -tulpn
ip route
dig example.com +short
curl -fsS https://example.com/health
```

Beklenen sonuç:

- resolver doğru cevap veriyor
- doğru route görünüyor
- servis portu dinliyor
- health check dönüyor

## İlgili Runbook'lar

- [DNS Sorunlari](../runbooks/dns-issues.md)
- [Network Latency](../runbooks/network-latency.md)
- [LB Healthcheck](../runbooks/lb-healthcheck.md)
- [SSH Lockout](../runbooks/ssh-lockout.md)
- [Servis Kesintisi](../runbooks/service-down.md)
