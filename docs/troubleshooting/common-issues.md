# Yaygin Sorunlar

Bu sayfa semptomdan doğru runbook'a gitmek için kullanılır. Önce hızlı kontrol, sonra detaylı akış.

## SSH Baglanti Sorunu

İlk kontrol:

```bash
ip a
ip route
sudo ufw status verbose
journalctl -u ssh -b --no-pager
```

Bakılacak yerler:

- IP veya route değişmiş mi
- firewall SSH'yi kesiyor mu
- `sshd_config` değişikliği sonrası lockout oluşmuş mu

İlgili runbook: [SSH Lockout](../runbooks/ssh-lockout.md)

## Servis Ayakta Degil

İlk kontrol:

```bash
systemctl --failed
systemctl status <unit> --no-pager -l
journalctl -u <unit> -b -n 100 --no-pager
ss -tulpn
```

İlgili runbook: [Servis Kesintisi](../runbooks/service-down.md)

## 502 veya Upstream Hatasi

İlk kontrol:

```bash
ss -tulpn
curl -fsS http://127.0.0.1:<app-port>/healthz
journalctl -u nginx -b -n 100 --no-pager
```

Bakılacak yerler:

- uygulama portu dinliyor mu
- proxy upstream doğru mu
- uygulama logunda timeout var mı

İlgili runbook: [Servis Kesintisi](../runbooks/service-down.md)

## Disk Dolu

İlk kontrol:

```bash
df -h
df -i
du -h --max-depth=1 /var | sort -hr
```

İlgili runbook: [Disk Dolu](../runbooks/disk-full.md)

## OOM veya Bellek Baskisi

İlk kontrol:

```bash
free -h
vmstat 1
journalctl -k -b --no-pager | rg -i 'oom|out of memory|killed process'
```

İlgili runbook: [OOM Kill / Memory Leak](../runbooks/oom-kill.md)

## DNS veya Network Yavasligi

İlk kontrol:

```bash
resolvectl status
ip route
ping -c 3 1.1.1.1
mtr -rw example.com
```

İlgili runbook'lar:

- [DNS Sorunlari](../runbooks/dns-issues.md)
- [Network Latency](../runbooks/network-latency.md)

## TLS Sertifikasi veya Yenileme

İlk kontrol:

```bash
systemctl list-timers --all | rg certbot
journalctl -u certbot -b --no-pager
curl -Iv https://example.com
```

İlgili runbook'lar:

- [TLS Yenileme](../runbooks/tls-renewal.md)
- [Sertifika Suresi Doldu](../runbooks/cert-expired.md)

## Veritabanı Sorunu

İlk kontrol:

```bash
systemctl status <db-service> --no-pager
ss -tulpn | rg '5432|3306'
journalctl -u <db-service> -b -n 100 --no-pager
```

İlgili runbook: [Veritabani Down](../runbooks/db-down.md)

## Doğrulama

- semptom tekrar ediyor mu
- loglar temiz mi
- ilgili health check geçiyor mu
- doğru runbook'a gidildi mi
