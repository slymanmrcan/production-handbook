# Maintenance (Temizlik) Scripti

Güncelleme notu: bu sürüm, daha güvenli pruning sınırları, dry-run desteği, daha okunur loglar ve disk/inode kontrolü ile sıkılaştırıldı.

Bu script, disk doluluğu ve biriken system artifact'ları için planlı bakım işi olarak kullanılmalıdır.

## Ne Yapar

1. Kullanılmayan Docker kaynaklarını temizler.
2. systemd journal retention politikasını uygular.
3. Debian/Ubuntu paket önbelleğini temizler.
4. Disk doluluğunu kontrol eder ve eşik üstünde uyarır.

## Kullanım Notları

- Production'da systemd timer ile çalıştır
- Büyük Docker pruning işlemini iş saatleri dışında yap
- Önce staging host'ta `DRY_RUN=1` ile test et
- Yıkıcı bakım komutlarını manuel shell oturumuna koyma

Örnek kurulum:

```bash
install -m 0755 maintenance.sh /usr/local/bin/maintenance.sh
bash -n /usr/local/bin/maintenance.sh
shellcheck /usr/local/bin/maintenance.sh
```

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
PATH='/usr/sbin:/usr/bin:/sbin:/bin'

readonly DISK_WARN_PERCENT=85
readonly JOURNAL_RETENTION="3d"
readonly SCRIPT_NAME="${0##*/}"
readonly ALLOW_VOLUME_PRUNE="${ALLOW_VOLUME_PRUNE:-0}"

log() {
  printf '[%s] %s\n' "$SCRIPT_NAME" "$*"
}

die() {
  printf '[%s] ERROR: %s\n' "$SCRIPT_NAME" "$*" >&2
  exit 1
}

require_root() {
  [[ ${EUID:-$(id -u)} -eq 0 ]] || die "root required"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

run() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    log "[dry-run] $*"
    return 0
  fi
  "$@"
}

check_disk() {
  local usage inodes
  usage="$(df -P / | awk 'NR==2 { gsub("%", "", $5); print $5 }')"
  inodes="$(df -Pi / | awk 'NR==2 { gsub("%", "", $5); print $5 }')"

  [[ -n "$usage" ]] || die "could not read disk usage"
  [[ -n "$inodes" ]] || die "could not read inode usage"

  if (( usage > DISK_WARN_PERCENT )); then
    log "warning: disk usage is ${usage}%"
  else
    log "disk usage is ${usage}%"
  fi

  if (( inodes > DISK_WARN_PERCENT )); then
    log "warning: inode usage is ${inodes}%"
  else
    log "inode usage is ${inodes}%"
  fi
}

main() {
  require_root

  log "maintenance started"

  if have docker; then
    log "docker prune"
    run docker system prune -af
    if [[ "$ALLOW_VOLUME_PRUNE" == "1" ]]; then
      log "docker volume prune"
      run docker volume prune -f
    else
      log "docker volume prune skipped; set ALLOW_VOLUME_PRUNE=1 to enable"
    fi
  else
    log "docker not installed; skipping docker prune"
  fi

  if have journalctl; then
    log "journal vacuum: ${JOURNAL_RETENTION}"
    run journalctl --vacuum-time="$JOURNAL_RETENTION"
  else
    log "journalctl not installed; skipping journal cleanup"
  fi

  if have apt-get; then
    log "apt cleanup"
    run apt-get autoremove -y
    run apt-get clean
  else
    log "apt-get not installed; skipping apt cleanup"
  fi

  check_disk

  log "maintenance finished"
}

main "$@"
```

## Safety Notları

- `docker system prune -af` geri dönüşsüz olabilir; yalnızca bilinçli bakım penceresinde çalıştır
- `docker volume prune` varsayılan kapalıdır; gerekiyorsa `ALLOW_VOLUME_PRUNE=1` ile aç
- `journalctl --vacuum-time` retention politikanla uyumlu olmalı
- `apt-get autoremove` paket bağımlılıklarını etkileyebilir; önce staging'de doğrula
- `DRY_RUN=1` ile komutları gör, gerçek temizlikten önce davranışı kontrol et

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Syntax doğru mu | `bash -n maintenance.sh` | Parse hatası olmamalı |
| Lint temiz mi | `shellcheck maintenance.sh` | Kritik hata olmamalı |
| Dry-run çalışıyor mu | `DRY_RUN=1 ./maintenance.sh` | Komutlar loglanmalı, silme yapılmamalı |
| Disk yüzdesi okunuyor mu | `df -P /` | Uygun kullanım yüzdesi dönmeli |
| Inode yüzdesi okunuyor mu | `df -Pi /` | Inode kullanım yüzdesi dönmeli |
| Timer ile çalışıyor mu | `systemctl list-timers --all` | Bakım job'u görünmeli |
