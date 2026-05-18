# Script Yazım Standartları

Üretimde çalışan bir Bash script, sadece "çalışıyor" diye kabul edilmez. Hata anında nasıl durduğuna, log üretimine, idempotency davranışına ve test edilebilirliğine de bakılır.

## 1. Strict Mode

Her script şu iskeletle başlamalı:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
```

Bu kombinasyonun anlamı:

- `-e`: beklenmeyen hatada dur
- `-u`: tanımsız değişkeni hata say
- `-o pipefail`: boru hattında ilk hatayı da görünür yap
- `-E`: `trap` ve hata yakalama davranışını koru

`IFS=$'\n\t'` ayarı, boşluklu değerlerin yanlış bölünmesini azaltır. Yine de asıl savunma quote etmektir.

## 2. İsimlendirme

- `readonly` sabitler ve exported environment değişkenleri için büyük harf kullan
- script içi yerel değişkenler için küçük harf kullan
- command, path ve container isimleri açık ve okunur olsun

Örnek:

```bash
readonly BACKUP_DIR="/var/backups/db"
readonly RETENTION_DAYS=7
backup_file=""
```

Kötü örnek:

```bash
BACKUPDIR="/tmp"
```

## 3. Fonksiyon Yapısı

Her scriptte şu temel fonksiyonlar olmalı:

- `log` veya `log_info`
- `die`
- `usage`
- `main`

Örnek iskelet:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_PREFIX="[${SCRIPT_NAME}]"

log() {
  printf '%s %s\n' "$LOG_PREFIX" "$*"
}

die() {
  printf '%s ERROR: %s\n' "$LOG_PREFIX" "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Kullanım: script.sh [options]
EOF
}

main() {
  log "başladı"
}

main "$@"
```

## 4. Hata ve Exit Davranışı

Hata çıktısı ile normal çıktı birbirine karışmamalı. Kritik işlem yapan scriptlerde `trap` kullan.

```bash
trap 'die "satır $LINENO civarında hata oluştu"' ERR
```

Destructive bir adım atmadan önce açık doğrulama yap. Örneğin boş path, root kontrolü veya allowlist olmadan devam etme.

## 5. Logging Standardı

`echo` ile rastgele basmak yerine tutarlı log kullan.

Örnek:

```bash
log_info() { printf '[INFO] %s\n' "$*"; }
log_warn() { printf '[WARN] %s\n' "$*" >&2; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }
```

Kural:

- kullanıcıya yönelik çıktı kısa olsun
- hata çıktısı `stderr`'e gitsin
- secret içeren hiçbir veri log'lanmasın

## 6. Tehlikeli Alanlar

- `eval` kullanma
- word splitting'e güvenme
- `for item in $(...)` kalıbından kaçın
- `cat file | grep ...` yerine doğrudan `grep ... file` kullan
- `ls` çıktısını parse ederek karar verme

## 7. ShellCheck ve Syntax

Commit öncesi minimum doğrulama:

```bash
bash -n my-script.sh
shellcheck my-script.sh
```

Script izinleri de açık olmalı:

```bash
install -m 0755 my-script.sh /usr/local/bin/my-script.sh
```

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Strict mode var mı | `head -n 5 <script>.sh` | `env bash`, `-Eeuo pipefail` ve `IFS` görünmeli |
| Syntax doğru mu | `bash -n <script>.sh` | Parse hatası olmamalı |
| Lint temiz mi | `shellcheck <script>.sh` | Kritik lint hatası olmamalı |
| Help mesajı var mı | `<script>.sh --help` | Kullanım metni dönmeli |
| Root kontrolü gerekli mi | `id -u` ve script kontrolü | Yetki modeli net olmalı |
