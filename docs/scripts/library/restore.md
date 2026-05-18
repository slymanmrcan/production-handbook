# Database Restore Script ♻️

> **GÜNCELLEME (v3):** Daha sıkı önkontroller, `umask`, destructive step guardrail'leri, psql `ON_ERROR_STOP` ve restore sonrası verify adımları eklendi.

Bu script, sıkıştırılmış Postgres yedeğini Docker içindeki veritabanına geri yükler.

> [!WARNING]
> Bu işlem hedef veritabanını siler ve yeniden oluşturur. Önce staging ortamında test edin.
> Restore başlamadan önce güncel volume snapshot veya ayrı bir backup alın.
> Secret'ları CLI argümanı olarak verme; Docker Secret veya mounted file kullan.

## Kullanım

```bash
nano /usr/local/bin/restore-db.sh
chmod +x /usr/local/bin/restore-db.sh
/usr/local/bin/restore-db.sh /var/backups/db/db-2026-03-28_0200.sql.gz --force
```

## Operasyonel Guardrails

- Bu script yalnızca bakım penceresinde çalıştırılmalıdır
- Aynı anda backup çalışıyorsa restore başlatma
- `postgres`, `template0` veya `template1` gibi sistem veritabanlarına restore yapma
- Hedef veritabanında canlı trafik varsa önce erişimi kapat veya trafiği başka yere yönlendir
- Hata olduğunda script non-zero exit ile durmalı; sessizce devam etmemeli

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
umask 077

BACKUP_FILE="${1:-}"
FORCE_FLAG="${2:-}"
CONTAINER_NAME="${CONTAINER_NAME:-postgres_container_name}"
DB_NAME="${DB_NAME:-myapp_db}"
DB_USER="${DB_USER:-postgres}"
LOCK_DIR="/tmp/restore-db.lock"

log() {
  printf '[restore-db] %s\n' "$*"
}

die() {
  printf '[restore-db] ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if [ -z "$BACKUP_FILE" ]; then
  die "Kullanim: $0 <backup_file.sql.gz> --force"
fi

if [ "$FORCE_FLAG" != "--force" ]; then
  die "Guvenlik icin ikinci arguman olarak --force vermelisiniz."
fi

if [ ! -f "$BACKUP_FILE" ]; then
  die "Backup dosyasi bulunamadi: $BACKUP_FILE"
fi

if ! command -v docker >/dev/null 2>&1; then
  die "docker komutu bulunamadi."
fi

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" >/dev/null 2>&1; then
  die "Container bulunamadi: $CONTAINER_NAME"
fi

if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" != "true" ]; then
  die "Container calismiyor: $CONTAINER_NAME"
fi

if [ "$DB_NAME" = "postgres" ] || [ "$DB_NAME" = "template0" ] || [ "$DB_NAME" = "template1" ]; then
  die "Sistem veritabani ustunde restore yapilamaz: $DB_NAME"
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  die "Baska bir restore zaten calisiyor"
fi

trap cleanup EXIT

log "Backup butunlugu kontrol ediliyor"
gzip -t "$BACKUP_FILE"

if ! docker exec "$CONTAINER_NAME" sh -lc 'command -v psql >/dev/null 2>&1 && command -v dropdb >/dev/null 2>&1 && command -v createdb >/dev/null 2>&1'; then
  die "psql/dropdb/createdb container icinde bulunamadi"
fi

log "Postgres erisimi test ediliyor"
docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" >/dev/null

log "Aktif baglantilar sonlandiriliyor"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -v db_name="$DB_NAME" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'db_name' AND pid <> pg_backend_pid();" >/dev/null

log "Veritabani yeniden olusturuluyor"
docker exec "$CONTAINER_NAME" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
docker exec "$CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME"

log "Backup import ediliyor"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null

log "Restore sonrasi kontroller"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c '\dt'
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c 'SELECT NOW();'
log "Restore tamamladi"
```

## Doğrulama

```bash
/usr/local/bin/restore-db.sh /var/backups/db/db-2026-03-28_0200.sql.gz --force
docker exec postgres_container_name psql -U postgres -d myapp_db -c '\dt'
docker exec postgres_container_name psql -U postgres -d myapp_db -c 'SELECT NOW();'
gzip -t /var/backups/db/db-2026-03-28_0200.sql.gz
```
