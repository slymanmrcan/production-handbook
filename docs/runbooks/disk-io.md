# Disk IO Krizi

Bu runbook, disk IO saturation, yuksek await veya storage kaynakli yavaslama durumunda uygulanir. CPU bos olsa bile uygulama timeout verebilir.

## 1. Etki ve Belirtiler

- Uygulama latency'si artar.
- DB commit, log write veya backup isleri yavaslar.
- Load average yukselir ama CPU tamamen dolu olmayabilir.
- `iowait` artar, servisler timeout verir.

## 2. Immediate Containment

- Backup, rsync, import, log shipping ve batch job'lari durdur.
- Problemli node traffic aliyorsa, saglam replica varsa node'u rotasyondan cikar.
- Yuksek IO yaratan tek bir proses varsa prioriteyi dusur.

```bash
systemctl stop <batch-job>
renice +10 -p <pid>
ionice -c3 -p <pid>
```

## 3. Likely Failure Modes

- DB checkpoint, vacuum veya write amplification
- Backup / restore job'u
- Buyuk log rotation veya compression isleri
- Ayni volume uzerinde cok sayida yazan servis
- Cloud disk throughput limitine ulasma
- Kernel veya disk kaynakli I/O error

## 4. Triage

```bash
uptime
iostat -xz 1 5
vmstat 1 5
pidstat -d 1 5
iotop -oPa
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,MODEL
sudo dmesg -T | rg -i 'i/o error|timeout|nvme|blk|ext4|xfs'
sudo journalctl -k -b --no-pager | tail -n 100
```

Bakilacak metrikler:

- `await` yuksek mi?
- `%util` 100'e yakin mi?
- IO tek bir process'ten mi geliyor?
- Kernel error veya storage reset var mi?

Eger CPU da yukseliyorsa `cpu-spike` runbook'una gec. Eger disk sadece doluysa `disk-full` runbook'una gec.

## 5. Safe Cleanup / Recovery

- Non-critical writer'lari durdur.
- Backup veya export islerini farkli zamana al.
- DB tarafinda gerekiyorsa yazma yogunlugunu azalt veya maintenance penceresi ac.
- Tek bir servis bu volume'u kirletiyorsa kontrollu restart yerine once write source'u kes.
- Disk error varsa yeniden denemeyi sonsuz donguye sokma; storage tarafini incele.

## 6. Escalation Criteria

- `iostat` idle host'ta bile yuksek await gosteriyorsa.
- Kernel'de I/O error, reset veya filesystem warning varsa.
- Tek volume etkileniyor ve genisleme / migrate gerekiyor ise.
- Yazma kesildikten sonra da latency normale donmuyorsa.

Bu durumda storage platformu, cloud provider veya hardware team'e escalation yap.

## 7. Verification

```bash
iostat -xz 1 5
vmstat 1 5
journalctl -u <service> --since "30 min ago" --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen sonuclar:

- `await` dusmeli, `%util` normale donmeli.
- Kernel logunda yeni storage error olmamali.
- Servis latency ve error rate normale dönmeli.
