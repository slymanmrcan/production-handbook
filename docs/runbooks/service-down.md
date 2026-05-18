# Servis Kesintisi

Bu runbook belirli bir Linux service ayaga kalkmadiysa veya traffic'e cevap vermiyorsa uygulanir.

## 1. Etki ve Semptomlar

Önce servis gerçekten down mi, yoksa yavas / degisik cevap mi veriyor ayirin.

Kontrol edin:

- servis process ayakta mi?
- port dinliyor mu?
- health endpoint cevap veriyor mu?
- bagimli servisler ulasilabilir mi?

Ilk komutlar:

```bash
systemctl status <service> --no-pager
systemctl is-active <service>
systemctl is-enabled <service>
ss -tulpn | rg ':<port>\b'
```

## 2. Immediate Containment

Servis uzerine trafik geliyorsa ve hata uretiyorsa:

- reverse proxy / load balancer uzerinden cikar
- problemli node varsa trafikten al
- otomatik restart loop varsa durdur

```bash
systemctl stop <service>
```

Eger servis container icindeyse:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 100 <container>
docker restart <container>
```

## 3. Triage

### A. Loglar

```bash
journalctl -u <service> --since "30 min ago" --no-pager
```

### B. Kaynaklar

```bash
free -h
df -h
df -i
top -b -n 1 | head -n 20
```

### C. Bagimliliklar

```bash
systemctl list-dependencies <service> --plain
curl -fsS http://127.0.0.1:<port>/healthz
```

### D. Konfigurasyon

```bash
systemctl cat <service>
```

Bakilacak tipik hata sinyalleri:

- eksik env degiskeni
- yanlis path
- permission denied
- port conflict
- DB / upstream baglantisi yok

## 4. Yeniden Baslatma Karari

Sadece tek seferlik crash veya gecici network sorunu varsa restart denenebilir.

Restart oncesi:

```bash
journalctl -u <service> --since "30 min ago" --no-pager | tail -n 50
```

Restart sonrasi:

```bash
systemctl restart <service>
systemctl status <service> --no-pager
```

Eger servis 1-2 dakika icinde tekrar dusuyorsa reboot yerine root cause arayin.

## 5. Rollback / Escalation

Rollback dusun:

- son degisiklikle birebir zaman cakismasi varsa
- restart ile kalici toparlanmiyorsa
- config veya binary degisikligi net ise

Escalate et:

- servis bagimli DB / queue / storage tarafindan bloklanmissa
- disk dolu / inode dolu / OOM tekrarliyorsa
- servis ayaga kalkiyor ama health check gecmiyorsa

## 6. Dogrulama

Servis ayağa kalkti saymak icin:

```bash
systemctl is-active <service>
systemctl status <service> --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen:

- servis `active (running)`
- health check 200 dönüyor
- loglarda yeni error akmiyor

## 7. Evidence

Kapatmadan once su verileri saklayin:

```bash
mkdir -p /tmp/service-down-evidence
systemctl status <service> --no-pager > /tmp/service-down-evidence/status.txt
journalctl -u <service> --since "1 hour ago" --no-pager > /tmp/service-down-evidence/journal.txt
ss -tulpn > /tmp/service-down-evidence/ports.txt
free -h > /tmp/service-down-evidence/free.txt
df -h > /tmp/service-down-evidence/df.txt
```

