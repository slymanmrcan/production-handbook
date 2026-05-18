# Performans Forensics

Bu sayfa CPU, RAM, disk ve OOM gibi host kaynak problemleri için kullanılır. Eğer ana sinyal network ise önce [Network Forensics](network.md) sayfasına git.

## Semptomları Sınıflandır

- CPU yüksek ama servis cevap veriyor olabilir
- Disk IO tıkalı olabilir, load yüksek görünebilir
- RAM baskısı swap ve OOM üretir
- D state süreçler kernel seviyesinde bekler

İlk soru şu olmalı: sorun kaynak tüketimi mi, yoksa servis mantığı mı?

## Load Average Ne Demek

Load average CPU kullanımının bire bir karşılığı değildir. Bekleyen iş sayısını gösterir.

- `r` artıyorsa CPU kuyruğu vardır
- `b` artıyorsa bloklu süreçler vardır
- yük yüksek, CPU düşükse çoğu zaman disk veya NFS bekleniyordur

```bash
uptime
vmstat 1
```

## CPU Triage

```bash
mpstat -P ALL 1
ps aux --sort=-%cpu | head -10
top -H
```

Aranacak sinyaller:

- tek çekirdek mi dolu
- process veya thread bazlı mı sıcaklık var
- son deploy sonrası mı başladı

## Memory Triage

```bash
free -h
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -10
vmstat 1
journalctl -k -b --no-pager | rg -i 'oom|out of memory|killed process'
```

Belirti seti:

- `available` düşük
- swap in/out sürekli artıyor
- serviste restart loop var
- kernel OOM log'u oluşmuş

## Disk ve IO Triage

```bash
df -h
df -i
iostat -xz 1
iotop -oPa
du -h --max-depth=1 /var | sort -hr
```

Aranacak sinyaller:

- mount yüzde 90 üstü
- inode tükenmesi
- `await` yüksek
- `%util` 100'e yakın
- log dizini veya queue dizini büyüyor

## D State ve Kernel Beklemeleri

`D` state süreçler kill ile çözülmez. Kernel bir cihaz veya network mount cevabı bekliyordur.

```bash
ps -eo pid,state,cmd | rg ' D '
journalctl -k -b --no-pager
dmesg -T | tail -n 100
```

Eğer `D` state artıyorsa disk, NFS, storage controller veya driver tarafını incele.

## Güvenli Recovery

- Servisi bir kez restart et
- Son deploy ile çakışıyorsa rollback düşün
- Concurrency veya worker sayısını geçici azalt
- Gerekirse `systemctl set-property --runtime <service> MemoryMax=...` ile geçici limit koy

Şunlardan kaçın:

- loop içinde restart
- `kill -9` ile servis zorlamak
- root cause olmadan cache temizlemek

## Doğrulama

```bash
free -h
df -h
journalctl -k -b --no-pager | rg -i 'oom|out of memory|killed process'
systemctl status <service> --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen sonuç:

- yeni OOM kaydı olmamalı
- RSS stabil kalmalı
- servis health check'i geçmeli

## İlgili Runbook'lar

- [CPU Spike](../runbooks/cpu-spike.md)
- [Disk Dolu](../runbooks/disk-full.md)
- [Inode Dolu](../runbooks/inode-full.md)
- [Disk IO](../runbooks/disk-io.md)
- [OOM Kill / Memory Leak](../runbooks/oom-kill.md)
