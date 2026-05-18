# Bash Script Yazma Rehberi 📜

Bu rehber, production ortamlarında kullanılacak **güvenli, okunabilir ve bakımı kolay** Bash script'leri yazmanız için gereken her şeyi içerir.

---

## 📋 İçindekiler

1. [Temel Syntax](#temel-syntax)
2. [Değişkenler ve String İşlemleri](#degiskenler)
3. [Koşullar ve Döngüler](#kosullar-donguler)
4. [Fonksiyonlar](#fonksiyonlar)
5. [Dosya İşlemleri](#dosya-islemleri)
6. [Log Analizi](#log-analizi)
7. [Hata Yönetimi](#hata-yonetimi)
8. [Production Script Şablonu](#production-sablon)

---

## 🚀 Temel Syntax {#temel-syntax}

### Shebang ve Strict Mode

**Her script şununla başlamalı:**

```bash
#!/bin/bash
set -euo pipefail
# -e: Hata olunca dur
# -u: Tanımsız değişken kullanımında dur
# -o pipefail: Pipe'da hata olunca dur
```

### Yorum Satırları

```bash
# Tek satır yorum

: '
Çok satırlı
yorum bloğu
'
```

### Komut Çalıştırma

```bash
# Komut çıktısını değişkene at
OUTPUT=$(ls -la)
OUTPUT=`ls -la`  # Eski yöntem (kullanma)

# Komut başarılı mı kontrol et
if command -v docker &> /dev/null; then
    echo "Docker kurulu"
fi
```

---

## 📦 Değişkenler ve String İşlemleri {#degiskenler}

### Değişken Tanımlama

```bash
# Basit değişken
NAME="John"
AGE=30

# Ortam değişkeni (tüm child process'lere aktarılır)
export DB_HOST="localhost"

# Read-only değişken
readonly API_KEY="secret123"

# Dizi (Array)
SERVERS=("web1" "web2" "db1")
echo "${SERVERS[0]}"  # web1
echo "${SERVERS[@]}"  # Tüm elemanlar
echo "${#SERVERS[@]}" # Eleman sayısı
```

### String İşlemleri

```bash
TEXT="Hello World"

# Uzunluk
echo "${#TEXT}"  # 11

# Substring
echo "${TEXT:0:5}"  # Hello
echo "${TEXT:6}"    # World

# Değiştirme
echo "${TEXT/World/Bash}"  # Hello Bash (ilk eşleşme)
echo "${TEXT//o/0}"        # Hell0 W0rld (tüm eşleşmeler)

# Büyük/küçük harf
echo "${TEXT^^}"  # HELLO WORLD
echo "${TEXT,,}"  # hello world

# Varsayılan değer
echo "${UNDEFINED_VAR:-default}"  # default
echo "${UNDEFINED_VAR:=default}"  # default ve değişkene ata
```

### String Birleştirme

```bash
FIRST="John"
LAST="Doe"

# Yöntem 1
FULL="$FIRST $LAST"

# Yöntem 2
FULL="${FIRST} ${LAST}"

# Yöntem 3 (printf)
FULL=$(printf "%s %s" "$FIRST" "$LAST")
```

---

## 🔀 Koşullar ve Döngüler {#kosullar-donguler}

### If-Else

```bash
# Sayı karşılaştırma
if [ $AGE -gt 18 ]; then
    echo "Yetişkin"
elif [ $AGE -eq 18 ]; then
    echo "Tam 18"
else
    echo "Çocuk"
fi

# String karşılaştırma
if [ "$NAME" = "John" ]; then
    echo "Merhaba John"
fi

# Dosya kontrolleri
if [ -f "/etc/passwd" ]; then
    echo "Dosya var"
fi

if [ -d "/var/log" ]; then
    echo "Dizin var"
fi

# Çoklu koşul
if [ $AGE -gt 18 ] && [ "$NAME" = "John" ]; then
    echo "Yetişkin John"
fi

# Modern syntax (daha güvenli)
if [[ $AGE -gt 18 && "$NAME" == "John" ]]; then
    echo "Yetişkin John"
fi
```

### Karşılaştırma Operatörleri

| Operatör | Anlamı            | Örnek              |
| :------- | :---------------- | :----------------- |
| `-eq`    | Eşit              | `[ $A -eq $B ]`    |
| `-ne`    | Eşit değil        | `[ $A -ne $B ]`    |
| `-gt`    | Büyük             | `[ $A -gt $B ]`    |
| `-ge`    | Büyük veya eşit   | `[ $A -ge $B ]`    |
| `-lt`    | Küçük             | `[ $A -lt $B ]`    |
| `-le`    | Küçük veya eşit   | `[ $A -le $B ]`    |
| `=`      | String eşit       | `[ "$A" = "$B" ]`  |
| `!=`     | String eşit değil | `[ "$A" != "$B" ]` |
| `-z`     | String boş        | `[ -z "$A" ]`      |
| `-n`     | String boş değil  | `[ -n "$A" ]`      |

### Dosya Test Operatörleri

| Operatör | Anlamı                 |
| :------- | :--------------------- |
| `-f`     | Normal dosya           |
| `-d`     | Dizin                  |
| `-e`     | Var (dosya veya dizin) |
| `-r`     | Okunabilir             |
| `-w`     | Yazılabilir            |
| `-x`     | Çalıştırılabilir       |
| `-s`     | Boş değil              |

### For Döngüsü

```bash
# Basit döngü
for i in 1 2 3 4 5; do
    echo "Sayı: $i"
done

# Range
for i in {1..10}; do
    echo "Sayı: $i"
done

# Artış miktarı ile
for i in {0..100..10}; do
    echo "Sayı: $i"  # 0, 10, 20, ...
done

# Dizi üzerinde
SERVERS=("web1" "web2" "db1")
for server in "${SERVERS[@]}"; do
    echo "Sunucu: $server"
done

# Dosyalar üzerinde
for file in /var/log/*.log; do
    echo "Log: $file"
done

# C-style
for ((i=0; i<10; i++)); do
    echo "Sayı: $i"
done
```

### While Döngüsü

```bash
# Basit while
COUNT=0
while [ $COUNT -lt 5 ]; do
    echo "Sayı: $COUNT"
    ((COUNT++))
done

# Dosya okuma
while IFS= read -r line; do
    echo "Satır: $line"
done < /etc/passwd

# Sonsuz döngü
while true; do
    echo "Çalışıyor..."
    sleep 1
done
```

### Case Statement

```bash
read -p "Seçim (1-3): " CHOICE

case $CHOICE in
    1)
        echo "Birinci seçenek"
        ;;
    2)
        echo "İkinci seçenek"
        ;;
    3)
        echo "Üçüncü seçenek"
        ;;
    *)
        echo "Geçersiz seçim"
        exit 1
        ;;
esac
```

---

## 🔧 Fonksiyonlar {#fonksiyonlar}

### Basit Fonksiyon

```bash
# Tanımlama
greet() {
    echo "Merhaba $1"
}

# Çağırma
greet "John"  # Merhaba John
```

### Parametreler ve Return

```bash
add() {
    local num1=$1
    local num2=$2
    local result=$((num1 + num2))
    echo $result  # Return yerine echo kullan
}

# Kullanım
RESULT=$(add 5 3)
echo "Sonuç: $RESULT"  # 8
```

### Hata Kontrolü ile Fonksiyon

```bash
check_file() {
    local file=$1

    if [ ! -f "$file" ]; then
        echo "HATA: $file bulunamadı" >&2
        return 1
    fi

    echo "Dosya mevcut: $file"
    return 0
}

# Kullanım
if check_file "/etc/passwd"; then
    echo "Devam ediliyor..."
else
    echo "Hata oluştu"
    exit 1
fi
```

---

## 📁 Dosya İşlemleri {#dosya-islemleri}

### Dosya Okuma

```bash
# Tüm dosyayı oku
CONTENT=$(cat /etc/hostname)

# Satır satır oku
while IFS= read -r line; do
    echo "Satır: $line"
done < /etc/passwd

# CSV okuma
while IFS=',' read -r col1 col2 col3; do
    echo "Sütun 1: $col1, Sütun 2: $col2"
done < data.csv
```

### Dosya Yazma

```bash
# Üzerine yaz
echo "Yeni içerik" > file.txt

# Sona ekle
echo "Ek satır" >> file.txt

# Çok satırlı yazma (heredoc)
cat > config.txt << EOF
server {
    listen 80;
    server_name example.com;
}
EOF
```

### Dosya Manipülasyonu

```bash
# Kopyala
cp source.txt destination.txt

# Taşı/Yeniden adlandır
mv old.txt new.txt

# Sil
rm file.txt

# Dizin oluştur
mkdir -p /path/to/nested/dir

# Dizin sil
rm -rf /path/to/dir

# İzinleri değiştir
chmod 755 script.sh
chmod +x script.sh

# Sahipliği değiştir
chown user:group file.txt
```

---

## 📊 Log Analizi {#log-analizi}

### Nginx Access Log Analizi

```bash
#!/bin/bash
LOG_FILE="/var/log/nginx/access.log"

echo "=== NGINX LOG ANALİZİ ==="
echo ""

# En çok istek yapan 10 IP
echo "En Çok İstek Yapan IP'ler:"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

# En çok ziyaret edilen URL'ler
echo ""
echo "En Çok Ziyaret Edilen URL'ler:"
awk '{print $7}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

# HTTP status kodları dağılımı
echo ""
echo "HTTP Status Kodları:"
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn

# 404 hatası veren URL'ler
echo ""
echo "404 Hatası Veren URL'ler:"
awk '$9 == 404 {print $7}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

# 5xx hatalar (sunucu hataları)
echo ""
echo "5xx Sunucu Hataları:"
awk '$9 ~ /^5/ {print $0}' "$LOG_FILE" | tail -20

# Belirli zaman aralığındaki istekler
echo ""
echo "Son 1 Saatteki İstekler:"
awk -v date="$(date -d '1 hour ago' '+%d/%b/%Y:%H')" '$4 ~ date' "$LOG_FILE" | wc -l
```

### Syslog Analizi

```bash
#!/bin/bash
SYSLOG="/var/log/syslog"

# SSH login denemeleri
echo "Başarısız SSH Girişleri:"
grep "Failed password" "$SYSLOG" | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn

# Sudo kullanımı
echo ""
echo "Sudo Komutları:"
grep "sudo:" "$SYSLOG" | grep "COMMAND" | awk -F'COMMAND=' '{print $2}' | sort | uniq -c

# Kernel hataları
echo ""
echo "Kernel Hataları:"
grep -i "error" "$SYSLOG" | grep "kernel" | tail -20

# Disk doluluk uyarıları
echo ""
echo "Disk Uyarıları:"
grep -i "no space left" "$SYSLOG"
```

### Application Log Analizi

```bash
#!/bin/bash
APP_LOG="/var/log/myapp/app.log"

# Hata sayısı (son 24 saat)
echo "Son 24 Saatteki Hatalar:"
grep -i "error" "$APP_LOG" | \
    awk -v date="$(date -d '24 hours ago' '+%Y-%m-%d')" '$0 ~ date' | \
    wc -l

# En sık görülen hata mesajları
echo ""
echo "En Sık Hatalar:"
grep -i "error" "$APP_LOG" | \
    sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}.*ERROR/ERROR/' | \
    sort | uniq -c | sort -rn | head -10

# Response time analizi (JSON log için)
echo ""
echo "Ortalama Response Time:"
grep "response_time" "$APP_LOG" | \
    jq -r '.response_time' | \
    awk '{sum+=$1; count++} END {print sum/count " ms"}'

# Belirli kullanıcının aktiviteleri
echo ""
echo "user123 Aktiviteleri:"
grep "user_id.*user123" "$APP_LOG" | tail -20
```

### Real-time Log İzleme

```bash
#!/bin/bash

# Canlı log takibi + filtreleme
tail -f /var/log/nginx/access.log | grep --line-buffered "POST"

# Renkli çıktı ile
tail -f /var/log/app.log | \
    grep --line-buffered -E "ERROR|WARNING|INFO" | \
    sed 's/ERROR/\x1b[31m&\x1b[0m/g; s/WARNING/\x1b[33m&\x1b[0m/g; s/INFO/\x1b[32m&\x1b[0m/g'

# Çoklu log dosyası
tail -f /var/log/nginx/*.log

# Pattern matching ile alarm
tail -f /var/log/app.log | while read line; do
    if echo "$line" | grep -q "CRITICAL"; then
        echo "🚨 ALARM: $line"
        # Slack/Email gönder
    fi
done
```

---

## ⚠️ Hata Yönetimi {#hata-yonetimi}

### Exit Kodları

```bash
# Başarılı
exit 0

# Hata
exit 1

# Son komutun exit kodu
echo $?

# Özel hata kodları
exit 2  # Kullanım hatası
exit 126  # Komut çalıştırılamadı
exit 127  # Komut bulunamadı
```

### Trap ile Cleanup

```bash
#!/bin/bash
set -euo pipefail

# Geçici dosya
TEMP_FILE=$(mktemp)

# Script bitince veya hata olunca temizle
cleanup() {
    echo "Temizlik yapılıyor..."
    rm -f "$TEMP_FILE"
}

trap cleanup EXIT ERR

# Script devam eder...
echo "İşlem yapılıyor..."
```

### Hata Loglama

```bash
#!/bin/bash
LOG_FILE="/var/log/myscript.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# Kullanım
log "Script başladı"

if [ ! -f "/etc/config" ]; then
    error "Config dosyası bulunamadı"
fi

log "İşlem tamamlandı"
```

---

## 🏆 Production Script Şablonu {#production-sablon}

```bash
#!/bin/bash
#
# Script Adı: backup-database.sh
# Açıklama: PostgreSQL veritabanı yedeği alır
# Yazar: DevOps Team
# Versiyon: 1.0.0
# Kullanım: ./backup-database.sh [database_name]
#

set -euo pipefail  # Strict mode

# ============================================
# YAPILANDIRMA
# ============================================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"
readonly BACKUP_DIR="/opt/backups/postgres"
readonly RETENTION_DAYS=7

# Renk kodları
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# ============================================
# FONKSİYONLAR
# ============================================

# Log fonksiyonu
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() {
    log "INFO" "$@"
}

warn() {
    log "WARN" "$@"
}

error() {
    log "ERROR" "$@" >&2
}

# Başarılı mesaj
success() {
    echo -e "${GREEN}✓${NC} $@"
    info "$@"
}

# Hata mesajı ve çıkış
die() {
    echo -e "${RED}✗${NC} $@" >&2
    error "$@"
    exit 1
}

# Gerekli komutları kontrol et
check_requirements() {
    local missing=()

    for cmd in pg_dump gzip; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        die "Eksik komutlar: ${missing[*]}"
    fi
}

# Cleanup fonksiyonu
cleanup() {
    if [ -n "${TEMP_FILE:-}" ] && [ -f "$TEMP_FILE" ]; then
        rm -f "$TEMP_FILE"
    fi
}

# Trap ayarla
trap cleanup EXIT ERR INT TERM

# Kullanım bilgisi
usage() {
    cat << EOF
Kullanım: $SCRIPT_NAME [OPTIONS] DATABASE_NAME

PostgreSQL veritabanı yedeği alır.

OPTIONS:
    -h, --help          Bu yardım mesajını göster
    -d, --dir DIR       Yedek dizini (varsayılan: $BACKUP_DIR)
    -r, --retention N   Yedek saklama süresi (gün) (varsayılan: $RETENTION_DAYS)

ÖRNEK:
    $SCRIPT_NAME myapp_db
    $SCRIPT_NAME --dir /mnt/backups --retention 14 myapp_db

EOF
    exit 0
}

# ============================================
# ANA FONKSİYON
# ============================================

main() {
    local db_name=""
    local backup_dir="$BACKUP_DIR"
    local retention="$RETENTION_DAYS"

    # Argüman parse
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -d|--dir)
                backup_dir="$2"
                shift 2
                ;;
            -r|--retention)
                retention="$2"
                shift 2
                ;;
            -*)
                die "Bilinmeyen opsiyon: $1"
                ;;
            *)
                db_name="$1"
                shift
                ;;
        esac
    done

    # Validasyon
    [ -z "$db_name" ] && die "Veritabanı adı belirtilmedi. Kullanım için: $SCRIPT_NAME --help"

    info "Script başlatıldı: $SCRIPT_NAME"
    info "Veritabanı: $db_name"

    # Gereksinimler
    check_requirements

    # Backup dizini oluştur
    mkdir -p "$backup_dir" || die "Backup dizini oluşturulamadı: $backup_dir"

    # Backup dosya adı
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${backup_dir}/${db_name}_${timestamp}.sql.gz"

    # Backup al
    info "Yedek alınıyor: $backup_file"

    if pg_dump "$db_name" | gzip > "$backup_file"; then
        success "Yedek başarıyla alındı: $backup_file"

        # Dosya boyutu
        local size=$(du -h "$backup_file" | cut -f1)
        info "Dosya boyutu: $size"
    else
        die "Yedek alınamadı"
    fi

    # Eski yedekleri temizle
    info "Eski yedekler temizleniyor (${retention} günden eski)..."
    find "$backup_dir" -name "${db_name}_*.sql.gz" -mtime +${retention} -delete

    success "Script tamamlandı"
}

# ============================================
# SCRIPT BAŞLANGICI
# ============================================

main "$@"
```

---

## 📚 Yararlı Komutlar

### awk Örnekleri

```bash
# Belirli sütunu yazdır
awk '{print $1}' file.txt

# Koşullu yazdırma
awk '$3 > 100 {print $1, $3}' file.txt

# Toplam hesapla
awk '{sum += $2} END {print sum}' file.txt

# CSV parse
awk -F',' '{print $1, $3}' data.csv
```

### sed Örnekleri

```bash
# Değiştir
sed 's/old/new/' file.txt
sed 's/old/new/g' file.txt  # Tüm eşleşmeler

# Satır sil
sed '/pattern/d' file.txt

# Satır ekle
sed '3i\New line' file.txt  # 3. satırdan önce

# In-place düzenleme
sed -i 's/old/new/g' file.txt
```

### grep Örnekleri

```bash
# Basit arama
grep "pattern" file.txt

# Case-insensitive
grep -i "pattern" file.txt

# Satır numarası ile
grep -n "pattern" file.txt

# Recursive
grep -r "pattern" /path/

# Ters arama (eşleşmeyenleri göster)
grep -v "pattern" file.txt

# Regex
grep -E "pattern1|pattern2" file.txt
```

---

## 🔗 Referanslar

- [Bash Manual](https://www.gnu.org/software/bash/manual/)
- [ShellCheck](https://www.shellcheck.net/) - Script validator
- [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)
