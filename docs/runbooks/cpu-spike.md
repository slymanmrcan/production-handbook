# CPU Spike

Bu runbook, CPU kullanimi aniden arttiginda uygulanir. CPU spike bazen deploy bug'i, bazen de log, retry veya worker patlamasidir.

## 1. Etki ve Belirtiler

- Load average yukselir.
- Uygulama response time uzar.
- Request timeout, retry storm veya 5xx artis gorulur.
- Tek core veya tum core'lar dolu olabilir.

## 2. Immediate Containment

- Son deploy ile zamanlama uyusuyorsa traffic'i azalt veya rollback planla.
- Batch job, cron ve background worker'lari durdur.
- Gerekirse node'u load balancer'dan cikar.
- Tek bir process CPU'yu yutuyorsa onceligini dusur veya kontrollu restart et.

```bash
systemctl stop <batch-job>
renice +10 -p <pid>
```

## 3. Likely Failure Modes

- Sonsuz loop veya hot path bug'i
- Yuksek retry / thundering herd
- Agir JSON, compression, encryption veya regex islemleri
- Log rotation, backup veya data transform
- Cok fazla worker / thread
- Runaway query veya CPU-bound job

## 4. Triage

```bash
uptime
top -H -o %CPU
ps -eo pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head -20
pidstat -u 1 5
journalctl -u <service> --since "30 min ago" --no-pager
dmesg -T | rg -i 'soft lockup|hung task|rcu'
systemctl status <service> --no-pager
```

Bakilacak sinyaller:

- CPU tek process'te mi toplanmis?
- Bir worker havuzu mu sisiyor?
- IO bekleme artmis mi? Eger `wa` yuksekse `disk-io` runbook'una gec.
- Son deploy veya config degisimi ile zamanlama uyusuyor mu?

## 5. Safe Cleanup / Recovery

- Problemli batch job'u durdur.
- Son degisiklige denk geliyorsa rollback uygula.
- Worker sayisini veya concurrency'yi gecici olarak azalt.
- Gerekirse `renice` ile batch islerini arkaya at.
- Tek bir servis anormal davranıyorsa kontrollu restart yap.

```bash
systemctl restart <service>
```

## 6. Escalation Criteria

- CPU, traffic azalmasina ve job durdurulmasina ragmen dusmuyorsa.
- Soft lockup, hung task veya kernel uyarisi varsa.
- Host idle gorunurken belirli bir process CPU'yu tuketmeye devam ediyorsa.
- Sorun rollback sonrasinda da devam ediyorsa.

Bu durumda performans profili, recent deploy diff'i veya platform issue incelemesi gerekir.

## 7. Verification

```bash
uptime
ps -eo pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head -10
journalctl -u <service> --since "30 min ago" --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen sonuclar:

- Load average dusmeli.
- En ustteki CPU tuketen process normal seviyeye inmis olmali.
- Alarm tekrar etmeyecek sekilde stabilize olmali.

## 8. Ilgili Runbook

- IO ile birlikte yavasliyorsa: [Disk IO Krizi](disk-io.md)
- Servis ayaga kalkmiyorsa: [Servis Kesintisi](service-down.md)
