# Advanced Cheat Sheet

Bu sayfa ilk triage sırasında bakılacak kısa komut setidir. Amaç teşhis koymak değil, doğru probleme hızlıca yaklaşmaktır.

## İlk Bakış

```bash
systemctl --failed
journalctl -p 3 -xb --no-pager
uptime
free -h
df -h
ss -tulpn
ip route
```

Bu çıktıların amacı:

- servis mi düşmüş
- host mu sıkışmış
- network mü bozulmuş
- disk veya RAM mi tükenmiş

## CPU ve Process

| Sorun | Komut | Ne Aranır |
| :--- | :--- | :--- |
| CPU baskısı | `mpstat -P ALL 1` | tek çekirdek mi, tüm host mu dolu |
| Çalışan süreçler | `ps aux --sort=-%cpu \| head` | en ağır süreçler |
| Süreç ağacı | `ps fax` | zombie, parent-child zinciri |
| Kernel beklemesi | `vmstat 1` | `r` ve `b` sütunları |
| Hangi sys-call takılıyor | `strace -p <PID> -f -e trace=file,network` | dosya mı, ağ mı, lock mı |

## Memory

| Sorun | Komut | Ne Aranır |
| :--- | :--- | :--- |
| RAM tüketimi | `ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem \| head -10` | büyüyen süreçler |
| Swap baskısı | `vmstat 1` | `si` ve `so` değerleri |
| Genel durum | `free -h` | `available` alanı |
| OOM izi | `journalctl -k -b --no-pager \| rg -i 'oom|out of memory|killed process'` | kernel kill mesajı |

## Disk ve IO

| Sorun | Komut | Ne Aranır |
| :--- | :--- | :--- |
| Disk doluluğu | `df -h` | mount point yüzde 90 üstü mü |
| Inode doluluğu | `df -i` | inode exhaustion |
| IO baskısı | `iostat -xz 1` | `await`, `util`, queue |
| IO yazan süreç | `iotop -oPa` | hangi process diski zorluyor |
| Büyük dizin | `du -h --max-depth=1 /var \| sort -hr` | büyüyen klasör |

## Network

| Sorun | Komut | Ne Aranır |
| :--- | :--- | :--- |
| Dinleyen portlar | `ss -tulpn` | beklenmeyen servis |
| Connection state | `ss -plant` | çok fazla `SYN-SENT`, `TIME-WAIT`, `CLOSE-WAIT` |
| DNS | `resolvectl status` | resolver doğru mu |
| Route | `ip route get 1.1.1.1` | doğru gateway |
| Path | `mtr -rw example.com` | loss ve latency nerede başlıyor |
| Paket yakalama | `tcpdump -i eth0 -nn port 443 -c 50` | handshake, reset, retransmit |

## Logs

```bash
journalctl -u <unit> -b -n 200 --no-pager
journalctl -u <unit> --since "1 hour ago" --no-pager
journalctl -xeu <unit>
```

Kural:

- önce boot scoped log bak
- sonra servis scoped log bak
- sonra kernel log'a in

## Yüksek Riskli Komutlar

```bash
kill -9 <pid>
systemctl restart <critical-service>
ip link set <iface> down
nft flush ruleset
```

- `kill -9` cleanup bırakmaz
- kritik servisi restart etmeden önce etkisini doğrula
- network interface down erişimi kesebilir
- firewall flush uzak erişimi düşürebilir
