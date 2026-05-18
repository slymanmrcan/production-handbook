# Health Check Script 🩺

> **GÜNCELLEME (v2):** Daha sıkı shell options, disk/inode/swap kontrolleri, daha net servis ve port doğrulamaları eklendi.

Bu script, host seviyesinde hızlı sağlık kontrolü yapar ve kritik eşikler aşıldığında warning döner.

## Kontrol Edilenler

- **Load Average:** CPU çekirdek sayısına göre kıyaslanır.
- **RAM Kullanımı:** Varsayılan eşik `%90`.
- **Disk Kullanımı:** Varsayılan eşik `%85`.
- **Servisler:** SSH, Docker ve Nginx aktif mi?
- **Portlar:** 80 ve 443 dinleniyor mu?

## Kullanım

```bash
nano /usr/local/bin/health-check.sh
chmod +x /usr/local/bin/health-check.sh
/usr/local/bin/health-check.sh
```

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
PATH='/usr/sbin:/usr/bin:/sbin:/bin'

DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
MEM_WARN_PERCENT="${MEM_WARN_PERCENT:-90}"
LOAD_WARN_FACTOR="${LOAD_WARN_FACTOR:-1.50}"
INODE_WARN_PERCENT="${INODE_WARN_PERCENT:-85}"
EXIT_CODE=0

ok() {
  printf '[OK]   %s\n' "$1"
}

warn() {
  printf '[WARN] %s\n' "$1"
  EXIT_CODE=1
}

skip() {
  printf '[SKIP] %s\n' "$1"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

check_load() {
  local cores load limit
  cores=$(nproc 2>/dev/null || echo 1)
  load=$(awk '{print $1}' /proc/loadavg)
  limit=$(awk -v c="$cores" -v f="$LOAD_WARN_FACTOR" 'BEGIN { printf "%.2f", c * f }')

  if awk -v load="$load" -v limit="$limit" 'BEGIN { exit !(load > limit) }'; then
    warn "Load average high: $load (limit: $limit)"
  else
    ok "Load average: $load (limit: $limit)"
  fi
}

check_memory() {
  local used
  used=$(free | awk '/Mem:/ { if ($2 > 0) printf "%.0f", ($3 / $2) * 100 }')

  if [ "$used" -ge "$MEM_WARN_PERCENT" ]; then
    warn "Memory usage: ${used}%"
  else
    ok "Memory usage: ${used}%"
  fi
}

check_disk() {
  local used
  used=$(df -P / | awk 'NR==2 { gsub("%", "", $5); print $5 }')

  if [ "$used" -ge "$DISK_WARN_PERCENT" ]; then
    warn "Disk usage on /: ${used}%"
  else
    ok "Disk usage on /: ${used}%"
  fi
}

check_inodes() {
  local used
  used=$(df -Pi / | awk 'NR==2 { gsub("%", "", $5); print $5 }')

  if [ "$used" -ge "$INODE_WARN_PERCENT" ]; then
    warn "Inode usage on /: ${used}%"
  else
    ok "Inode usage on /: ${used}%"
  fi
}

check_swap() {
  local total used
  total=$(free | awk '/Swap:/ { print $2 }')
  used=$(free | awk '/Swap:/ { print $3 }')

  if [ "${total:-0}" -eq 0 ]; then
    skip "Swap: not configured"
    return
  fi

  if [ "${used:-0}" -gt 0 ]; then
    warn "Swap in use: ${used} KiB of ${total} KiB"
  else
    ok "Swap usage: 0 KiB of ${total} KiB"
  fi
}

check_unit() {
  local label="$1"
  shift
  local unit

  if ! have systemctl; then
    skip "Service ${label}: systemctl unavailable"
    return
  fi

  for unit in "$@"; do
    if systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk -v svc="$unit" '$1 == svc { found = 1 } END { exit found ? 0 : 1 }'; then
      if systemctl is-active --quiet "$unit"; then
        ok "Service ${label}: active (${unit})"
      else
        warn "Service ${label}: inactive (${unit})"
      fi
      return
    fi
  done

  skip "Service ${label}: not installed"
}

check_port() {
  local port="$1"

  if ss -H -ltn | awk -v port=":$port" '$4 ~ sprintf("%s$", port) { found = 1 } END { exit found ? 0 : 1 }'; then
    ok "Port ${port}: listening"
  else
    warn "Port ${port}: not listening"
  fi
}

echo "🔎 Health check started: $(date '+%F %T')"
check_load
check_memory
check_disk
check_inodes
check_swap
check_unit "SSH" ssh.service sshd.service
check_unit "Docker" docker.service
check_unit "Nginx" nginx.service
check_port 80
check_port 443

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ Health check passed."
else
  echo "⚠️ Health check completed with warnings."
fi

exit "$EXIT_CODE"
```

## Doğrulama

```bash
/usr/local/bin/health-check.sh
echo $?
free -h
df -Pi /
systemctl status docker nginx ssh --no-pager
```
