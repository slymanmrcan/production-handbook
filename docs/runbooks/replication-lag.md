# Replication Lag

Bu runbook, replication lag artisinda okuma tutarsizligi ve failover riskini azaltmak icin kullanilir. Amaç önce lag'i ölçmek, sonra lag yapan nedeni izole etmektir.

## Etki

- Replica stale veri döndürür.
- Read-only traffic yanlış sonuç alabilir.
- Failover kararı riskli hale gelir.
- Backup veya analytics job'ları gecikir.

## Tipik Failure Mode'lar

- Uzun süren transaction
- IO bottleneck
- Disk doluluğu
- Network gecikmesi
- Replika uygulamasi paused / broken
- WAL / binlog birikmesi
- Schema migration veya lock baskısı

## 1. Hemen Etkiyi Sinirla

- Lagli replica'ya giden read traffic'i kes.
- Failover'a acele etme; lag varken promote etmek veri kaybı üretebilir.
- Write-heavy job'ları geçici olarak durdur.

## 2. Postgres Triage

Primary tarafında:

```bash
psql -c "select application_name, state, sync_state, write_lag, flush_lag, replay_lag from pg_stat_replication;"
```

Replica tarafında:

```bash
psql -c "select pg_is_in_recovery();"
psql -c "select now() - pg_last_xact_replay_timestamp() as lag;"
psql -c "select pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
journalctl -u postgresql --since "30 min ago" --no-pager
```

## 3. MySQL / MariaDB Triage

```bash
mysql -e "SHOW REPLICA STATUS\\G"
mysql -e "SHOW SLAVE STATUS\\G"
journalctl -u mysql --since "30 min ago" --no-pager
```

Aranacak alanlar:

- `Seconds_Behind_Master`
- IO / SQL thread status
- Last error
- Relay log / binlog position

## 4. Host ve IO Kontrolu

```bash
uptime
free -h
df -h
df -i
top -b -n1 | head -n 30
```

IO sorunu şüphesi varsa:

```bash
iostat -xz 1 3 2>/dev/null || true
```

## 5. Hızlı Recovery

### Replica yeniden baglanma

Postgres'te replika bağlantısı düştüyse servis ve replication config kontrolü yap:

```bash
systemctl restart postgresql
```

MySQL'de:

```bash
mysql -e "START REPLICA;"
mysql -e "STOP REPLICA; START REPLICA;"
```

### Read traffic'i koru

Lag yüksekse kullanıcıya stale veri servis etmeyi durdurmak daha doğrudur. Read replica yerine primary kullanmayı geçici olarak düşün.

### Büyük backlog varsa yeniden kur

Lag saatler seviyesindeyse veya replication bozulmuşsa replica'yı yeniden seed etmek daha güvenli olabilir.

## 6. Dogrulama

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Replica recovery | `psql -c "select pg_is_in_recovery();"` | `t` dönmeli |
| Postgres lag | `psql -c "select now() - pg_last_xact_replay_timestamp();"` | Kabul edilebilir seviyede olmalı |
| MySQL lag | `mysql -e "SHOW REPLICA STATUS\\G"` | `Seconds_Behind_Master` düşük olmalı |
| Thread status | `mysql -e "SHOW REPLICA STATUS\\G" | rg 'Replica_IO_Running|Replica_SQL_Running'` | İki thread de çalışmalı |
| Host sağlığı | `df -h && free -h` | Disk ve memory pressure olmamalı |

## 7. Escalation Kriterleri

- Lag sürekli artıyorsa
- Replica error state'e girdiyse
- Primary tarafında yoğun lock / IO varsa
- WAL / binlog birikimi beklenmedik şekilde büyüyorsa
- Failover kararı veri kaybı riski taşıyorsa

## 8. Evidence Toplama

```bash
mkdir -p /tmp/incident-evidence
psql -c "select application_name, state, sync_state, write_lag, flush_lag, replay_lag from pg_stat_replication;" > /tmp/incident-evidence/pg-stat-replication.txt 2>&1
psql -c "select now() - pg_last_xact_replay_timestamp() as lag;" > /tmp/incident-evidence/pg-lag.txt 2>&1
mysql -e "SHOW REPLICA STATUS\\G" > /tmp/incident-evidence/mysql-replica-status.txt 2>&1
journalctl -u postgresql --since "1 hour ago" --no-pager > /tmp/incident-evidence/postgresql-journal.txt 2>&1
```
