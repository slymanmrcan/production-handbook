# Backup Restore Basarisiz

Bu runbook, geri donus testinin veya acil restore operasyonunun basarisiz oldugu durumlar icindir. Ana hedef, backup arşivini bozmadan sorunu izole etmek ve güvenli bir alternatif restore yolu bulmaktir.

## Etki

- DR drill gecmez.
- Gercek incident aninda restore gecikmesi olur.
- Veri kaybi riskine dair güven azalir.
- Backup job'larin "basarili" gorunmesi aldatıcı olabilir.

## Tipik Failure Mode'lar

- Archive bozuk veya eksik.
- Yanlis format: gzip, tar, pg_dump custom format karisik.
- DB versiyon uyumsuzlugu.
- Sifre, kullanıcı veya container ismi hatali.
- Restore hedefinde disk yetmiyor.
- Dump dosyasi schema ile uyumsuz.

## 1. İlk Kontrol

Önce dosyanin gerçekten ne oldugunu dogrula:

```bash
ls -lh /var/backups/db
file /var/backups/db/<latest>.sql.gz
gzip -t /var/backups/db/<latest>.sql.gz
sha256sum /var/backups/db/<latest>.sql.gz
```

Eger restore custom Postgres dump ise:

```bash
gunzip -c /var/backups/db/<latest>.sql.gz | head
```

Beklenen:

- Dosya boyutu mantikli olmalı.
- `gzip -t` hata vermemeli.
- Dosya içeriği beklenen SQL / dump header'ını göstermeli.

## 2. Hedef Ortami Dogrula

Restore'u mümkünse prod üzerinde degil, staging veya scratch database üzerinde deneyin.

```bash
df -h
docker ps --format 'table {{.Names}}\t{{.Status}}'
systemctl status postgresql --no-pager
```

Postgres container ise:

```bash
docker exec <db-container> pg_isready -U <db_user>
```

## 3. Restore Türünü Tespit Et

### Postgres plain SQL

```bash
gunzip -c backup.sql.gz | psql -U <db_user> -d <db_name>
```

### Postgres custom / directory format

```bash
pg_restore -l backup.dump
pg_restore -U <db_user> -d <db_name> backup.dump
```

### MySQL / MariaDB

```bash
gunzip -c backup.sql.gz | mysql -u <db_user> -p <db_name>
```

## 4. Güvenli Restore Akışı

Önce veriyi ezmeden önce küçük bir doğrulama yapın:

```bash
gunzip -t /var/backups/db/<latest>.sql.gz
```

Sonra scratch DB oluşturun:

```bash
createdb -U <db_user> restore_test
gunzip -c /var/backups/db/<latest>.sql.gz | psql -U <db_user> -d restore_test
```

Restored data'yı test edin:

```bash
psql -U <db_user> -d restore_test -c '\dt'
psql -U <db_user> -d restore_test -c 'SELECT COUNT(*) FROM <critical_table>;'
```

## 5. Sık Gorulen Sorunlar ve Cozumleri

### Corrupt archive

Belirti:

- `gzip -t` fail
- `unexpected end of file`

Yapılacaklar:

- Farklı backup dosyasını dene.
- Backup job log'unu incele.
- Off-site kopya varsa ondan restore et.

### Format uyumsuzlugu

Belirti:

- `psql` ile açılmıyor
- `pg_restore` "custom format" bekliyor

Yapılacaklar:

```bash
file backup.dump
pg_restore -l backup.dump
```

### Yetki veya container sorunu

Belirti:

- `permission denied`
- container bulunamıyor

Yapılacaklar:

```bash
docker ps
docker inspect <db-container>
id
```

### Disk yetmiyor

Belirti:

- restore yarida kaliyor
- `No space left on device`

Yapılacaklar:

```bash
df -h
du -sh /var/backups /tmp /var/lib/docker 2>/dev/null
```

## 6. Alternatif Backup'i Dene

Restore basarisizsa bir onceki güvenli backup'a dön:

```bash
ls -1t /var/backups/db
gzip -t /var/backups/db/<older>.sql.gz
```

Eger off-site kopya varsa önce onu retrieve et.

## 7. Ne Zaman Durmalı

Su durumda denemeyi durdur ve escalation et:

- Son 2 backup da bozuksa.
- Dump formatı bilinmiyorsa.
- Restore için gerekli DB sürümü belirsizse.
- Veriyi test etmek için staging ortam yoksa.
- Prod DB üzerinde deneme yapmak zorunda kalındıysa.

## 8. Verification

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Archive sağlam mı | `gzip -t /var/backups/db/<latest>.sql.gz` | Hata olmamalı |
| Dosya tipi ne | `file /var/backups/db/<latest>.sql.gz` | Beklenen compression/dump tipi görünmeli |
| Restore calisti mi | `psql -U <db_user> -d restore_test -c '\dt'` | Tablolar görünmeli |
| Veri var mı | `psql -U <db_user> -d restore_test -c 'SELECT COUNT(*) FROM <critical_table>;'` | Mantikli sayi dönmeli |
| DB baglantisi | `pg_isready -U <db_user>` | `accepting connections` olmalı |

## 9. Escalation Kriterleri

Su durumda data recovery uzmanı veya platform owner devreye girmeli:

- Backup zinciri kırık ise.
- Restore testleri 2 kez arka arkaya başarısız olduysa.
- Aynı hata farklı backup versiyonlarında da çıkıyorsa.
- Prod verisine yanlış restore yapma riski oluştuysa.

## 10. Not Al

Kayda geçir:

- Hangi backup dosyası denendi
- Hangi komut fail oldu
- Hata mesajı
- Alternatif backup sonucu
- Restore tamamlandıysa checksum / row count sonucu
