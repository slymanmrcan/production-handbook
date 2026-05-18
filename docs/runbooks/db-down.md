# Veritabani Down

Bu runbook, production veritabanina uygulama erisimi kesildiginde ilk yapilacak triage ve geri getirme adimlarini kapsar. Odak: servisi hizli ayaga kaldirmak, veri kaybi riskini azaltmak ve root cause'u kayda almak.

## Etki

- Uygulama login, checkout, write operasyonlari veya arka plan job'lari hata verir.
- API tarafinda `500`, `502` veya timeout gorulebilir.
- Queue backlog artabilir.
- Uygulama bazen calisir ama DB baglantisi kuramaz.

## Tipik Failure Mode'lar

- Disk dolu veya inode tukenmis.
- DB servisi stop olmus veya crash loop'a girmis.
- OOM kill veya bellek pressure.
- Yanlis migration veya schema lock.
- Network / security group / firewall problemi.
- Replication lag veya failover gecikmesi.
- Yetki / parola / secret bozulmasi.

## 1. Hemen Etkiyi Sinirla

Amac oncelikle daha fazla bozulmayi durdurmak:

- Yeni deploy'u durdur.
- Batch / cron / worker yazma trafiklerini kes.
- Gerekirse uygulamayi maintenance moduna al.
- Prod DB'ye yeni schema migration baslatma.

Ornek:

```bash
systemctl stop app 2>/dev/null || true
docker stop app 2>/dev/null || true
```

## 2. DB Servisini Tespit Et

Hangi veritabani calisiyor, once bunu netlestir:

```bash
systemctl list-units --type=service | rg 'postgresql|mysql|mariadb|mongodb'
ss -ltnp | rg ':(5432|3306|3307|27017)\b'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Postgres ornegi:

```bash
systemctl status postgresql --no-pager
journalctl -u postgresql --since "30 min ago" --no-pager
```

MySQL / MariaDB ornegi:

```bash
systemctl status mysql --no-pager
journalctl -u mysql --since "30 min ago" --no-pager
journalctl -u mariadb --since "30 min ago" --no-pager
```

Docker icinde DB calisiyorsa:

```bash
docker logs --tail 200 <db-container>
docker inspect <db-container> --format '{{.State.Status}} {{.State.OOMKilled}}'
```

## 3. Host Sagligini Kontrol Et

DB down gorunse bile sorun host seviyesinden geliyor olabilir.

```bash
uptime
free -h
df -h
df -ih
top -b -n1 | head -n 30
```

Aranacak seyler:

- `df -h` ile disk doluluk.
- `df -ih` ile inode doluluk.
- `free -h` ile memory pressure.
- `top` ile CPU spike veya runaway process.

Eger disk veya inode doluysa once alan acin, sonra servisi tekrar deneyin.

## 4. Baglanti ve Port Kontrolu

DB portu lokal veya network seviyesinde gorunuyor mu?

```bash
nc -vz 127.0.0.1 5432
nc -vz 127.0.0.1 3306
ss -ltnp | rg '5432|3306'
```

Uzak host baglantisi gerekiyorsa firewall ve security group tarafini da kontrol edin.

## 5. Yaygin Triage Akisi

### A. Servis Calisiyor mu?

```bash
systemctl is-active postgresql
systemctl is-active mysql
systemctl is-active mariadb
```

### B. Config veya Auth Degisti mi?

```bash
rg -n 'listen|bind|port|host|password|ssl|replica' /etc/postgresql /etc/mysql /etc/my.cnf /etc/my.cnf.d 2>/dev/null
```

### C. Disk / Memory / OOM Var mi?

```bash
journalctl -k --since "1 hour ago" --no-pager | rg 'oom|killed process|out of memory'
dmesg -T | rg 'oom|killed process|out of memory'
```

### D. DB Login Deneniyor mu?

Postgres:

```bash
sudo -u postgres psql -c 'SELECT 1;'
```

MySQL:

```bash
mysql -u root -p -e 'SELECT 1;'
```

### E. Replication veya Recovery Durumu Var mi?

Postgres:

```bash
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
sudo -u postgres psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
```

## 6. Hızlı Recovery Seçenekleri

### Servis restart

Servis calisiyor ama takildiysa:

```bash
systemctl restart postgresql
systemctl restart mysql
systemctl restart mariadb
```

Docker ise:

```bash
docker restart <db-container>
```

### Disk temizligi

Log veya temporary dosya alanı dolduysa:

```bash
journalctl --vacuum-time=3d
du -sh /var/log/*
```

### Yanlis config geri alma

Son degisiklik config kaynaklıysa onceki config'i geri koyun ve service test yapın:

```bash
sshd -t 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true
systemctl restart postgresql 2>/dev/null || true
```

### Replication / failover

Primary down, standby hazir ise failover prosedurunu sirket standardina gore calistirin. Bu runbook failover araci sağlamıyorsa burada el ile risk almayin; escalation edin.

## 7. Verification

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Servis aktif mi | `systemctl is-active postgresql` | `active` olmalı |
| DB login calisiyor mu | `sudo -u postgres psql -c 'SELECT 1;'` | `1` dönmeli |
| Port acik mi | `ss -ltnp | rg '5432|3306'` | DB portu dinlemeli |
| Disk sorunu var mi | `df -h` | Kritik partition `%90` üstü olmamalı |
| OOM izleri var mi | `journalctl -k --since "1 hour ago" | rg 'oom|killed process'` | Yeni OOM olmamalı |
| Uygulama baglantisi | `curl -fsS https://<app>/healthz` | DB baglantili health check geçmeli |

## 8. Escalation Kriterleri

Su durumlarda daha fazla restart denemeyin:

- Disk / inode tekrar tekrar doluyorsa.
- DB recovery 10 dakikadan uzun sürüyorsa.
- Backup restore gerekiyorsa ama son backup dogrulanamadiysa.
- Replication lag artıyorsa veya veri tutarlılığı belirsizse.
- Auth / secret problemi çözülmeden servis kalkmıyorsa.

## 9. Kayit Altina Al

Olay sonunda kayda gecir:

- Baslangic zamani
- Etkilenen servisler
- Gorulen error mesajlari
- Yapilan komutlar
- Restart sayisi
- Varsa recover edilen backup veya failover adimi
