# Security Audit Script

Güncelleme notu: bu sürüm, daha sıkı shell options, daha net drift sinyali, UFW/SSHD/Fail2Ban kontrolleri ve socket permission denetimi ile güçlendirildi.

Bu script, host üzerinde hızlı bir güvenlik kontrolü yapar. Amaç kapsamlı pentest değil, baseline drift'i erken yakalamaktır.

## Ne Kontrol Eder

- Dinleyen portlar
- UFW durumu
- SSH hardening ayarları
- Fail2Ban durumu
- Docker socket erişimi
- Disk kullanımı

## Kullanım Notları

- Root veya uygun `sudo` yetkisiyle çalıştır
- Script çıktısını değişiklik takibi için sakla
- Staging ve production sonuçlarını karşılaştır
- Bulunan sorunları ayrı bir runbook'a bağla

Örnek kurulum:

```bash
install -m 0755 audit.sh /usr/local/bin/audit.sh
bash -n /usr/local/bin/audit.sh
shellcheck /usr/local/bin/audit.sh
```

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
PATH='/usr/sbin:/usr/bin:/sbin:/bin'

readonly SCRIPT_NAME="${0##*/}"
readonly DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
readonly INODE_WARN_PERCENT="${INODE_WARN_PERCENT:-85}"
status=0

log() {
  printf '[%s] %s\n' "$SCRIPT_NAME" "$*"
}

warn() {
  printf '[%s] WARN: %s\n' "$SCRIPT_NAME" "$*" >&2
  status=1
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

check_ufw() {
  if ! have ufw; then
    warn "ufw not installed"
    return
  fi

  log "ufw status"
  if ufw status | awk 'NR==1 { exit ($0 ~ /^Status: active$/ ? 0 : 1) }'; then
    :
  else
    warn "ufw is not active"
    return
  fi

  ufw status numbered
}

check_listening_ports() {
  log "listening ports"
  ss -H -tulpn
}

check_sshd() {
  if ! have sshd; then
    warn "sshd not installed"
    return
  fi

  log "sshd runtime config"
  local permit_root password_auth pubkey_auth empty_passwords
  permit_root="$(sshd -T | awk '$1=="permitrootlogin" { print $2; exit }')"
  password_auth="$(sshd -T | awk '$1=="passwordauthentication" { print $2; exit }')"
  pubkey_auth="$(sshd -T | awk '$1=="pubkeyauthentication" { print $2; exit }')"
  empty_passwords="$(sshd -T | awk '$1=="permitemptypasswords" { print $2; exit }')"

  [[ "$permit_root" == "no" ]] || warn "sshd PermitRootLogin is ${permit_root:-unknown}"
  [[ "$password_auth" == "no" ]] || warn "sshd PasswordAuthentication is ${password_auth:-unknown}"
  [[ "$pubkey_auth" == "yes" ]] || warn "sshd PubkeyAuthentication is ${pubkey_auth:-unknown}"
  [[ "$empty_passwords" == "no" ]] || warn "sshd PermitEmptyPasswords is ${empty_passwords:-unknown}"

  printf '[%s] sshd permitrootlogin=%s passwordauthentication=%s pubkeyauthentication=%s permitemptypasswords=%s\n' \
    "$SCRIPT_NAME" "${permit_root:-unknown}" "${password_auth:-unknown}" "${pubkey_auth:-unknown}" "${empty_passwords:-unknown}"
}

check_fail2ban() {
  if ! have systemctl; then
    warn "systemctl unavailable; cannot check fail2ban"
    return
  fi

  if ! systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '$1 == "fail2ban.service" { found = 1 } END { exit found ? 0 : 1 }'; then
    warn "fail2ban.service not installed"
    return
  fi

  if systemctl is-active --quiet fail2ban; then
    log "fail2ban active"
  else
    warn "fail2ban inactive"
  fi
}

check_docker_socket() {
  if [[ ! -S /var/run/docker.sock ]]; then
    log "docker socket not found"
    return
  fi

  local perms owner group
  perms="$(stat -c '%a' /var/run/docker.sock)"
  owner="$(stat -c '%U' /var/run/docker.sock)"
  group="$(stat -c '%G' /var/run/docker.sock)"

  log "docker socket perms=${perms} owner=${owner} group=${group}"
  [[ "$owner" == "root" ]] || warn "docker socket owner is ${owner}"
  [[ "$group" == "docker" || "$group" == "root" ]] || warn "docker socket group is ${group}"
  [[ "$perms" == "660" || "$perms" == "600" ]] || warn "docker socket permissions are ${perms}"
}

check_disk() {
  local used inodes
  used="$(df -P / | awk 'NR==2 { gsub("%", "", $5); print $5 }')"
  inodes="$(df -Pi / | awk 'NR==2 { gsub("%", "", $5); print $5 }')"

  [[ -n "$used" ]] || die "could not read disk usage"
  [[ -n "$inodes" ]] || die "could not read inode usage"

  if (( used >= DISK_WARN_PERCENT )); then
    warn "disk usage on / is ${used}%"
  else
    log "disk usage on / is ${used}%"
  fi

  if (( inodes >= INODE_WARN_PERCENT )); then
    warn "inode usage on / is ${inodes}%"
  else
    log "inode usage on / is ${inodes}%"
  fi
}

main() {
  require_root

  log "security audit starting"
  check_ufw
  check_listening_ports
  check_sshd
  check_fail2ban
  check_docker_socket
  check_disk
  log "security audit complete"

  return "$status"
}

main "$@"
```

## Okuma Prensibi

Bu script'in çıktısı bir "checklist" değil, bir drift sinyalidir. Aşağıdakiler varsa aksiyon al:

- root login açıksa
- password authentication aktifse
- beklenmeyen public port dinliyorsa
- docker socket fazla geniş yetkideyse
- disk kullanımı beklenen eşik üstündeyse

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Syntax doğru mu | `bash -n audit.sh` | Parse hatası olmamalı |
| Lint temiz mi | `shellcheck audit.sh` | Kritik hata olmamalı |
| SSH hardening görünür mü | `sshd -T | rg 'permitrootlogin|passwordauthentication'` | Beklenen değerler dönmeli |
| Dinleyen portlar okunuyor mu | `ss -H -tulpn` | Aktif portlar listelenmeli |
| UFW aktif mi | `ufw status verbose` | Beklenen firewall durumu görünmeli |
| Fail2Ban çalışıyor mu | `systemctl is-active fail2ban` | `active` ya da bilinçli yokluk görünmeli |
