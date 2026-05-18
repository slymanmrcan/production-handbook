# Disk Dolu Mudahalesi

Bu runbook, root filesystem veya bir data volume doldugunda uygulanir. Disk dolulugu yazma hatalarina, deploy failure'a, log kaybina ve servis kesintisine yol acabilir.

## 1. Etki ve Belirtiler

- `No space left on device` hatasi gorulur.
- Yeni dosya yazilamaz, log akisi durur, DB veya uygulama yazmalari fail olur.
- Container restart loop baslayabilir.
- Health check timeout, 5xx artis ve deploy rollback gorulebilir.

## 2. Immediate Containment

- Deploy, backup, batch job ve log-heavy task'leri durdur.
- Tek bir servis diski dolduruyorsa o servisi gecici olarak durdur.
- Trafik alan bir node ise, saglam replica varsa node'u load balancer'dan cikar.
- Yeni dosya ureten problem cozulmeden rastgele silme yapma.

```bash
systemctl stop <heavy-service>
```

## 3. Likely Failure Modes

- `/var/log` altinda buyuk loglar
- Docker build cache, overlay2 ve dangling image'lar
- `/tmp`, cache dizinleri ve uygulama gecici dosyalari
- Backup dosyalari veya dump'lar
- DB data volume veya journal dosyalari
- Deleted ama hala process tarafindan acik tutulan dosyalar

## 4. Triage

Once hangi mount'un doldugunu gor:

```bash
df -hT
findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS
sudo du -xhd1 /var /home /opt /tmp 2>/dev/null | sort -h
sudo journalctl --disk-usage
sudo docker system df
sudo lsof +L1
sudo dmesg -T | rg -i 'no space|ext4|xfs|i/o error|readonly'
```

Bakilacak sinyaller:

- Hangi mount noktasi `%100`?
- En buyuk dizin log mu, cache mi, backup mi?
- `lsof +L1` deleted-open file gosteriyor mu?
- Kernel'de filesystem remount veya I/O error var mi?

## 5. Safe Cleanup / Recovery

Temizlik oncesi neyi sildigini netlestir. Oncelik sirasini bozma.

```bash
sudo journalctl --vacuum-time=7d
sudo apt clean
sudo docker builder prune -f
sudo docker image prune -f
```

- Aktif log dosyasinda yer acman gerekiyorsa `rm` yerine `truncate -s 0` kullan.
- Uygulamaya ait cache veya tmp dizinlerini temizle; global `/tmp`'yi rastgele silme.
- `lsof +L1` deleted-open file gosteriyorsa ilgili process'i kontrollu restart et.
- Diski veri kaybi ile temizlemek yerine, kalici cozum gerekiyorsa volume genisletmeyi degerlendir.

```bash
sudo truncate -s 0 /var/log/<service>.log
sudo systemctl restart <service>
```

## 6. Escalation Criteria

- Cleanup sonrasi disk yine hizla doluyorsa.
- Root filesystem `%95` altina inmiyorsa.
- Sorun DB/data volume uzerinde ise ve silinebilir veri yoksa.
- Kernel filesystem'i read-only moda cektiyse veya I/O error devam ediyorsa.

Bu durumda storage expansion, snapshot-based recovery veya platform ekibine escalation gerekir.

## 7. Verification

```bash
df -hT
df -i
sudo journalctl -u <service> --since "30 min ago" --no-pager
curl -fsS http://127.0.0.1:<port>/healthz
```

Beklenen sonuclar:

- Sorunlu mount `%90` altina inmis olmali.
- Yeni `No space left on device` logu gelmemeli.
- Servis log yazabiliyor ve health check geciyor olmali.

## 8. Ilgili Runbook

- Inode tukenmesi icin: [Inode Dolu](inode-full.md)
- Genel servis geri kazanimi icin: [Servis Kesintisi](service-down.md)
