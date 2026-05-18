# OOM Kill / Memory Leak

Bu runbook, process veya container bellek limitini astiginda uygulanir. Kernel OOM killer bir process'i oldurebilir ya da container 137 ile cikabilir.

## 1. Etki ve Belirtiler

- Servis beklenmedik sekilde restart olur.
- Loglarda `Killed process`, `Out of memory` veya exit code `137` gorulur.
- Uygulama yavaslar, swap artar veya node genelinde bellek baskisi olusur.
- Tekrar eden OOM'lar servis stabilitesini bozabilir.

## 2. Immediate Containment

- Problemli servisi restart loop'tan cikar.
- Yeni deploy veya batch isleri durdur.
- Eger trafik etkileniyorsa saglam replica'ya yonlendir.
- Yuksek bellek kullanan komsu process'leri de kontrol et.

```bash
systemctl stop <service>
```

## 3. Likely Failure Modes

- Memory leak
- Kisa sureli peak traffic veya concurrency patlamasi
- Container memory limitinin fazla dusuk olmasi
- Cache / queue / batch worker sayisinin fazla olmasi
- Swap yok veya cok az
- Yakinda yapilan deploy ile memory footprint artisi

## 4. Triage

```bash
free -h
ps -eo pid,ppid,cmd,%mem,rss --sort=-rss | head -20
top -o %MEM
journalctl -k -b --no-pager | rg -i 'oom|out of memory|killed process'
systemctl status <service> --no-pager
systemctl show <service> -p MemoryCurrent -p MemoryMax -p OOMPolicy -p Restart
docker stats --no-stream
```

Bakilacak sinyaller:

- OOM tek bir process'i mi vurdu, yoksa node genelinde mi oldu?
- Servis memory limitine sistematik olarak mi carpiyor?
- RSS surekli buyuyor mu?
- Son deploy ile baslangic noktasi eslesiyor mu?

Container kullaniyorsan ilgili container limitini de dogrula:

```bash
docker inspect <container> --format '{{.HostConfig.Memory}} {{.HostConfig.MemorySwap}}'
```

## 5. Safe Cleanup / Recovery

- Yalnizca bir kez restart et; tekrar OOM oluyorsa root cause olmadan loop'a alma.
- Memory leak supheliyse son deploy'u rollback et.
- Gerekirse gecici olarak concurrency dusur veya worker sayisini azalt.
- Systemd unit icin gecici runtime limit koyabilirsin.

```bash
systemctl set-property --runtime <service> MemoryMax=1G
systemctl restart <service>
```

- Container tarafinda limit gerekiyorsa compose veya deploy spec ile duzelt.
- `echo 3 > /proc/sys/vm/drop_caches` kullanma; bu OOM'u cozmeye calisirken sistemi gereksiz oynatir.

## 6. Escalation Criteria

- Ayni servis 15-30 dakika icinde tekrar OOM oluyorsa.
- Node uzerinde birden fazla servis etkileniyorsa.
- Swap thrash veya cgroup OOM devam ediyorsa.
- Son deploy ile baslayan ve rollback sonrasinda da devam eden memory growth varsa.

Bu durumda uygulama owner'i ile birlikte heap profile, concurrency ve limit ayari incelenmeli.

## 7. Verification

```bash
journalctl -k -b --no-pager | rg -i 'oom|out of memory|killed process'
free -h
ps -eo pid,ppid,cmd,%mem,rss --sort=-rss | head -10
systemctl status <service> --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen sonuclar:

- Yeni OOM kaydi olmamali.
- RSS stabil kalmali.
- Servis saglik kontrolunu gecmeli.

## 8. Ilgili Runbook

- Genel servis geri kazanimi icin: [Servis Kesintisi](service-down.md)
- CPU ile birlikte artiyorsa: [CPU Spike](cpu-spike.md)
