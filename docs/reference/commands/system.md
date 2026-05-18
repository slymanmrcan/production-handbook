# Sistem ve Süreç Yönetimi

Servis yönetimi, log inceleme ve kilitlenen süreçleri kontrol etmek için hızlı referans.

## Hızlı Triyaj

Önce servis mi düştü, sistem mi zorlanıyor, süreç mi kilitlendi?

```bash
systemctl --failed
systemctl status nginx --no-pager -l
journalctl -u nginx -b -n 200 -e
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
uptime
free -h
```

- `systemctl --failed` problemli servisleri tek listede verir.
- `status -l` log kırpmasını kapatır, tam hata mesajını gösterir.
- `uptime` load average için hızlı eşiktir; `free -h` bellek baskısını gösterir.

## Servis Yönetimi

Sadece neyi etkilediğini biliyorsan restart et.

```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo systemctl reload-or-restart nginx
sudo systemctl enable nginx
sudo systemctl disable nginx
sudo systemctl mask nginx
sudo systemctl unmask nginx
```

- `reload` varsa önce onu dene; stateful servislerde restart daha risklidir.
- `mask` servisi tamamen kapatır; troubleshooting dışında dikkatli kullan.

## Unit ve Override İncelemesi

Servis dosyasını anlamak ve güvenli override görmek için.

```bash
systemctl cat nginx
systemctl show -p FragmentPath,DropInPaths,MainPID,ExecMainStatus nginx
sudo systemctl edit nginx
sudo systemctl edit nginx --full
sudo systemd-analyze verify /etc/systemd/system/nginx.service
```

- `systemctl cat` vendor unit + drop-in'leri birlikte gösterir.
- Önce `edit` ile drop-in, mecbursa `--full` ile tam kopya.
- `verify` unit syntax ve bağımlılık hatalarını yakalar.

## Log İnceleme

Systemd journal en güvenilir ilk kaynaktır.

```bash
journalctl -u nginx -b -e
journalctl -u nginx -f
journalctl -u nginx --since "1 hour ago"
journalctl -p err -b
journalctl -xeu nginx
```

- `-b` mevcut boot'u filtreler; reboot sonrası eski gürültüden kurtarır.
- `-xeu` servis hatasını context ile verir.

## Süreç Yönetimi

Önce nazik sinyal, sonra zorla kapatma.

```bash
ps aux | grep python
kill -TERM 1234
kill 1234
kill -9 1234
pkill -f "python main.py"
nice -n 10 command
renice +10 1234
```

- `TERM` çoğu süreç için doğru ilk adımdır.
- `kill -9` son çaredir; cleanup ve flush şansını alır.
- `nice` ve `renice` ile öncelik ayarlanabilir, süreç öldürmeden sorun hafifletilebilir.

## Sistem Sağlığı

CPU, boot ve kernel tarafında ek kontrol gerekirse:

```bash
systemd-analyze blame
systemd-analyze critical-chain
dmesg -T | tail -n 50
loginctl list-sessions
who
last -a | head
```

- `blame` yavaş boot zincirini gösterir.
- `dmesg` kernel ve driver hataları için kritiktir.

## Doğrulama

Restart, deploy veya override sonrası:

```bash
systemctl is-active nginx
systemctl is-enabled nginx
systemctl status nginx --no-pager -l
journalctl -u nginx -b -n 50
```

## Yüksek Riskli Komutlar

```bash
kill -9 <pid>
systemctl stop ssh
systemctl isolate rescue.target
systemctl daemon-reload
```

- `kill -9` state cleanup bırakmaz; önce `TERM` dene.
- `systemctl stop ssh` uzaktan erişimi kesebilir.
- `daemon-reload` unit değişikliği sonrası gerekir, ama yanlış zamanda yaparsan hata gizleyebilir; önce unit doğrula.
