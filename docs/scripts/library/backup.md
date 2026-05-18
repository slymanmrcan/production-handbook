# Database Backup Script

Güncelleme notu: bu sürüm, atomik yazım, concurrent-run kilidi, daha sıkı umask, gzip doğrulaması ve restore test notları ile production standardına yaklaştırıldı.

Bu script, Docker içindeki PostgreSQL veya MySQL veritabanı için tek dosyalık, rotasyonlu ve doğrulanabilir bir yedek üretir.

## Ne Yapar

- Container içindeki veritabanından dump alır
- Çıktıyı tarihli dosyaya yazar
- Başarılı bitmeyen yarım dosyayı hedefe taşımaz
- Eski backup'ları retention politikasına göre temizler
- Gzip bütünlüğünü kontrol eder

## Kullanım Notları

- Scripti önce staging host'ta çalıştır
- Production'da `systemd timer` ile tetikle, elle `nohup` kullanma
- Backup hesabına sadece gereken izinleri ver
- Secret'ları CLI argümanı olarak verme; Docker Secret veya mounted file kullan
- Restore testini ayrı bir adım olarak doğrula
- Aynı anda iki backup çalıştırma; kilit dosyası bunu engeller

Örnek kurulum:

```bash
install -d -m 0750 /var/backups/db
install -m 0755 backup-db.sh /usr/local/bin/backup-db.sh
bash -n /usr/local/bin/backup-db.sh
shellcheck /usr/local/bin/backup-db.sh
```

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

readonly BACKUP_DIR="/var/backups/db"
readonly CONTAINER_NAME="postgres_container_name"
readonly DB_USER="postgres"
readonly DB_NAME="myapp_db"
readonly RETENTION_DAYS=7
readonly TS="$(date +%F_%H%M%S)"
readonly BACKUP_FILE="${BACKUP_DIR}/db-${TS}.sql.gz"
readonly LOCK_DIR="${BACKUP_DIR}/.backup.lock"
tmp_file=""

log() {
  printf '[backup-db] %s\n' "$*"
}

die() {
  printf '[backup-db] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

cleanup() {
  rm -f "${tmp_file:-}" 2>/dev/null || true
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

main() {
  require_cmd docker
  require_cmd gzip
  require_cmd find
  require_cmd mktemp

  mkdir -p "$BACKUP_DIR"
  mkdir "$LOCK_DIR" 2>/dev/null || die "another backup is already running"
  trap cleanup EXIT

  tmp_file="$(mktemp "${BACKUP_DIR}/.db.${TS}.XXXXXX.sql.gz")"

  docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" >/dev/null 2>&1 \
    || die "container not found: $CONTAINER_NAME"
  if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" != "true" ]]; then
    die "container is not running: $CONTAINER_NAME"
  fi

  if ! docker exec "$CONTAINER_NAME" sh -lc 'command -v pg_dump >/dev/null 2>&1'; then
    die "pg_dump not found inside container: $CONTAINER_NAME"
  fi

  log "starting backup: ${CONTAINER_NAME}/${DB_NAME}"
  if ! docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$tmp_file"; then
    die "backup stream failed"
  fi
  gzip -t "$tmp_file"
  mv -f "$tmp_file" "$BACKUP_FILE"
  rm -f "$tmp_file"

  log "backup written: $BACKUP_FILE"
  log "rotating files older than ${RETENTION_DAYS} days"
  find "$BACKUP_DIR" -type f -name 'db-*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete
  log "backup verification: gzip integrity passed and file moved atomically"
}

main "$@"
```

MySQL için dump satırı şu şekilde değiştirilir:

```bash
docker exec -i "$CONTAINER_NAME" mysqldump -u "$DB_USER" --single-transaction "$DB_NAME" | gzip > "$tmp_file"
```

## Restore Testi

Yedek alma işinin gerçekten çalıştığını anlamak için restore testi zorunlu olmalıdır. En az bir staging veritabanında şu akışı doğrula:

```bash
gzip -t /var/backups/db/db-YYYY-MM-DD_HHMMSS.sql.gz
gunzip -c /var/backups/db/db-YYYY-MM-DD_HHMMSS.sql.gz | psql -U postgres -d test_restore_db
```

Production backup başarılı görünse bile restore test edilmediyse tam güvenme.
Secret gerektiren restore/backup işlerinde password'u komut satırına yazma; `POSTGRES_PASSWORD_FILE`, `docker secret` veya host üzerinde izinleri kısıtlı dosya kullan.

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Syntax doğru mu | `bash -n backup-db.sh` | Parse hatası olmamalı |
| Lint temiz mi | `shellcheck backup-db.sh` | Kritik hata olmamalı |
| Container hazır mı | `docker inspect <container> --format '{{.State.Running}}'` | `true` dönmeli |
| Backup dosyası üretildi mi | `ls -lh /var/backups/db/` | Tarihli `.sql.gz` dosyası görünmeli |
| Gzip sağlam mı | `gzip -t /var/backups/db/db-*.sql.gz` | Dosya bütünlüğü geçmeli |
| Restore doğrulandı mı | `gunzip -c ... | psql -v ON_ERROR_STOP=1 ...` | Dump geri yüklenmeli |
| Rotasyon çalıştı mı | `find /var/backups/db -mtime +7` | Eski dosyalar temizlenmeli |
