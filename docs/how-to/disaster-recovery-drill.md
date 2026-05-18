# Disaster Recovery Drill (RPO / RTO / Restore Test)

Backup almak tek basina yeterli degil. **Geri donebiliyor musun?** Asil soru bu.

Bu rehber, yedeklerinizi sadece saklamayi degil, duzenli olarak geri donus tatbikati yapmayi standartlastirir.

## 1. Temel Kavramlar

| Terim | Anlam |
| :---- | :---- |
| **RPO** | Kabul edilebilir veri kaybi penceresi. Ornek: 15 dakika. |
| **RTO** | Servisi geri getirmek icin kabul edilen toplam sure. Ornek: 30 dakika. |

Ornek:

- Saat 10:00'da ariza oldu
- Elinizdeki son saglikli backup 09:50
- Sistem 10:20'de geri dondu

Bu durumda:

- Gerceklesen RPO: 10 dakika
- Gerceklesen RTO: 20 dakika

## 2. Hedef Tanimla

Tatbikat yapmadan once her kritik servis icin su tabloyu netlestirin:

| Sistem | RPO | RTO | Owner |
| :----- | :-- | :-- | :---- |
| Postgres | 15 dk | 30 dk | Platform |
| Redis cache | 1 saat | 15 dk | Platform |
| Uygulama dosyalari | 24 saat | 1 saat | DevOps |

RPO/RTO yoksa tatbikat "iyi hissettirdi" seviyesinde kalir.

## 3. Tatbikat Frekansi

Önerilen minimum takvim:

- Gunluk: backup job basarisi kontrolu
- Haftalik: backup butunlugu (`gzip -t`, checksum, off-site var mi)
- Aylik: staging restore testi
- Ceyreklik: tam DR drill ve sure ölçümü

## 4. Tatbikat Oncesi Checklist

```bash
date
hostname
ls -lh /var/backups/db
gzip -t /var/backups/db/<latest>.sql.gz
docker ps
```

Netlestirilecekler:

- Hangi backup artefakti restore edilecek?
- Hangi staging ortama donulecek?
- Mevcut prod verisine dokunulmayacagi nasil garanti edilecek?
- Tatbikat sonucu nereye kaydedilecek?

## 5. Ornek DR Drill Akisi

### A. Backup Artefaktini Dogrula

```bash
ls -lh /var/backups/db
gzip -t /var/backups/db/<latest>.sql.gz
sha256sum /var/backups/db/<latest>.sql.gz
```

### B. Restore Icın Staging Ortamini Hazirla

Staging DB container'i hazir olmalı:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker exec <staging-db> pg_isready -U <db_user>
```

### C. Geri Donusu Calistir

Bu repodaki restore standardi:

- [DB Restore (Geri Donus)](../scripts/library/restore.md)

Ornek:

```bash
time /usr/local/bin/restore-db.sh /var/backups/db/<latest>.sql.gz --force
```

### D. Smoke Test

```bash
docker exec <staging-db> psql -U <db_user> -d <db_name> -c '\dt'
docker exec <staging-db> psql -U <db_user> -d <db_name> -c 'SELECT NOW();'
curl -fsS https://staging.example.com/healthz
```

### E. Veri Tutarliligi Kontrolu

Örnek kontroller:

```bash
docker exec <staging-db> psql -U <db_user> -d <db_name> -c 'SELECT COUNT(*) FROM users;'
docker exec <staging-db> psql -U <db_user> -d <db_name> -c 'SELECT COUNT(*) FROM orders;'
```

Amac birebir sayi ezberlemek degil; restore sonrasi bariz veri kopuklugu var mi görmek.

## 6. Ölç ve Kaydet

Tatbikat sonunda su sorularin cevabi yazilmali:

- Restore kac dakika surdu?
- En yavas adim neydi?
- Backup dosyasi kolayca bulunabildi mi?
- Credentials, key veya script eksigi var miydi?
- Hedef RPO/RTO karsilandi mi?

Ornek rapor satiri:

```text
2026-03-28 | Postgres | Backup: 02:00 | Restore finish: 02:18 | RPO: 12 dk | RTO: 18 dk | Result: PASS
```

## 7. Off-Site ve Ayriştirma

Su durum DR sayilmaz:

- backup ayni hostta duruyorsa
- restore scripti tek bir kisinin laptopunda ise
- restore icin gereken sifreler belgesiz ise
- staging ortam yoksa

Asgari gereksinim:

- local backup
- off-site backup
- staging restore ortami
- dokumante restore adimlari

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Backup varligi | `ls -lh /var/backups/db` | Son backup gorunmeli. |
| Butunluk testi | `gzip -t /var/backups/db/<latest>.sql.gz` | Hata dönmemeli. |
| Restore suresi | `time /usr/local/bin/restore-db.sh ... --force` | Ölçulen sure kayda gecmeli. |
| DB health | `docker exec <staging-db> pg_isready -U <db_user>` | `accepting connections` dönmeli. |
| Uygulama smoke test | `curl -fsS https://staging.example.com/healthz` | 200/healthy dönmeli. |
| RPO / RTO uyumu | Tatbikat raporu | Hedef degerlerle karsilastirilmali. |

## 9. Sonraki Adim

Bu rehberi su belgelerle birlikte kullanin:

- [Yedekleme Stratejisi ve Otomasyonu](backups.md)
- [Database Backup Script](../scripts/library/backup.md)
- [Database Restore Script](../scripts/library/restore.md)

Backup'i otomatiklestirmek ilk adimdir. Restore'u ölçmek ise olgunluk seviyesidir.
