# Olay Yonetimi

Bu runbook production incident aninda ilk 15 dakikada ne yapilacagini standardize eder. Amaç sorunu hemen cozmek degil, etkiyi kontrol altina alip dogru veriyi toplamaktir.

## 1. Etki Tespiti

Incident'i sozel olarak degil, olculebilir ifadelerle tanimlayin:

- Hangi servis etkilendi?
- Etki ne kadar yaygin?
- Baslama zamani ne?
- Hata tipi ne?
- Kullanici etkisi var mi?

İlk kayit icin:

```bash
date -u
hostname
uptime
```

## 2. Immediate Containment

Sorun buyuyorsa ilk hedef etkiyi sinirlamaktir.

Yapilabilecek ilk hamleler:

- yeni deploy'u durdur
- health check fail eden node'u load balancer'dan cikar
- problemli pod / service'i isolate et
- gerekiyorsa son stabil surume geri don

Kontrol komutlari:

```bash
systemctl --failed
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ss -tulpn
```

## 3. Triage Akisi

### A. Servis durumu

```bash
systemctl status <service> --no-pager
journalctl -u <service> --since "30 min ago" --no-pager
```

### B. Kaynak durumu

```bash
free -h
df -h
df -i
top -b -n 1 | head -n 30
```

### C. Network ve baglanti durumu

```bash
ss -tulpen
curl -fsS http://127.0.0.1:8080/healthz
ping -c 3 1.1.1.1
```

### D. Son degisiklikler

```bash
git log --oneline -n 5
git status --short
```

Eger deploy veya config degisikligi ile zaman olarak cakisiyorsa bunu incident notuna yazin.

## 4. Kalici Cozumden Once Geçici Stabilizasyon

Kalici cozum bulana kadar sistemin ayakta kalmasi daha onemlidir.

Ornekler:

- servis restart
- pod / container restart
- konfiguasyonu onceki versiyona geri alma
- hedefi kisa sureli olarak trafige kapatma

```bash
systemctl restart <service>
systemctl reset-failed <service>
```

## 5. Escalation Kriterleri

Su durumlarda incident'i yukari escalete edin:

- 10 dakikada net ilerleme yoksa
- veri kaybi riski varsa
- birden fazla servis etkileniyorsa
- rollback tek basina yeterli olmuyorsa
- root cause altyapi, network, DB veya cloud provider tarafindaysa

Escalation sirasinda su bilgileri verin:

- etki baslangic zamani
- etkilenen servisler
- uygulanan komutlar
- son log error'lari
- rollback denemeleri

## 6. Evidence Toplama

Toplanan evidence sonradan postmortem icin lazim olur.

```bash
mkdir -p /tmp/incident-evidence
systemctl status <service> --no-pager > /tmp/incident-evidence/service-status.txt
journalctl -u <service> --since "1 hour ago" --no-pager > /tmp/incident-evidence/service-journal.txt
df -h > /tmp/incident-evidence/df.txt
free -h > /tmp/incident-evidence/free.txt
```

Ek olarak su bilgileri kaydedin:

- ekran goruntusu
- incident timeline
- deploy numarasi
- config versiyonu
- rollback yapildiysa geri donulen commit / tag

## 7. Dogrulama

Incident kapatma karari icin su kriterleri kullanin:

- servis health check geciyor
- hata oranlari normale dondu
- kaynak tuketimi normal seviyede
- ayni hata tekrar etmiyor
- kritik loglarda yeni error yok

Kontrol:

```bash
systemctl status <service> --no-pager
journalctl -u <service> --since "15 min ago" --no-pager
curl -fsS http://127.0.0.1:8080/healthz
```

## 8. No-Go Durumlari

Incident'i kapatmadan once su durumlari netlestirin:

- root cause bilinmiyor ve sorun tekrar ediyor
- veri tutarliligi dogrulanmadi
- rollback yapildi ama health check gecmiyor
- alarm susturuldu ama kaynak problem devam ediyor

