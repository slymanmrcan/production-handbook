# Metodolojik Sorun Giderme

Bu bölümün amacı rastgele komut çalıştırmayı değil, kontrollü triage yapmayı standardize etmektir. İlk hedef her zaman aynıdır: etkiyi sınırlamak, sistemi sınıflandırmak, kanıt toplamak ve sonra doğru runbook'a gitmek.

## İlk 5 Dakika

1. Kullanıcı etkisini doğrula.
1. Değişikliği durdur.
1. Servis mi, host mu, network mü ayır.
1. Kanıtı kaybetmeden komut çalıştır.
1. Sorun sınıfına göre doğru sayfaya geç.

Pratik sıra şudur:

```text
RED -> USE -> evidence -> runbook
```

## RED Önce

Önce kullanıcı etkisini ölç. Sistem sağlıklı görünse bile servis yavaş, hata veriyor veya timeout'a düşüyor olabilir.

- `Rate`: istek sayısı veya trafik artışı var mı
- `Errors`: 5xx, timeout, restart, connection refused var mı
- `Duration`: p95/p99 yükselmiş mi

Bu sinyaller varsa önce uygulama ve servis katmanını incele. Yoksa host tarafına geç.

## USE Sonra

Kaynak sorunu ararken `USE` yaklaşımını kullan.

- `Utilization`: kaynak ne kadar dolu
- `Saturation`: kuyruk, bekleme veya tıkanma var mı
- `Errors`: kernel, driver veya servis hatası üretiliyor mu

Bu üçlü CPU, RAM, disk ve network için aynı mantıkla uygulanır.

## Karar Akışı

```text
Kullanıcı etkileniyor mu?
  -> evet: service-down, db-down, deploy-rollback, tls-renewal
  -> hayır: host kaynaklarını incele

Host kaynakları dolu mu?
  -> evet: performance.md
  -> hayır: network.md veya common-issues.md
```

## Kanıt Toplama

İlk bakışta değişiklik yapma. Önce bunları kaydet:

```bash
date -u
hostname
uptime
systemctl --failed
journalctl -p 3 -xb --no-pager
ss -tulpn
free -h
df -h
ip route
ip -s link
```

Eğer problem bir servis veya deploy ile ilişkiliyse ilgili servis logunu da al:

```bash
journalctl -u <unit> -b -n 200 --no-pager
```

## Hangi Sayfa Ne İçin

- [Advanced Cheat Sheet](cheat-sheet.md): ilk 5-10 dakikada bakılacak komutlar
- [Performance Forensics](performance.md): CPU, RAM, disk ve OOM sorunları
- [Network Forensics](network.md): DNS, route, packet loss ve latency sorunları
- [Yaygin Sorunlar](common-issues.md): semptomdan runbook'a hızlı eşleme

## Escalation Kuralı

Şu durumda daha fazla elle müdahale etmeden eskalasyon yap:

- aynı semptom tekrar ediyor
- iki farklı host aynı anda etkilenmiş
- kernel log'unda donanım, disk veya OOM izi var
- rollback sonrası da semptom devam ediyor
- network path provider tarafına işaret ediyor

## Verifikasyon

Sorun çözüldü demeden önce şu kontrolleri tekrar al:

```bash
systemctl --failed
journalctl -p 3 -xb --no-pager
ss -tulpn
free -h
df -h
```

Beklenen sonuç:

- failed unit kalmamalı
- yeni kritik hata olmamalı
- temel kaynaklar kabul edilebilir seviyede olmalı
